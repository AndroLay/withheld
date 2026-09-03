/**
 * A browser session, driven over the DevTools Protocol by hand.
 *
 * Everything under "Built, not verified" in `docs/PROGRESS.md` is there for one reason: the page had
 * never been rendered by a browser. `tests/render.test.mts` renders every component to static markup,
 * which proves that no tree throws. It says nothing about the cascade, the three-column grid, the
 * sticky bar, the focus move, or whether the Content-Security-Policy in the built HTML is enforced
 * rather than merely present.
 *
 * This script answers exactly those questions and refuses to answer any others. It
 *
 *   1. serves `dist/` with `vite preview`, because the CSP meta tag exists only in the production
 *      build — a dev-server run would prove nothing about the artefact that gets hosted;
 *   2. launches an isolated Chromium with a throwaway profile, and deliberately *without*
 *      `--disable-web-security`, since a session that switched the policy off would demonstrate the
 *      opposite of what it claims;
 *   3. records every console message and every browser log entry, so that a CSP violation is a
 *      failure rather than a line nobody read;
 *   4. measures the proportional bars in the live layout, because a blocked inline width renders as a
 *      zero-width bar, and a zero-width bar reads as a student who scored nothing;
 *   5. clicks the worked example, stages a release, and reads `document.activeElement` — the one
 *      assertion in this package that static markup cannot make;
 *   6. walks the tab order and records where focus lands, in order;
 *   7. reports whether `document.modelContext` exists in this build, and names the tools the browser
 *      itself holds if it does.
 *
 * What it is not: an agent. Even where `modelContext` is present, this script reads the registry. It
 * does not let a model choose a tool and call it, so "no browser agent has ever driven these tools"
 * survives a green run here untouched.
 *
 * Usage, from `submissions/withheld`:
 *
 *   node --run build && node scripts/browser-session.mjs
 *
 * `--url` points at a server that is already running instead of starting one. `--browser` names a
 * binary. `--port` sets the debugging port. `--keep` leaves the browser running at the end.
 *
 * Exit status is the result: 0 only if every check below passed. The latest run is written to the
 * evidence JSON together with the source/build hashes and browser flags used for that run.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { evidenceMeta } from "./evidence-meta.mjs";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const EVIDENCE = join(PACKAGE, "docs", "evidence");

function flag(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const next = process.argv[at + 1];
  return next && !next.startsWith("--") ? next : true;
}

const PORT = Number(flag("port", 9411));
const KEEP = flag("keep", false) === true;
const GIVEN_URL = typeof flag("url") === "string" ? flag("url") : null;
const GIVEN_PREVIEW_PORT = flag("preview-port") !== null;
const PREVIEW_PORT = Number(flag("preview-port", 4173));

/** Every check that can fail. A failed check is a line here and a non-zero exit. */
const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
  const mark = passed ? "ok  " : "FAIL";
  console.log(`${mark} ${name}${detail === undefined ? "" : ` — ${detail}`}`);
}

