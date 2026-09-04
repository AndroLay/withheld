/**
 * The agent's view, swept in a real browser.
 *
 * `docs/DECISIONS.md` D-33 claims the page redacts by omission: in **Agent's view** each component is
 * handed the projection a tool returns, so there is no total, point value, pass mark or band anywhere
 * for an inspector to find. `tests/render.test.mts` asserts that over four static renders. This script
 * asserts the part a render cannot: what a live DOM holds, what `innerText` reads back, and which
 * elements report a box. A stylesheet that hides a figure with `color: transparent` passes any test
 * written against markup and fails every line below — which is exactly how the mockup at
 * `docs/design/proposal-v3.html` was measured and rejected.
 *
 * It figures out what to look for rather than being told: the four rubric point values, the pass mark,
 * the maximum, and every total the worked example produces, read out of `src/data/fixtures.ts`. Values
 * at or below the class size are dropped, because a `14` cannot be told apart from the answer count the
 * agent is entitled to.
 *
 * What it does not do: it is not an agent, and a green run says nothing about a model choosing a tool.
 * It drives the two view buttons the way a person would and reads what is left.
 *
 * Usage: `node --run build && node --run agent-view`
 * Flags: `--url` for a server already up, `--browser` for a binary, `--preview-port` to pin the port,
 * `--port` for the debugging port, `--keep` to leave the browser running.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_FINDINGS, SPOON_ANSWERS, SPOON_RUBRIC } from "../src/data/fixtures.ts";
import { evidenceMeta } from "./evidence-meta.mjs";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));

function flag(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const next = process.argv[at + 1];
  return next && !next.startsWith("--") ? next : true;
}

const PORT = Number(flag("port", 9451));
const KEEP = flag("keep", false) === true;
const GIVEN_URL = typeof flag("url") === "string" ? flag("url") : null;
const GIVEN_PREVIEW_PORT = flag("preview-port") !== null;
const PREVIEW_PORT = Number(flag("preview-port", 4193));

/** Every check that can fail. A failed check is a line here and a non-zero exit. */
const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? "ok  " : "FAIL"} ${name}${detail === undefined ? "" : ` — ${detail}`}`);
}

const cleanups = [];
function onExit(action) {
  cleanups.push(action);
}
function runCleanups() {
  while (cleanups.length > 0) {
    try {
      cleanups.pop()();
    } catch {
      // A cleanup that fails must not mask the result of the run.
    }
  }
}

async function waitFor(what, attempt, { tries = 60, gap = 250 } = {}) {
  for (let index = 0; index < tries; index += 1) {
    try {
      const value = await attempt();
      if (value) return value;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, gap));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** The first port from here up that nothing answers on. Leftover previews accumulate in this workspace. */
async function freePort(from, tries = 24) {
  for (let port = from; port < from + tries; port += 1) {
    const answering = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) })
      .then(() => true)
      .catch((error) => error.name === "TimeoutError");
    if (!answering) return port;
  }
  throw new Error(`nothing free between ${from} and ${from + tries} — pass --preview-port`);
}

/**
 * The production build, served the way a static host would. The title is checked before anything is
 * measured: a neighbouring submission holding the port would otherwise be reported as this page.
 */
async function startPreview() {
  if (GIVEN_URL) return GIVEN_URL;

  if (!existsSync(join(PACKAGE, "dist", "index.html"))) {
    throw new Error("dist/index.html is missing — run `node --run build` first");
  }

  const port = GIVEN_PREVIEW_PORT ? PREVIEW_PORT : await freePort(PREVIEW_PORT);
  const server = spawn(join(PACKAGE, "node_modules", ".bin", "vite"), ["preview", "--port", String(port), "--strictPort"], {
    cwd: PACKAGE,
    stdio: "ignore",
  });
  onExit(() => server.kill("SIGTERM"));
  server.on("error", (error) => {
    throw error;
  });

  const url = `http://127.0.0.1:${port}/`;
  await waitFor("the preview server", async () => (await fetch(url)).ok);
  const served = await fetch(url).then((answer) => answer.text());
  if (!served.includes("<title>Withheld")) {
    throw new Error(`something else is serving port ${port} — pass --preview-port, or --url`);
  }
  return url;
}

/** The first Chromium-family browser on PATH. */
function findBrowser() {
  const named = flag("browser");
  if (typeof named === "string") return named;

  const candidates = ["chromium", "chrome", "google-chrome-stable", "google-chrome", "brave"];
  for (const candidate of candidates) {
    for (const directory of (process.env.PATH ?? "").split(":").filter(Boolean)) {
      const path = join(directory, candidate);
      if (existsSync(path)) return path;
    }
  }
  throw new Error("no Chromium-family browser found on PATH — pass --browser");
}

/**
 * Refuse to start when something already answers on the debugging port.
 *
 * A second Chromium cannot take a port that is held: ours exits, the port keeps answering, and the
 * attach below lands in a browser nobody here launched — with its own profile and its own extensions.
 * That happened on 2026-09-04 to the dispatch probe next door: a neighbouring submission's bridge
 * browser held its port, and the run reported that browser's injected page-script as a request this
 * page had made. Same discipline as the preview port above, for the same reason.
 */
async function refuseBusyPort(port) {
  const answering = await fetch(`http://127.0.0.1:${port}/json/version`, {
    signal: AbortSignal.timeout(500),
  })
    .then(() => true)
    .catch((error) => error.name === "TimeoutError");
  if (!answering) return;

  throw new Error(
    `something already answers on ${port}, and it is not the browser this run would launch — pass --port`,
  );
}

function launchBrowser(binary) {
  const profile = mkdtempSync(join(tmpdir(), "withheld-agent-view-"));
  const browser = spawn(
    binary,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  onExit(() => {
    if (!KEEP) browser.kill("SIGTERM");
    if (!KEEP) rmSync(profile, { recursive: true, force: true });
  });
  browser.on("error", (error) => {
    throw error;
  });
  return browser;
}

/** The protocol client. Node's global `WebSocket` means no dependency, and no lockfile that is not mine. */
async function connect() {
  const page = await waitFor("a CDP page target", async () => {
    const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((answer) => answer.json());
    return targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  });

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  onExit(() => socket.close());

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id === undefined) return;
    const settle = pending.get(message.id);
    pending.delete(message.id);
    settle?.(message);
  });

  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = (sequence += 1);
      pending.set(id, (message) => {
        if (message.error) reject(new Error(`${method}: ${message.error.message}`));
        else resolve(message.result ?? {});
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await command("Runtime.evaluate", {
      expression: `(async () => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails.text)}`);
    }
    return result.result?.value;
  }

  return { command, evaluate };
}

/**
 * What the page owns, derived rather than typed: point values, the pass mark, the maximum, and every
 * total the worked example lands. Anything at or below the class size is dropped — a `4` is the band and
 * also the rubric-line count, a `14` is the class, and neither can be attributed from a page's text.
 */
const pointsOf = (id) => SPOON_RUBRIC.lines.find((line) => line.id === id)?.points ?? 0;
const FIGURES = Array.from(
  new Set([
    ...SPOON_RUBRIC.lines.map((line) => line.points),
    SPOON_RUBRIC.passBoundary,
    SPOON_RUBRIC.lines.reduce((sum, line) => sum + line.points, 0),
    ...DEMO_FINDINGS.map((finding) => finding.foundLineIds.reduce((sum, id) => sum + pointsOf(id), 0)),
  ]),
)
  .filter((value) => value > SPOON_ANSWERS.length)
  .sort((left, right) => left - right);

/**
 * The page read the way a judge with an inspector would read it: `innerText` for what is legible, the
 * live DOM for what is present, and `getClientRects()` for what is drawn. The students' own words are
 * subtracted first, because `read_answer` hands the body over verbatim and a digit inside an answer is
 * the student's, not the page's. `<svg>` is dropped for the same reason: path geometry is arithmetic
 * about a shape, not about a mark.
 */