const cleanups = [];
function onExit(action) {
  cleanups.push(action);
}
function runCleanups() {
  while (cleanups.length > 0) {
    const action = cleanups.pop();
    try {
      action();
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

/**
 * The first port from here up that nothing answers on.
 *
 * Only used when no port was asked for. This workspace holds more than one submission and leftover
 * preview servers accumulate across runs — eight of them were listening the day this was written — so a
 * fixed default is a coin toss. A port that was named on the command line is used as named, because
 * being told is different from guessing.
 */
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
 * The production build, served the way a static host would serve it. `vite preview` is the only
 * server in this package that hands over `dist/index.html`, and that file is the only place the CSP
 * meta tag exists.
 *
 * The served page is identified before anything is measured. If a neighbour already holds the port,
 * `--strictPort` makes our vite exit while the port keeps answering, and every check below would then
 * be run against someone else's page and reported as ours. That happened once, against the Flowline
 * submission's preview. The marker is the title in `index.html`.
 */
async function startPreview() {
  if (GIVEN_URL) return GIVEN_URL;

  if (!existsSync(join(PACKAGE, "dist", "index.html"))) {
    throw new Error("dist/index.html is missing — run `node --run build` first");
  }

  const port = GIVEN_PREVIEW_PORT ? PREVIEW_PORT : await freePort(PREVIEW_PORT);
  const vite = join(PACKAGE, "node_modules", ".bin", "vite");
  const server = spawn(vite, ["preview", "--port", String(port), "--strictPort"], {
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
    throw new Error(
      `something else is already serving port ${port} — pass --preview-port, or --url for a server you started`,
    );
  }
  return url;
}

/** The first browser on PATH that Chromium's own switches apply to. Brave counts; Firefox does not. */
function findBrowser() {
  const named = flag("browser");
  if (typeof named === "string") return named;

  const candidates = ["chromium", "chrome", "google-chrome-stable", "google-chrome", "brave"];
  const directories = (process.env.PATH ?? "").split(":").filter(Boolean);
  for (const candidate of candidates) {
    for (const directory of directories) {
      const path = join(directory, candidate);
      if (existsSync(path)) return path;
    }
  }
  throw new Error("no Chromium-family browser found on PATH — pass --browser");
}

/**
 * A throwaway profile, headless, and no switch that weakens the policy under test.
 *
 * `--enable-features=WebMCPTesting` and `--enable-experimental-web-platform-features` are the two
 * switches that expose `document.modelContext` on a Chromium that has it at all. Neither is required
 * for anything else here: the page is meant to work with no agent present, and that is the state every
 * other check in this file runs in.
 */
function launchBrowser(binary) {
  const profile = mkdtempSync(join(tmpdir(), "withheld-browser-"));
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
      "--enable-experimental-web-platform-features",
      "--enable-features=WebMCPTesting",
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

/**
 * The protocol client. Node has had a global `WebSocket` since 22, so this needs no dependency — which
 * matters more than it sounds: adding one would rewrite the workspace lockfile, and that file belongs
 * to work that is not mine.
 */
async function connect() {
  const page = await waitFor("a CDP page target", async () => {
    const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
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
  const events = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const settle = pending.get(message.id);
      pending.delete(message.id);
      settle?.(message);
      return;
    }
    events.push(message);
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

  return { command, evaluate, events };
}

/** Shared in-page helpers. Prepended to the probes that need them. */
const HELPERS = `
  const count = (selector) => document.querySelectorAll(selector).length;
  const names = (selector) =>
    [...document.querySelectorAll(selector)].map((node) => node.textContent.trim());
  const describe = (node) =>
    node === null
      ? null
      : {
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          className: typeof node.className === "string" ? node.className : null,
          text: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 48),
        };
`;

/** Everything measurable about the page as it currently stands. */
const SNAPSHOT = `
  ${HELPERS}
  const cols = document.querySelector(".app__cols");
  const bar = document.querySelector(".bar");
  // The audit's two rails, and they are the only proportional lengths left on the page. The queue used
  // to draw one per row; they now live beside the reasoning they belong to, so this list is short and a
  // zero-length entry in it is a rule that went missing rather than a student who scored nothing.
  const fills = [...document.querySelectorAll(".bars__fill")].map((node) => ({
    stop: Number((node.className.match(/bars__fill--(\\d+)/) ?? [])[1] ?? -1),
    width: Math.round(node.getBoundingClientRect().width),
  }));
  const send = document.querySelector(".btn--send");
  // The narrowest paragraph on the page. A prose block a few dozen pixels wide is the signature of a
  // crushed grid column — one word per line — and it is invisible to a static render, which has no
  // widths at all. The first run of this script found one in the left rail.
  //
  // Measured on visible text only. A vh span is a sentence written for a screen reader and nothing
  // else; counting it made the focused card's score — one em dash, 60px wide, with "nothing credited
  // yet" hidden beside it — look like a paragraph squeezed into a gutter. It is a figure, and a figure
  // is allowed to be narrow.
  const visible = (node) => {
    const copy = node.cloneNode(true);
    for (const hidden of copy.querySelectorAll(".vh")) hidden.remove();
    return (copy.textContent || "").replace(/\\s+/g, " ").trim();
  };
  const prose = [...document.querySelectorAll("p")]
    .map((node) => ({ node, text: visible(node) }))
    .filter(
      (found) =>
        found.text.length > 20 &&
        found.node.getClientRects().length > 0 &&
        (typeof found.node.checkVisibility !== "function" || found.node.checkVisibility()),
    )
    .map((found) => ({
      width: Math.round(found.node.getBoundingClientRect().width),
      text: found.text.slice(0, 40),
    }))
    .sort((first, second) => first.width - second.width);
  // The band under the bar. Its risk is layout and nothing else: it is the first thing on the page, its
  // four figures are the only place the sheet lays a row of counters out sideways, and a band that grows
  // tall pushes the work it introduces off the screen it is meant to explain.
  const band = document.querySelector(".band");
  const bandBox = band === null ? null : band.getBoundingClientRect();
  const counts = band === null ? [] : [...band.querySelectorAll(".count")];
  const countRows = new Set(counts.map((node) => Math.round(node.getBoundingClientRect().top)));
  // The heading outline, in document order. Chromium's accessibility tree does not hand its nodes
  // over in reading order — it returns the action bar's heading second and the left rail's four
  // sub-headings last — so a level-skip check run over that array would be measuring the wrong
  // sequence. The DOM is the only place the reading order is authoritative.
  const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((node) => ({
    level: Number(node.tagName.slice(1)),
    name: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 44),
  }));
  // Whatever is sticking out past the viewport, named. A total in pixels says the layout spills; it
  // does not say which element does it, and hunting one down by eye in a three-column grid is the kind
  // of search this probe exists to shorten. Ancestors are dropped — a spilling child makes every box
  // above it report the same overflow, and only the innermost one is the fault.
  const edge = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll("body *")].filter(
    (node) => Math.round(node.getBoundingClientRect().right) > edge + 1,
  );
  const spillers = wide
    .filter((node) => !wide.some((other) => other !== node && node.contains(other)))
    .slice(0, 6)
    .map((node) => ({
      where: describe(node).tag + (describe(node).className ? "." + describe(node).className.trim().split(/\\s+/).join(".") : ""),
      over: Math.round(node.getBoundingClientRect().right - edge),
      width: Math.round(node.getBoundingClientRect().width),
      text: describe(node).text,
    }));
  return {
    title: document.title,
    // One of each region, three slabs below the fold. The columns have different shells since the
    // redesign, so there is no single card class left whose count says anything about the page.
    regions: {
      work: count(".work"),
      rail: count(".rail"),
      contract: count(".contract"),
      queue: count(".queue"),
      audit: count(".audit"),
      slabs: count(".slab"),
    },
    rows: count(".line__box"),
    showing: document.querySelector(".queue__of")?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
    checkboxes: count('input[type="checkbox"]'),
    toolRows: count(".tool"),
    auditEntries: count(".entry__box"),
    inlineStyled: count("[style]"),
    revision: document.querySelector(".top__rev .num")?.textContent ?? null,
    marked:
      count(".line__state--marked") + count(".line__state--held") + count(".line__state--sent"),
    bars: {
      fills: fills.length,
      widths: fills.map((fill) => fill.width),
      // A stop of 0 is a bar that is *meant* to be empty: an answer credited with nothing. What must
      // never happen is a stop above 0 measuring 0 pixels, which is what a class with no rule in the
      // stylesheet looks like — and it reads as a student who scored nothing.
      atZeroStop: fills.filter((fill) => fill.stop === 0).length,
      brokenStops: fills.filter((fill) => fill.stop > 0 && fill.width === 0).map((fill) => fill.stop),
      unclassed: fills.filter((fill) => fill.stop < 0).length,
      narrowestAbove: Math.min(...fills.filter((fill) => fill.stop > 0).map((fill) => fill.width), 9999),
      widest: Math.max(...fills.map((fill) => fill.width), 0),
    },
    grid: cols === null ? null : {
      display: getComputedStyle(cols).display,
      columns: getComputedStyle(cols).gridTemplateColumns,
    },
    band: bandBox === null ? null : {
      height: Math.round(bandBox.height),
      aboveColumns: cols !== null && bandBox.bottom <= cols.getBoundingClientRect().top + 1,
      counts: counts.length,
      countRows: countRows.size,
      buttons: band.querySelectorAll("button").length,
      figures: counts.map((node) => node.querySelector(".count__num")?.textContent ?? null),
    },
    barPosition: bar === null ? null : getComputedStyle(bar).position,
    overflow: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      spillers,
    },
    staged: count(".bar--waiting") === 1,
    focusWho: document.querySelector(".focus__who")?.textContent?.trim() ?? null,
    headings,
    prose: { count: prose.length, narrowest: prose[0] ?? null },
    sendDisabled: send === null ? null : send.disabled,
    timelineActions: names(".tl__what"),
    timelineRevisions: names(".tl__rev").map((value) => Number(value.match(/\\d+/)?.[0] ?? -1)),
    focusConflict: document.querySelector(".focus .tick__conflict") !== null,
    focusSaveDisabled: document.querySelector(".focus .tick__foot button[type=submit]")?.disabled ?? null,
    active: describe(document.activeElement),
  };
`;

/**
 * The contract column at phone width, pressed.
 *
 * What is measured is whether a reader can see the nine registered tool rows, and that turns out not to be a
 * question about height. A closed `<details>` hides its contents with `content-visibility: hidden`,
 * which skips paint while leaving the subtree its layout, so every row inside a shut panel still
 * reports a box of its own — the first version of this probe read those boxes and concluded the panel
 * was open. `checkVisibility()` is the question actually being asked; the two height figures are kept
 * beside it as the record of why it is asked that way. The panel's own height is the honest one: the
 * element collapses to its summary.
 *
 * The summary is clicked twice so the page is left as it was found, and the second press is itself the
 * check that this is a disclosure and not a one-way reveal.
 *
 * `.contract details.fold` is deliberately specific: the four payload boxes inside the column are also
 * `<details>`, and one of them is open from the start. Matching them would make this pass for the
 * wrong reason.
 */
const FOLD = `
  const fold = document.querySelector(".contract details.fold");
  if (fold === null) return { exists: false };

  const head = fold.querySelector("summary.fold__head");
  if (head === null) return { exists: false };

  const rows = Array.from(fold.querySelectorAll(".tool"));
  const tall = (node) => Math.round(node.getBoundingClientRect().height);
  const state = () => ({
    open: fold.open,
    column: tall(fold),
    rows: rows.filter((row) => row.checkVisibility()).length,
    rowsWithBoxes: rows.filter((row) => tall(row) > 0).length,
  });

  const shut = { ...state(), head: tall(head) };
  head.click();
  const shown = state();
  head.click();

  return {
    exists: true,
    rows: rows.length,
    summaryText: (head.textContent ?? "").replace(/\\s+/g, " ").trim(),
    shut,
    shown,
    closedAgain: fold.open,
  };
`;

/**
 * Whether the policy is enforced, rather than merely present in the head.
 *
 * Two injections, each of which the hosted policy forbids: an inline `<script>` under
 * `script-src 'self'`, and a `style` attribute under `style-src 'self'`. If either one takes effect,
 * the meta tag is decoration. Both of these deliberately raise console violations — the caller counts
 * the log before running this, so the noise is expected rather than a failure.
 */
const ENFORCEMENT = `
  window.__inlineScriptRan = false;
  const script = document.createElement("script");
  script.textContent = "window.__inlineScriptRan = true;";
  document.head.append(script);
  script.remove();

  const probe = document.createElement("div");
  probe.setAttribute("style", "display: none");
  document.body.append(probe);
  const attributeApplied = getComputedStyle(probe).display === "none";
  probe.remove();

  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return {
    inlineScriptRan: window.__inlineScriptRan,
    styleAttributeApplied: attributeApplied,
    policy: meta?.getAttribute("content") ?? null,
  };
`;

/**
 * Contrast, on what the cascade actually composed.
 *
 * `tests/contrast.test.mts` computes the palette's pairs from `:root`, which settles whether a
 * combination *could* work. It cannot know which pair lands on which pixel — a rule that sets a
 * colour and forgets the background it inherits is exactly the defect that slips past it. So this
 * walks every element that owns visible text, resolves the background by compositing up the
 * ancestors, and applies WCAG 1.4.3: 4.5:1 for body text, 3:1 for large text.
 *
 * Alpha is composited rather than ignored. An element whose background is an image or a gradient is
 * counted and skipped, because a single ratio is not the right answer for one, and a silent skip is
 * how a probe like this flatters a page.
 */
const CONTRAST = `
  const parse = (value) => {
    const parts = (value.match(/[\\d.]+/g) ?? []).map(Number);
    if (parts.length < 3) return null;
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (front, back) => front.rgb.map((c, i) => c * front.alpha + back[i] * (1 - front.alpha));
  const channel = (value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const contrast = (first, second) => {
    const ratio = (Math.max(lum(first), lum(second)) + 0.05) / (Math.min(lum(first), lum(second)) + 0.05);
    return Math.floor(ratio * 100) / 100;
  };

  // The ground under a node: every ancestor background from the root down, composited in order.
  const ground = (node) => {
    const stack = [];
    for (let at = node; at !== null; at = at.parentElement) {
      const style = getComputedStyle(at);
      if (style.backgroundImage !== "none") return { image: true, rgb: null };
      const paint = parse(style.backgroundColor);
      if (paint !== null && paint.alpha > 0) stack.push(paint);
    }
    let base = [255, 255, 255];
    for (const paint of stack.reverse()) base = over(paint, base);
    return { image: false, rgb: base };
  };

  const owns = (node) =>
    [...node.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim().length > 0);

  const results = [];
  let images = 0;
  let hidden = 0;
  for (const node of document.querySelectorAll("body *")) {
    if (!owns(node)) continue;
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) { hidden += 1; continue; }
    const box = node.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) { hidden += 1; continue; }
    const back = ground(node);
    if (back.image) { images += 1; continue; }
    const ink = parse(style.color);
    if (ink === null) continue;
    const size = Number.parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    results.push({
      ratio: contrast(over(ink, back.rgb), back.rgb),
      needs: large ? 3 : 4.5,
      size,
      weight,
      color: style.color,
      background: "rgb(" + back.rgb.map((c) => Math.round(c)).join(", ") + ")",
      where: node.tagName.toLowerCase() + (typeof node.className === "string" && node.className ? "." + node.className.trim().split(/\\s+/).join(".") : ""),
      text: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
    });
  }
  const failures = results.filter((found) => found.ratio < found.needs);
  const sorted = [...results].sort((first, second) => first.ratio - second.ratio);
  return {
    pairs: results.length,
    skippedForImage: images,
    skippedInvisible: hidden,
    worst: sorted[0] ?? null,
    thinnest: sorted.slice(0, 3).map((found) => found.ratio + ":1 " + found.where),
    failures: failures.slice(0, 8),
    failureCount: failures.length,
  };
`;

/** What the browser itself holds, if this build has WebMCP at all. */
const MODEL_CONTEXT = `
  const context = document.modelContext ?? navigator.modelContext ?? null;
  if (context === null) {
    return { present: false, on: null, tools: null, note: "neither document nor navigator has it" };
  }
  const on = document.modelContext ? "document" : "navigator";
  if (typeof context.getTools !== "function") {
    return { present: true, on, tools: null, note: "no getTools on this build" };
  }
  try {
    const tools = await context.getTools();
    return { present: true, on, tools: tools.map((tool) => tool.name), note: null };
  } catch (error) {
    return { present: true, on, tools: null, note: "getTools threw: " + error.message };
  }
`;

function violations(events, from = 0) {
  return events
    .slice(from)
    .filter((event) => event.method === "Log.entryAdded")
    .map((event) => event.params.entry)
    .filter((entry) => entry.source === "security" || /Content Security Policy/i.test(entry.text));
}

function consoleErrors(events) {
  const api = events
    .filter((event) => event.method === "Runtime.consoleAPICalled")
    .filter((event) => event.params.type === "error" || event.params.type === "warning")
    .map((event) => event.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  const thrown = events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params.exceptionDetails.text);
  return [...api, ...thrown];
}

/**
 * A PNG into `docs/evidence/`. Full page by default, because a fold-height crop hides the audit.
 *
 * `beyond: false` clips to the viewport instead, which is the only way to get a frame comparable to a
 * mockup: a full-page capture of a page with a sticky bar paints that bar over the middle of the
 * document, and a reader laying the two images side by side would be comparing an artefact.
 */
async function shoot(cdp, width, height, name, beyond = true) {
  await cdp.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const shot = await cdp.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: beyond,
  });
  mkdirSync(EVIDENCE, { recursive: true });
  const file = join(EVIDENCE, name);
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
}

/** Tab from the top of the document and record where focus lands, in order. */
async function tabOrder(cdp, steps) {
  await cdp.evaluate("document.body.focus(); document.activeElement?.blur?.(); return true;");
  const landed = [];
  for (let step = 0; step < steps; step += 1) {
    for (const type of ["rawKeyDown", "keyUp"]) {
      await cdp.command("Input.dispatchKeyEvent", {
        type,
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
    }
    landed.push(await cdp.evaluate(`${HELPERS} return describe(document.activeElement);`));
  }
  return landed;
}

/**
 * What a screen reader is handed, as the browser itself computes it.
 *
 * This is not a screen-reader test — nothing here listens. It reads Chromium's accessibility tree,
 * which is the object every assistive technology is given, and asks four questions of it that a
 * static render cannot answer: whether every control arrives with a name, whether the heading outline
 * is walkable, whether the landmarks exist, and whether the live region is in the tree at all. A
 * control whose name is computed from an `aria-hidden` glyph arrives here as an empty string.
 */
async function axTree(cdp) {
  await cdp.command("Accessibility.enable");
  const { nodes } = await cdp.command("Accessibility.getFullAXTree");
  return nodes
    .filter((node) => node.ignored !== true)
    .map((node) => ({
      role: node.role?.value ?? null,
      name: (node.name?.value ?? "").replace(/\s+/g, " ").trim(),
      level: Number(node.properties?.find((found) => found.name === "level")?.value?.value ?? 0),
    }));
}

/** Roles that are useless without a name: a button called "" is a dead end for anyone not looking. */
const MUST_BE_NAMED = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "textbox",
  "combobox",
  "slider",
  "spinbutton",
  "heading",
]);

/** Where the heading outline breaks, if it does: a skipped level, or no level 1 to start from. */
function outlineFaults(headings) {
  const faults = [];
  const ones = headings.filter((heading) => heading.level === 1).length;
  if (ones !== 1) faults.push(`${ones} level-1 headings`);
  let previous = 0;
  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) {
      faults.push(`h${previous} → h${heading.level} at "${heading.name.slice(0, 24)}"`);
    }
    previous = heading.level;
  }
  return faults;
}

async function main() {
  const url = await startPreview();
  const binary = findBrowser();
  launchBrowser(binary);
  const cdp = await connect();

  const version = await cdp.command("Browser.getVersion");
  console.log(`${version.product} · ${url}`);

  await cdp.command("Page.enable");
  await cdp.command("Runtime.enable");
  await cdp.command("Log.enable");
  await cdp.command("Network.enable");

  await cdp.command("Page.navigate", { url });
  await waitFor("the app to mount", () => cdp.evaluate("return document.querySelector('.app__cols') !== null;"));

  const fresh = await cdp.evaluate(SNAPSHOT);
  check("the page mounts and lays out as a grid", fresh.grid?.display === "grid", fresh.grid?.columns);

  // Three tracks at 1440px: policy, the work, the agent's contract. The count is what is asserted and
  // not the widths — a track that collapses to nothing still counts as a track, but the layout the
  // target describes cannot exist in two.
  const wideTracks = (fresh.grid?.columns ?? "").split(" ").filter(Boolean).length;
  check("three columns at 1440px", wideTracks === 3, `${wideTracks} tracks: ${fresh.grid?.columns}`);

  // The band is the first thing on the page and the only place the sheet lays a row of counters out
  // sideways. What is asserted is that it stays a band: above the work rather than inside a column, its
  // four figures on one row, and short enough that the queue it introduces is still behind it.
  const band = fresh.band;
  check(
    "the band opens the page and its four figures run across",
    band !== null && band.aboveColumns && band.counts === 4 && band.countRows === 1 && band.height < 320,
    band === null ? "no band" : `${band.height}px tall, ${band.counts} figures on ${band.countRows} row`,
  );

  // On arrival the class is unmarked, so three of the four figures are zero and the first is the whole
  // stack. The band also carries the two view buttons; they change only the projection and never mark
  // an answer, so the worked-example control remains beside the queue.
  check(
    "the band prints the session's own figures and keeps view controls separate from marking",
    JSON.stringify(band?.figures) === JSON.stringify(["14", "0", "0", "0"]) && band?.buttons === 2,
    `figures read ${(band?.figures ?? []).join("/")}, ${band?.buttons} buttons in the band`,
  );

  // One of each region and three slabs below the fold. Counted per region rather than as one shared
  // card class: the three columns have different shells since the redesign, so a single count would no
  // longer be a statement about the page's shape.
  const regions = fresh.regions;
  const shape = ["work", "rail", "contract", "queue", "audit"].filter((name) => regions[name] !== 1);
  check(
    "the page draws one of each region and three slabs",
    shape.length === 0 && regions.slabs === 3,
    shape.length === 0 ? `5 regions, ${regions.slabs} slabs` : `wrong count: ${shape.join(", ")}`,
  );

  // The queue keeps every answer reachable in arrival order. The view select filters the rows without
  // changing their folios, so the initial all-answers count is fourteen of fourteen.
  check(
    "the queue shows the class and says how many rows are visible",
    fresh.rows === 14 && fresh.showing === "14 of 14",
    `${fresh.rows} rows, foot reads "${fresh.showing}"`,
  );
  check("the action bar is pinned rather than in the flow", fresh.barPosition !== "static", fresh.barPosition);
  check(
    "nothing spills sideways at 1440px",
    fresh.overflow.scrollWidth - fresh.overflow.clientWidth <= 1,
    `${fresh.overflow.scrollWidth - fresh.overflow.clientWidth}px over${
      fresh.overflow.spillers.length === 0
        ? ""
        : `: ${fresh.overflow.spillers.map((one) => `${one.where} ${one.over}px past the edge`).join(", ")}`
    }`,
  );
  check("nothing carries an inline style attribute", fresh.inlineStyled === 0, `${fresh.inlineStyled} found`);
  check("send is locked before anything is staged", fresh.sendDisabled === true, `disabled=${fresh.sendDisabled}`);
  check(
    "no paragraph is crushed into a narrow column",
    (fresh.prose.narrowest?.width ?? 0) >= 80,
    `narrowest ${fresh.prose.narrowest?.width}px of ${fresh.prose.count}: "${fresh.prose.narrowest?.text}"`,
  );

  // The worked example, then the same measurements again: this is where the audit fills with reasons.
  await cdp.evaluate("document.querySelector('.queue__foot .btn--quiet').click(); return true;");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const marked = await cdp.evaluate(SNAPSHOT);

  // Two rails per held answer that has a mark — what was credited, and where the pass mark sits — and
  // four of the five holds have one. The fifth is the quarantined answer, which has no mark to draw.
  check("the audit draws two rails per marked hold", marked.bars.fills === 8, `${marked.bars.fills} fills`);
  check(
    "every rail above the empty stop has width",
    marked.bars.brokenStops.length === 0 && marked.bars.unclassed === 0,
    `${marked.bars.brokenStops.length} broken, ${marked.bars.unclassed} unclassed, narrowest ${marked.bars.narrowestAbove}px, widest ${marked.bars.widest}px`,
  );

  // The quantised classes have to resolve to different lengths. If every `bars__fill--N` rule went
  // missing at once the bars would all measure the same — and that same width would be zero, which the
  // check above catches; a palette of one non-zero width would not be caught by anything else.
  const widths = new Set(marked.bars.widths);
  check(
    "the stops resolve to lengths that differ",
    widths.size > 1,
    `${widths.size} distinct widths across ${marked.bars.fills} rails`,
  );

  check(
    "the band's figures move with the marking",
    JSON.stringify(marked.band?.figures) === JSON.stringify(["14", "13", "5", "0"]),
    `figures read ${(marked.band?.figures ?? []).join("/")}`,
  );
  check("five accounts are in the audit rail", marked.auditEntries === 5, `${marked.auditEntries} entries`);
  check("the agent panel lists nine registered tools", marked.toolRows === 9, `${marked.toolRows} rows`);

  // Every answer now owns a four-panel details element rather than a single focused card. Prepare a
  // draft on row 03, commit a different row, and verify that the first draft is blocked until it
  // reloads the newer revision. This is the same concurrency contract, exercised against the current
  // queue shape rather than the retired pager selectors.
  const openByHand = `
    const openByHand = (folio) => {
      const details = [...document.querySelectorAll(".line__box")].find((candidate) =>
        candidate.querySelector(".line__folio")?.textContent?.trim() === folio
      );
      if (!details) return { ok: false };
      if (!details.open) details.querySelector(":scope > summary")?.click();
      const tab = [...details.querySelectorAll(".tabs__tab")].find((candidate) =>
        candidate.textContent?.trim() === "By hand"
      );
      tab?.click();
      return { ok: Boolean(tab), open: details.open };
    };
  `;

  const draft = await cdp.evaluate(`
    ${openByHand}
    const opened = openByHand("03");
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    const box = details?.querySelector(".tick input[type=checkbox]");
    if (!box) return { ok: false, opened };
    const before = box.checked;
    box.click();
    return { ok: true, opened, before, after: box.checked, disabled: box.disabled };
  `);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const draftReady = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    const box = details?.querySelector(".tick input[type=checkbox]");
    return { checked: box?.checked ?? null, disabled: box?.disabled ?? null, conflict: details?.querySelector(".tick__conflict") !== null };
  `);

  const external = await cdp.evaluate(`
    ${openByHand}
    return openByHand("04").ok;
  `);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const externalDraft = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "04");
    const box = details?.querySelector(".tick input[type=checkbox]");
    if (!box) return { ok: false };
    const before = box.checked;
    box.click();
    return { ok: true, before, after: box.checked, disabled: box.disabled };
  `);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const externalSave = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "04");
    const save = details?.querySelector(".tick button[type=submit]");
    if (!save) return { ok: false };
    const before = document.querySelector(".top__rev .num")?.textContent ?? null;
    save.click();
    return { ok: true, before, disabled: save.disabled };
  `);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const conflictState = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    return {
      revision: document.querySelector(".top__rev .num")?.textContent ?? null,
      conflict: details?.querySelector(".tick__conflict") !== null,
      saveDisabled: details?.querySelector(".tick button[type=submit]")?.disabled ?? null,
    };
  `);
  check(
    "a concurrent manual write blocks a stale row draft",
    draft.ok === true && draftReady.conflict === false && draft.after !== draft.before &&
      external === true && externalDraft.ok === true && externalDraft.after !== externalDraft.before &&
      externalSave.ok === true && conflictState.revision !== externalSave.before &&
      conflictState.conflict === true && conflictState.saveDisabled === true,
    `draft=${JSON.stringify(draft)}, external=${JSON.stringify(externalSave)}, state=${JSON.stringify(conflictState)}`,
  );

  const reloaded = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    const reload = details?.querySelector(".tick__conflict .btn");
    if (!reload) return false;
    reload.click();
    return true;
  `);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const recovered = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    return {
      conflict: details?.querySelector(".tick__conflict") !== null,
      saveDisabled: details?.querySelector(".tick button[type=submit]")?.disabled ?? null,
    };
  `);
  check(
    "the stale row recovers only after reloading current state",
    reloaded === true && recovered.conflict === false && recovered.saveDisabled === false,
    `reload=${reloaded}, recovered=${JSON.stringify(recovered)}`,
  );

  // Once the row has reloaded, a save by that same form advances its opened revision without creating
  // a self-conflict. The first checkbox is toggled and submitted as a real user interaction.
  const ownDraft = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    const box = details?.querySelector(".tick input[type=checkbox]");
    if (!box) return { ok: false };
    const before = box.checked;
    box.click();
    return { ok: true, before, after: box.checked, disabled: box.disabled };
  `);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const ownSave = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    const save = details?.querySelector(".tick button[type=submit]");
    if (!save) return { ok: false };
    const before = document.querySelector(".top__rev .num")?.textContent ?? null;
    save.click();
    return { ok: true, before, disabled: save.disabled };
  `);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const ownSaved = await cdp.evaluate(`
    const details = [...document.querySelectorAll(".line__box")].find((candidate) => candidate.querySelector(".line__folio")?.textContent?.trim() === "03");
    return {
      revision: document.querySelector(".top__rev .num")?.textContent ?? null,
      conflict: details?.querySelector(".tick__conflict") !== null,
      saveDisabled: details?.querySelector(".tick button[type=submit]")?.disabled ?? null,
    };
  `);
  check(
    "a successful row save does not conflict with its own form",
    ownDraft.ok === true && ownDraft.disabled === false && ownSave.ok === true &&
      ownSave.disabled === false && ownSaved.revision !== ownSave.before &&
      ownSaved.conflict === false && ownSaved.saveDisabled === false,
    `draft=${JSON.stringify(ownDraft)}, save=${JSON.stringify(ownSave)}, state=${JSON.stringify(ownSaved)}`,
  );

  // Beside the work it is a region, not a panel. Asserted here as well as at 420px because "it folds
  // on a phone" and "it does not fold anywhere else" are two claims, and the second is the one a
  // reader of the wide layout would notice being wrong.
  const foldWide = await cdp.evaluate('return document.querySelectorAll(".contract details.fold").length;');
  check("the contract column is not a panel at 1440px", foldWide === 0, `${foldWide} folds found`);

  // Contrast, on the marked page rather than the fresh one: this is the state that has bars, held
  // rows and the amber the target draws in a colour this sheet refused. `tests/contrast.test.mts`
  // guards the palette; this guards what the cascade did with it.
  const contrast = await cdp.evaluate(CONTRAST);
  check(
    "every text pair on the page meets its WCAG threshold",
    contrast.failureCount === 0 && contrast.pairs > 200,
    contrast.failureCount === 0
      ? `${contrast.pairs} text pairs, worst ${contrast.worst?.ratio}:1 on ${contrast.worst?.where} (needs ${contrast.worst?.needs})`
      : `${contrast.failureCount} under threshold, worst ${contrast.worst?.ratio}:1 on ${contrast.worst?.where}`,
  );

  // The accessibility tree, which is the only thing here that says anything about a reader who is not
  // looking at the screen. Four questions, none of which a static render can answer.
  const ax = await axTree(cdp);
  const unnamed = ax.filter((node) => MUST_BE_NAMED.has(node.role) && node.name === "");
  check(
    "every control and heading in the accessibility tree arrives with a name",
    unnamed.length === 0,
    unnamed.length === 0
      ? `${ax.filter((node) => MUST_BE_NAMED.has(node.role)).length} named nodes`
      : unnamed.map((node) => node.role).join(", "),
  );

  const headings = marked.headings ?? [];
  const faults = outlineFaults(headings);
  check(
    "the heading outline is walkable: one level 1, no level skipped",
    faults.length === 0 && headings.length > 10,
    faults.length === 0
      ? `${headings.length} headings in document order, levels ${[...new Set(headings.map((heading) => heading.level))].sort().join("/")}`
      : faults.join(" | "),
  );

  // Landmarks, and one deliberate absence. `contentinfo` is not here: the page has no page-level
  // footer, and its footnote is a note about the work, so it sits inside `main` where its scope is.
  const roles = new Set(ax.map((node) => node.role));
  const complementary = ax.filter((node) => node.role === "complementary").length;
  check(
    "the page hands over its landmarks",
    roles.has("banner") && roles.has("main") && complementary >= 2,
    `banner, main, ${complementary} complementary; no contentinfo — the footnote is scoped inside the work`,
  );

  const live = ax.filter((node) => node.role === "status");
  check(
    "the live region reaches the tree as a status",
    live.length >= 1,
    `${live.length} status regions, first says "${live[0]?.name.slice(0, 32) ?? ""}"`,
  );

  const shots = { marked: await shoot(cdp, 1440, 900, "browser-1440-marked.png") };

  // The same first screen at 1487×1058, clipped to the viewport, records the initial fold without
  // retaining a private design reference in the public evidence package. Deliberate departures are
  // listed in `docs/DECISIONS.md` D-27.
  shots.fold = await shoot(cdp, 1487, 1058, "browser-fold-1487.png", false);

  // Staging is the one thing static markup cannot check: the focus move is an effect.
  await cdp.evaluate("document.querySelector('.bar__mid .btn').click(); return true;");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const staged = await cdp.evaluate(SNAPSHOT);
  check("staging a release turns the bar", staged.staged === true, `bar--waiting ${staged.staged}`);
  check("focus moves to the bar's heading, not its send button", staged.active?.id === "gate-title", JSON.stringify(staged.active));
  check("send unlocks only once a release is staged", staged.sendDisabled === false, `disabled=${staged.sendDisabled}`);
  shots.staged = await shoot(cdp, 1440, 900, "browser-1440-staged.png");

  // Exercise both human decisions through the real DOM controls. Declining must leave every mark
  // on the page and record an event; a second stage followed by confirmation must record the final
  // release at the exact revision shown by its receipt-backed timeline.
  await cdp.evaluate("document.querySelector('.bar__mid .btn').click(); return true;");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const declined = await cdp.evaluate(SNAPSHOT);
  check(
    "declining a staged release clears it and records the human decision",
    declined.staged === false && declined.timelineActions.some((action) => /declined by human/i.test(action)),
    `staged=${declined.staged}, ${declined.timelineActions.at(-1) ?? "no timeline event"}`,
  );

  await cdp.evaluate("document.querySelector('.bar__mid .btn').click(); return true;");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const stagedAgain = await cdp.evaluate(SNAPSHOT);
  check("a declined release can be staged again", stagedAgain.staged === true, `staged=${stagedAgain.staged}`);

  await cdp.evaluate("document.querySelector('.btn--send').click(); return true;");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const confirmed = await cdp.evaluate(SNAPSHOT);
  check(
    "confirming through the human control records the final release",
    confirmed.staged === false &&
      confirmed.timelineActions.some((action) => /confirmed by human/i.test(action)) &&
      confirmed.timelineRevisions.at(-1) === Number(confirmed.revision),
    `staged=${confirmed.staged}, revision=${confirmed.revision}, last timeline revision=${confirmed.timelineRevisions.at(-1)}`,
  );

  const order = await tabOrder(cdp, 14);
  const reachable = order.filter((node) => node !== null && node.tag !== "body").length;
  check("the keyboard reaches the page", reachable >= 10, `${reachable} of 14 tab stops focused something`);

  // Narrow, because a three-column grid at 420px is either one column or a mess. What is asserted is
  // the property, not the mechanism: nothing may spill sideways. How many tracks the grid keeps is
  // recorded rather than demanded, since a two-column fallback would be a decision and not a defect.
  shots.narrow = await shoot(cdp, 420, 900, "browser-420-staged.png");
  const narrowGrid = await cdp.evaluate(SNAPSHOT);
  const tracks = (narrowGrid.grid?.columns ?? "").split(" ").filter(Boolean).length;
  const spill = narrowGrid.overflow.scrollWidth - narrowGrid.overflow.clientWidth;
  check(
    "nothing spills sideways at 420px",
    spill <= 1,
    `${spill}px over, ${tracks} grid tracks${
      narrowGrid.overflow.spillers.length === 0
        ? ""
        : `: ${narrowGrid.overflow.spillers.map((one) => `${one.where} ${one.over}px past the edge`).join(", ")}`
    }`,
  );

  // The one thing the visual brief asked for that the page did not do until now: in one column the
  // contract stops being a thousand words between the stack and the gate and becomes a panel. Both
  // halves are measured — that it arrives closed, and that pressing it produces the whole column —
  // because a disclosure that opens onto nothing is worse than no disclosure. The press is a real
  // click on the summary, so what is being tested is the browser's `<details>` and not our idea of it.
  const fold = await cdp.evaluate(FOLD);
  check(
    "the contract column is a panel at 420px, closed on arrival",
    fold.exists === true && fold.shut?.open === false && fold.shut?.rows === 0,
    fold.exists
      ? `open=${fold.shut.open}, ${fold.shut.rows} of ${fold.rows} tool rows visible (${fold.shut.rowsWithBoxes} still hold a box), panel ${fold.shut.column}px on a ${fold.shut.head}px summary`
      : "no details.fold inside .contract",
  );
  check(
    "pressing it opens the whole contract, and pressing it again closes it",
    fold.shown?.rows === fold.rows && fold.shown?.column > fold.shut?.column * 3 && fold.closedAgain === false,
    `${fold.shut?.column}px shut, ${fold.shown?.column}px open, ${fold.shown?.rows} of ${fold.rows} rows`,
  );
  await cdp.command("Emulation.clearDeviceMetricsOverride");

  // Only now, because both injections below are supposed to be blocked and logged.
  const quietUntil = cdp.events.length;
  const before = violations(cdp.events);
  check("the page raised no policy violation of its own", before.length === 0, before.map((entry) => entry.text).join(" | ") || "none");
  const errors = consoleErrors(cdp.events);
  check("no console error and no uncaught exception", errors.length === 0, errors.join(" | ") || "none");

  const requests = cdp.events
    .filter((event) => event.method === "Network.requestWillBeSent")
    .map((event) => event.params.request.url);
  const expectedOrigin = new URL(url).origin;
  const offsite = requests.filter((request) => {
    if (request.startsWith("data:")) return false;
    try {
      return new URL(request).origin !== expectedOrigin;
    } catch {
      return true;
    }
  });
  check("nothing left the expected origin", offsite.length === 0, `${requests.length} requests, ${offsite.length} off-site`);

  const enforcement = await cdp.evaluate(ENFORCEMENT);
  check("an inline script is blocked by the policy", enforcement.inlineScriptRan === false, `ran=${enforcement.inlineScriptRan}`);
  check("an inline style attribute is blocked by the policy", enforcement.styleAttributeApplied === false, `applied=${enforcement.styleAttributeApplied}`);
  check("the served policy names nine directives", (enforcement.policy ?? "").split(";").length === 9, enforcement.policy);
  const raised = violations(cdp.events, quietUntil);
  check("the browser logged the two blocks", raised.length >= 2, `${raised.length} violations after the probes`);

  const modelContext = await cdp.evaluate(MODEL_CONTEXT);
  console.log(`\nWebMCP: ${modelContext.present ? `present on ${modelContext.on}` : "absent"}${modelContext.note ? ` (${modelContext.note})` : ""}`);
  if (modelContext.tools) console.log(`registered: ${modelContext.tools.join(", ")}`);

  const failed = checks.filter((entry) => !entry.passed);
  const evidence = evidenceMeta(PACKAGE, {
    browserFlags: ["--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting"],
    artifactPaths: Object.values(shots),
  });
  const report = {
    status: failed.length === 0 ? "VERIFIED_RUN" : "FAILED_RUN",
    evidenceClass: "VERIFIED_ARTIFACT",
    scope: GIVEN_URL
      ? "hosted production build in flagged Chromium; not model-selected"
      : "local production build in flagged Chromium; not hosted and not model-selected",
    ranAt: new Date().toISOString(),
    evidence,
    browser: version.product,
    protocol: version.protocolVersion,
    url,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
    snapshots: { fresh, marked, staged, declined, stagedAgain, confirmed, narrow: narrowGrid },
    contrast,
    fold,
    accessibility: {
      nodes: ax.length,
      named: ax.filter((node) => MUST_BE_NAMED.has(node.role)).length,
      unnamed,
      outline: headings.map((heading) => `h${heading.level} ${heading.name}`),
      landmarks: ["banner", "main", "complementary"].filter((role) => roles.has(role)),
      complementary,
      contentinfo: "absent by design; the footnote is a note about the work and sits inside main",
      liveRegions: live.map((node) => node.name.slice(0, 44)),
    },
    enforcement,
    modelContext,
    tabOrder: order,
    requests: { total: requests.length, offsite },
    consoleErrors: errors,
    policyViolations: { beforeProbes: before, afterProbes: raised.length },
    screenshots: shots,
    notClaimed:
      "This run reads the WebMCP registry; it does not let a model call a tool. No browser agent " +
      "has driven these tools. Contrast here is arithmetic on what the cascade composed, not a " +
      "judgement about whether the page reads well; the accessibility tree is what a screen reader " +
      "would be handed, not a recording of one speaking. Wording has been read by nobody but the " +
      "author.",
  };

  mkdirSync(EVIDENCE, { recursive: true });
  const file = join(EVIDENCE, "browser-session.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed} passed, ${report.failed} failed → ${file}`);

  if (failed.length > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(`\nbroke off: ${error.message}`);
  process.exitCode = 1;
} finally {
  runCleanups();
}