const SWEEP = (figures) => `return (() => {
  const FIG = ${JSON.stringify(figures)};
  const hit = (text) => FIG.filter((value) => new RegExp("(?<![\\\\d-])" + value + "(?![\\\\d])").test(text));

  const untrusted = [...document.querySelectorAll(".line__peek, .hand__body")].map((node) => node.innerText || "");
  let prose = document.body.innerText || "";
  // Asset filenames are content hashes. A hash can equal a page-owned figure by coincidence
  // ('index-Cq88OHwj.css' did exactly that), so keep semantic attributes in the DOM sweep but
  // remove the browser's own script/stylesheet transport nodes before searching the markup.
  const markupRoot = document.documentElement.cloneNode(true);
  for (const asset of markupRoot.querySelectorAll("script[src], link[rel~='stylesheet'][href]")) {
    asset.remove();
  }
  let markup = markupRoot.outerHTML.replace(/<svg[\\s\\S]*?<\\/svg>/g, "");
  for (const chunk of untrusted) {
    if (!chunk) continue;
    prose = prose.split(chunk).join(" ");
    markup = markup.split(chunk).join(" ");
  }

  // An element whose own text is exactly one of those figures, drawn or not.
  const carriers = [...document.querySelectorAll("*")].filter((element) => {
    const own = [...element.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join("");
    return own !== "" && FIG.some((value) => own === String(value));
  });

  return {
    view: document.querySelector(".app")?.dataset.view ?? null,
    pressed: document.querySelectorAll(".lens__btn--on").length,
    inText: hit(prose),
    inMarkup: hit(markup),
    carriers: carriers.length,
    carriersDrawn: carriers.filter((element) => element.getClientRects().length > 0).length,
    redactions: document.querySelectorAll(".rd").length,
    secretCells: document.querySelectorAll(".cell--secret").length,
    entries: document.querySelectorAll(".entry__box").length,
    bars: document.querySelectorAll(".bars__fill").length,
    spill: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    words: (document.body.innerText || "").trim().split(/\\s+/).length,
  };
})();`;

const CLICK = (pattern) => `return (() => {
  const button = [...document.querySelectorAll("button")].find((one) => ${pattern}.test(one.textContent || ""));
  if (!button) throw new Error("no button matching ${pattern}");
  button.click();
  return button.textContent.trim();
})();`;

function report(label, sweep) {
  console.log(
    `     ${label.padEnd(16)} view=${sweep.view} pressed=${sweep.pressed} ` +
      `text=[${sweep.inText.join(",") || "none"}] dom=[${sweep.inMarkup.join(",") || "none"}] ` +
      `carriers=${sweep.carriers} (${sweep.carriersDrawn} drawn) rd=${sweep.redactions} ` +
      `secret=${sweep.secretCells} entries=${sweep.entries} bars=${sweep.bars} ` +
      `${sweep.words}w ${sweep.height}px spill=${sweep.spill}px`,
  );
}

async function main() {
  const url = await startPreview();
  await refuseBusyPort(PORT);
  launchBrowser(findBrowser());
  const cdp = await connect();
  const version = await cdp.command("Browser.getVersion");
  await cdp.command("Runtime.enable");
  await cdp.command("Page.enable");

  console.log(`figures the page owns: ${FIGURES.join(" ")}`);

  await cdp.command("Page.navigate", { url });
  await waitFor("the page to render", () => cdp.evaluate('return document.querySelectorAll(".lens__btn").length === 2;'));

  // Marked, because an empty session has almost no figures to leak. This is the worked example, not an
  // agent: the same fixture the page says under the rows is a fixture.
  await cdp.evaluate(CLICK("/worked example/i"));
  await waitFor("the stack to fill", () => cdp.evaluate('return document.querySelectorAll(".bars__fill").length > 0;'));

  const teacher = await sweep(cdp, "teacher, 1440");
  const agent = await sweep(cdp, "agent, 1440", "/agent's view/i");
  const back = await sweep(cdp, "teacher again", "/your view/i");

  await cdp.command("Emulation.setDeviceMetricsOverride", { width: 420, height: 900, deviceScaleFactor: 1, mobile: true });
  const narrowTeacher = await sweep(cdp, "teacher, 420");
  const narrowAgent = await sweep(cdp, "agent, 420", "/agent's view/i");

  // The control. A sweep that finds nothing everywhere proves nothing, so the teacher's view has to
  // leak — and it does, from 143 elements. One figure short in `innerText` is the expected shape rather
  // than a miss: a point value that appears only inside a row nobody has opened is in the document and
  // not in the text, because `innerText` does not reach into a closed `<details>`.
  const unread = FIGURES.filter((value) => !teacher.inText.includes(value));
  check(
    "the teacher's view holds every figure the page owns",
    teacher.inMarkup.length === FIGURES.length && teacher.carriers > 0,
    `${teacher.inMarkup.length}/${FIGURES.length} in the DOM, ${teacher.carriers} elements`,
  );
  check(
    "and reads nearly all of them back",
    teacher.inText.length >= FIGURES.length - 1,
    `${teacher.inText.length}/${FIGURES.length} legible${unread.length ? `, unopened: ${unread.join(",")}` : ""}`,
  );

  for (const [label, view] of [
    ["1440px", agent],
    ["420px", narrowAgent],
  ]) {
    check(`the agent's view reads back no figure at ${label}`, view.inText.length === 0, view.inText.join(",") || "none");
    check(`the agent's view holds no figure in the DOM at ${label}`, view.inMarkup.length === 0, view.inMarkup.join(",") || "none");
    check(`no element carries one at ${label}`, view.carriers === 0, `${view.carriers} elements, ${view.carriersDrawn} drawn`);
    check(`the agent's view draws its redactions at ${label}`, view.redactions > 0, `${view.redactions} boxes`);
    check(`no held answer is identified at ${label}`, view.secretCells === 0, `${view.secretCells} marked cells`);
    check(`the page fits its width at ${label}`, view.spill === 0, `${view.spill}px of overflow`);
  }

  check("the teacher's view fits its width at 420px", narrowTeacher.spill === 0, `${narrowTeacher.spill}px`);
  check(
    "the agent's view names fewer holds than the teacher's",
    agent.entries > 0 && agent.entries < teacher.entries,
    `${agent.entries} of ${teacher.entries}`,
  );
  check(
    "the toggle draws and does not destroy",
    back.carriers === teacher.carriers && back.inText.length === teacher.inText.length,
    `${back.carriers} carriers back, ${teacher.carriers} before`,
  );

  const failed = checks.filter((one) => !one.passed);
  writeEvidence({ url, version, views: { teacher, agent, back, narrowTeacher, narrowAgent }, failed });
  console.log(`\n${checks.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) process.exitCode = 1;
}

/** One row per view, so the claim can be re-read from the artefact rather than only from a terminal. */
function writeEvidence({ url, version, views, failed }) {
  const shape = (one) => ({
    view: one.view,
    pressed: one.pressed,
    figuresInText: one.inText,
    figuresInMarkup: one.inMarkup,
    carriers: one.carriers,
    carriersDrawn: one.carriersDrawn,
    redactions: one.redactions,
    secretCells: one.secretCells,
    heldEntries: one.entries,
    bars: one.bars,
    sidewaysOverflowPx: one.spill,
    heightPx: one.height,
    words: one.words,
  });
  const report = {
    status: failed.length === 0 ? "VERIFIED_RUN" : "FAILED_RUN",
    evidenceClass: "VERIFIED_ARTIFACT",
    scope:
      "local production build, both views swept in a live DOM; not hosted and not model-selected",
    ranAt: new Date().toISOString(),
    evidence: evidenceMeta(PACKAGE, {
      browserFlags: ["--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting"],
    }),
    browser: version.product,
    protocol: version.protocolVersion,
    url,
    passed: checks.length - failed.length,
    failed: failed.length,
    figuresThePageOwns: FIGURES,
    figureRule:
      "rubric point values, the pass boundary, the rubric total, and every total the worked example produces, keeping only values above the class size",
    views: {
      "teacher-1440": shape(views.teacher),
      "agent-1440": shape(views.agent),
      "teacher-1440-again": shape(views.back),
      "teacher-420": shape(views.narrowTeacher),
      "agent-420": shape(views.narrowAgent),
    },
    checks,
    notClaimed:
      "This is a DOM sweep of the built page in one local headless Chromium. It shows that no page-owned figure is present in the agent's view — not that a model read the page, not that a hosted deployment behaves the same, and not that a screen reader reaches the same conclusion.",
  };
  const directory = join(PACKAGE, "docs", "evidence");
  mkdirSync(directory, { recursive: true });
  const file = join(directory, "agent-view-sweep.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n→ ${file}`);
}

async function sweep(cdp, label, press) {
  if (press) await cdp.evaluate(CLICK(press));
  await new Promise((resolve) => setTimeout(resolve, 400));
  const result = await cdp.evaluate(SWEEP(FIGURES));
  report(label, result);
  return result;
}

try {
  await main();
} finally {
  runCleanups();
}
