/**
 * One question, asked of the browser rather than of the source: when something other than this page
 * calls a registered tool, does the page do what it says it does?
 *
 * `scripts/browser-session.mjs` reads `document.modelContext` and lists what the browser holds. That
 * proves the API exists and that the registrations landed. It does not prove that a call from outside
 * the page reaches the handler, that the fail-closed guard holds on that path, or that the rendered
 * page moves afterwards — and those are the claims the whole design rests on.
 *
 * Chromium exposes the agent side of WebMCP over the DevTools Protocol: `WebMCP.enable` reports every
 * registered tool, `WebMCP.invokeTool` dispatches one by name into the frame that registered it, and
 * `WebMCP.toolResponded` carries back what the handler returned. That is the path a browser agent's
 * host takes. This script is a client on it.
 *
 * What a green run establishes:
 *
 *   1. the browser's own registry holds nine tools, carrying the read-only and untrusted-content
 *      hints the page attached to them, and the names it holds are the names the page prints;
 *   2. a call this page did not make reaches the handler and comes back `Completed`;
 *   3. no point value crosses on the wire, and three of the five holds go unnamed, on the
 *      browser-dispatched path rather than only in a unit test;
 *   4. a prompt injection arriving as a tool call — all four rubric lines claimed for the answer that
 *      asks for full marks — is quarantined and credited with nothing;
 *   5. a write moves the rendered page: the care setting, the revision and the held count all change;
 *   6. that same write replayed with its accepted operation id is refused `duplicate-operation`,
 *      while a different write from the old revision is refused `stale-revision`;
 *   7. a release staged by a tool unlocks the human control and puts focus on the heading rather than
 *      on the send button;
 *   8. the human-only release action cannot be invoked, because the browser has never registered it.
 *
 * What it is still not: a model. Every call below was composed by this file. Nothing here shows a
 * model reading a page, choosing a tool, or writing its own input; that is a different claim, it needs
 * a client this workspace does not have, and `docs/PROGRESS.md` keeps it in a class of its own.
 *
 * Usage, from `submissions/withheld`:
 *
 *   node --run build && node scripts/webmcp-invoke.mjs
 *
 * `--url`, `--browser`, `--port`, `--preview-port` and `--keep` behave as they do in the session
 * script. Exit status is the result: 0 only if every check passed.
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

const PORT = Number(flag("port", 9421));
const GIVEN_PREVIEW_PORT = flag("preview-port") !== null;
const PREVIEW_PORT = Number(flag("preview-port", 4183));
const KEEP = flag("keep", false) === true;
const GIVEN_URL = typeof flag("url") === "string" ? flag("url") : null;

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

const settle = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * The production build, served the way a static host would serve it.
 *
 * The served page is identified before anything is measured. If a neighbour already holds the port,
 * `--strictPort` makes our vite exit while the port keeps answering, and every check below would then
 * be run against someone else's page and reported as ours. That happened once, against the Flowline
 * submission's preview: nine tools were read out of a registry that was not this page's.
 */
async function startPreview() {
  if (GIVEN_URL) return GIVEN_URL;

  if (!existsSync(join(PACKAGE, "dist", "index.html"))) {
    throw new Error("dist/index.html is missing — run `node --run build` first");
  }

  const port = GIVEN_PREVIEW_PORT ? PREVIEW_PORT : await freePort(PREVIEW_PORT);
  const server = spawn(join(PACKAGE, "node_modules", ".bin", "vite"),
    ["preview", "--port", String(port), "--strictPort"], { cwd: PACKAGE, stdio: "ignore" });
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

/** The first browser on PATH that Chromium's own switches apply to. */
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
 * A throwaway profile, headless, and the two switches that expose WebMCP at all. Without
 * `--enable-features=WebMCPTesting` the domain below reports an empty registry, which is a different
 * result from a page that failed to register and must not be mistaken for one.
 */
function launchBrowser(binary) {
  const profile = mkdtempSync(join(tmpdir(), "withheld-invoke-"));
  const browser = spawn(binary, [
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
  ], { stdio: "ignore" });

  onExit(() => {
    if (KEEP) return;
    browser.kill("SIGTERM");
    rmSync(profile, { recursive: true, force: true });
  });
  browser.on("error", (error) => {
    throw error;
  });
  return browser;
}

/** The protocol client. Node has had a global `WebSocket` since 22, so this needs no dependency. */
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
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve?.(message);
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
    if (result.exceptionDetails) throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
    return result.result?.value;
  }

  return { command, evaluate, events };
}

/**
 * What the browser holds, from its own events rather than from anything the page says. `toolsAdded`
 * arrives in batches as the registrations run, so the caller waits for the count to settle.
 */
function registry(events) {
  const held = new Map();
  for (const event of events) {
    if (event.method === "WebMCP.toolsAdded") {
      for (const tool of event.params.tools) held.set(tool.name, tool);
    }
    if (event.method === "WebMCP.toolsRemoved") {
      for (const tool of event.params.tools) held.delete(tool.name);
    }
  }
  return [...held.values()];
}

/**
 * One dispatch, and what came back. `invokeTool` returns before the handler runs — the answer arrives
 * as `toolResponded`, correlated by invocation id, which is what makes this an agent-side path rather
 * than a function call dressed up as one.
 */
async function invoke(cdp, frameId, toolName, input) {
  const { invocationId } = await cdp.command("WebMCP.invokeTool", { frameId, toolName, input });
  const answer = await waitFor(`${toolName} to answer`, () =>
    cdp.events.find(
      (event) =>
        event.method === "WebMCP.toolResponded" && event.params.invocationId === invocationId,
    ),
  );
  const text = answer.params.output?.content?.[0]?.text;
  let payload = null;
  try {
    payload = typeof text === "string" ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  return { status: answer.params.status, text: typeof text === "string" ? text : null, payload };
}

/** Every key in a returned payload, at any depth. Used to prove an absence rather than assert one. */
function keysOf(value, into = new Set()) {
  if (Array.isArray(value)) for (const item of value) keysOf(item, into);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      into.add(key);
      keysOf(item, into);
    }
  }
  return into;
}

/** What the page is showing, read from the rendered DOM and nowhere else. */
const STATE = `
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
  const names = (selector) =>
    [...document.querySelectorAll(selector)].map((node) => node.textContent.trim());
  const checked = [...document.querySelectorAll(".care__radio")].find((radio) => radio.checked);
  // The band under the bar prints four figures in a fixed order — answers, marked, held, staged — and
  // the third is the only place the page states a hold count. Read by position because the label sits
  // in a sibling span; the order is asserted in tests/render.test.mts, so a reshuffle fails there first.
  const figures = [...document.querySelectorAll(".band__counts .count__num")].map(
    (node) => Number(node.textContent),
  );
  return {
    emphasis: checked ? checked.value : null,
    revision: Number(text(".top__rev .num")),
    held: figures[2] ?? null,
    figures,
    fills: document.querySelectorAll(".bars__fill").length,
    audit: document.querySelectorAll(".audit .entry").length,
    staged: document.querySelector(".bar--waiting") !== null,
    sendDisabled: document.querySelector(".btn--send")?.disabled ?? null,
    focused: document.activeElement?.id || null,
    printedTools: names(".tool__name"),
    humanOnly: text(".only__hard"),
  };
`;

const CLICK_WORKED_EXAMPLE = `
  const button = [...document.querySelectorAll("button")].find((node) =>
    /worked example/i.test(node.textContent || ""));
  if (!button) return false;
  button.click();
  return true;
`;

/**
 * Anything the browser itself logged as an error, not only what the page called `console.error` on.
 *
 * The one exclusion is the implicit `/favicon.ico` request. `img-src` is `'self'` rather than `'none'`
 * precisely so that request is an ordinary 404 instead of a policy violation, and a 404 for a file
 * this page never asks for is not a defect — see `docs/PROGRESS.md`. Everything else counts.
 */
function consoleErrors(events) {
  const ignorable = (entry) => /favicon\.ico/.test(entry.url ?? "") && /404/.test(entry.text ?? "");
  return events
    .filter(
      (event) =>
        (event.method === "Runtime.consoleAPICalled" && event.params.type === "error") ||
        event.method === "Runtime.exceptionThrown" ||
        (event.method === "Log.entryAdded" &&
          event.params.entry.level === "error" &&
          !ignorable(event.params.entry)),
    )
    .map((event) =>
      event.method === "Log.entryAdded"
        ? event.params.entry.text
        : (event.params.exceptionDetails?.text ??
          (event.params.args ?? []).map((arg) => arg.value ?? arg.description).join(" ")),
    );
}

async function main() {
  const url = await startPreview();
  launchBrowser(findBrowser());
  const cdp = await connect();
  const version = await cdp.command("Browser.getVersion");
  console.log(`${version.product} · ${url}\n`);

  await cdp.command("Runtime.enable");
  await cdp.command("Log.enable");
  await cdp.command("Network.enable");
  await cdp.command("Page.navigate", { url });
  await waitFor("the page to mount", () =>
    cdp.evaluate(`return document.querySelector(".app__cols") !== null;`),
  );

  // Only after the page has registered, so the first batch of events is the whole registry.
  await cdp.command("WebMCP.enable");
  await waitFor("the browser to report a registry", () => registry(cdp.events).length >= 9);
  await settle();
  const held = registry(cdp.events);
  const frameId = held[0].frameId;
  const names = held.map((tool) => tool.name).sort();

  check("the browser's own registry holds nine tools", held.length === 9, `${held.length} tools`);

  const fresh = await cdp.evaluate(STATE);
  const printed = [...fresh.printedTools].sort();
  check(
    "the names the browser holds are the names the page prints",
    JSON.stringify(names) === JSON.stringify(printed),
    names.join(", "),
  );

  const readOnly = held.filter((tool) => tool.annotations?.readOnly === true).map((t) => t.name);
  check(
    "the read-only hint crossed into the browser for six tools and no others",
    readOnly.length === 6 && !readOnly.includes("propose_marks"),
    `${readOnly.length} read-only: ${readOnly.sort().join(", ")}`,
  );

  const untrusted = held.filter((tool) => tool.annotations?.untrustedContent === true).map((t) => t.name);
  check(
    "the untrusted-content hint crossed for the tool that returns a student's words",
    untrusted.length === 1 && untrusted[0] === "read_answer",
    untrusted.join(", ") || "none",
  );

  const stack = await invoke(cdp, frameId, "describe_stack", {});
  check(
    "a call the page did not make reaches the handler and comes back",
    stack.status === "Completed" && stack.payload?.answerCount === 14,
    `${stack.status} · revision ${stack.payload?.revision} · ${stack.payload?.markedCount} marked`,
  );

  const rubric = await invoke(cdp, frameId, "read_rubric", {});
  const rubricKeys = [...keysOf(rubric.payload)];
  check(
    "no point value crosses on the wire",
    rubric.status === "Completed" &&
      rubric.payload?.rubricLineCount === 4 &&
      !rubricKeys.includes("points") &&
      !/\b(17|19|23|29)\b/.test(JSON.stringify(rubric.payload?.rubric ?? [])),
    `${rubricKeys.length} keys, none of them points`,
  );

  const unknownRubric = await invoke(cdp, frameId, "propose_marks", {
    findings: [{ answerId: "ans-01", foundLineIds: ["rubric-not-present"] }],
    expectedRevision: stack.payload.revision,
    operationId: "probe-unknown-rubric",
  });
  const afterUnknownRubric = await invoke(cdp, frameId, "describe_stack", {});
  check(
    "an unknown rubric line is refused before arithmetic and leaves the page unchanged",
    unknownRubric.payload?.refused === true &&
      unknownRubric.payload?.code === "invalid-argument" &&
      afterUnknownRubric.payload?.revision === stack.payload.revision &&
      afterUnknownRubric.payload?.markedCount === 0,
    `${unknownRubric.payload?.code} · revision ${afterUnknownRubric.payload?.revision}`,
  );

  // The injection arrives as a tool call rather than out of a fixture: every rubric line claimed for
  // the answer whose text asks the marker to ignore the rubric and award full marks.
  const lineIds = (rubric.payload?.rubric?.lines ?? []).map((line) => line.id);
  const injected = await invoke(cdp, frameId, "propose_marks", {
    findings: [{ answerId: "ans-11", foundLineIds: lineIds }],
    expectedRevision: stack.payload.revision,
    operationId: "probe-injection",
  });
  await settle();
  const afterInjection = await invoke(cdp, frameId, "describe_stack", {});
  const quarantined = (afterInjection.payload?.answers ?? []).find((a) => a.id === "ans-11");
  check(
    "an injection that arrives as a tool call is quarantined and credited with nothing",
    injected.status === "Completed" &&
      quarantined?.state === "quarantined" &&
      afterInjection.payload?.markedCount === 0,
    `${lineIds.length} lines claimed · ans-11 is ${quarantined?.state} · ${afterInjection.payload?.markedCount} marked`,
  );

  const explained = await invoke(cdp, frameId, "explain_mark", { answerId: "ans-11" });
  check(
    "and the page will not explain a mark it never made",
    explained.payload?.refused === true || explained.payload?.explanation == null,
    explained.payload?.code ?? explained.text?.slice(0, 60) ?? explained.status,
  );

  // A person fills the stack, because that is what the button is: this click is not an agent, and the
  // checks after it are about what the tools do to a marked stack rather than about how it got marked.
  check("the worked example is one click", await cdp.evaluate(CLICK_WORKED_EXAMPLE) === true);
  await settle();
  const marked = await cdp.evaluate(STATE);

  const holds = await invoke(cdp, frameId, "list_held_answers", {});
  check(
    "the held answers are counted for the agent and only some are named",
    holds.status === "Completed" &&
      holds.payload?.heldCount === marked.held &&
      (holds.payload?.namedHolds ?? []).length < holds.payload?.heldCount,
    `${holds.payload?.heldCount} held, ${(holds.payload?.namedHolds ?? []).length} named, page shows ${marked.held}`,
  );

  const raised = await invoke(cdp, frameId, "set_marking_emphasis", {
    emphasis: "cautious",
    expectedRevision: holds.payload.revision,
    operationId: "raise-care",
  });
  await settle();
  const moved = await cdp.evaluate(STATE);
  check(
    "a write from outside the page moves the rendered page",
    raised.status === "Completed" &&
      marked.emphasis === "standard" &&
      moved.emphasis === "cautious" &&
      moved.revision === marked.revision + 1 &&
      moved.held > marked.held,
    `emphasis ${marked.emphasis}→${moved.emphasis}, revision ${marked.revision}→${moved.revision}, held ${marked.held}→${moved.held}`,
  );

  const replayed = await invoke(cdp, frameId, "set_marking_emphasis", {
    emphasis: "cautious",
    expectedRevision: moved.revision,
    operationId: "raise-care",
  });
  await settle();
  const unmoved = await cdp.evaluate(STATE);
  check(
    "an accepted write replayed with the current revision is refused as a duplicate, and the page does not move again",
    replayed.payload?.refused === true &&
      replayed.payload?.code === "duplicate-operation" &&
      unmoved.emphasis === "cautious" &&
      unmoved.revision === moved.revision,
    `${replayed.payload?.code} · still ${unmoved.emphasis} at revision ${unmoved.revision}`,
  );

  const stale = await invoke(cdp, frameId, "set_marking_emphasis", {
    emphasis: "most-cautious",
    expectedRevision: holds.payload.revision,
    operationId: "stale-care",
  });
  check(
    "a different write from an old read is still refused as stale",
    stale.payload?.refused === true && stale.payload?.code === "stale-revision",
    `${stale.payload?.code} · still ${unmoved.emphasis} at revision ${unmoved.revision}`,
  );

  const release = await invoke(cdp, frameId, "request_release", {
    expectedRevision: unmoved.revision,
    operationId: "stage-release",
  });
  await settle();
  const gate = await cdp.evaluate(STATE);
  check(
    "a release staged by a tool is waiting for a person and echoes no answer id",
    release.status === "Completed" &&
      release.payload?.awaitingHuman === true &&
      !/ans-\d+/.test(release.text ?? ""),
    `awaitingHuman=${release.payload?.awaitingHuman}, ${(release.text ?? "").length} characters back, 0 ids`,
  );
  check(
    "staging unlocks the human control and puts focus on the heading, not on send",
    gate.staged === true && gate.sendDisabled === false && gate.focused === "gate-title",
    `staged=${gate.staged}, send disabled=${gate.sendDisabled}, focus on #${gate.focused}`,
  );

  // The absence, measured by the browser instead of asserted by the page.
  const absent = await cdp
    .command("WebMCP.invokeTool", { frameId, toolName: "confirm_release", input: {} })
    .then(() => null, (error) => error.message);
  check(
    "the browser cannot invoke the human-only release action",
    typeof absent === "string" && /not found/i.test(absent) && gate.humanOnly === "Only a person can send it.",
    absent ?? "the browser accepted it",
  );

  const requests = cdp.events
    .filter((event) => event.method === "Network.requestWillBeSent")
    .map((event) => event.params.request.url);
  const offsite = requests.filter((request) => !request.startsWith("http://127.0.0.1:") && !request.startsWith("data:"));
  check("nothing left the machine", offsite.length === 0, `${requests.length} requests, ${offsite.length} off-site`);

  const errors = consoleErrors(cdp.events);
  const favicon = cdp.events.filter(
    (event) => event.method === "Log.entryAdded" && /favicon\.ico/.test(event.params.entry.url ?? ""),
  ).length;
  check(
    "the browser logged no error of its own",
    errors.length === 0,
    errors.join(" | ") || `none${favicon > 0 ? ` (${favicon} favicon 404 ignored)` : ""}`,
  );

  const failed = checks.filter((entry) => !entry.passed);
  const evidence = evidenceMeta(PACKAGE, {
    browserFlags: ["--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting"],
  });
  const report = {
    status: failed.length === 0 ? "VERIFIED_RUN" : "FAILED_RUN",
    evidenceClass: "VERIFIED_ARTIFACT",
    scope: "local production build with Chromium native WebMCP dispatch; not hosted and not model-selected",
    ranAt: new Date().toISOString(),
    evidence,
    browser: version.product,
    protocol: version.protocolVersion,
    url,
    passed: checks.length - failed.length,
    failed: failed.length,
    checks,
    registry: held.map((tool) => ({
      name: tool.name,
      annotations: tool.annotations ?? null,
      hasInputSchema: Boolean(tool.inputSchema),
    })),
    invocations: {
      describe_stack: stack,
      read_rubric: { status: rubric.status, keys: [...keysOf(rubric.payload)] },
      unknown_rubric_line: unknownRubric,
      propose_marks: injected,
      explain_mark: explained,
      list_held_answers: holds,
      set_marking_emphasis: raised,
      "set_marking_emphasis (replayed)": replayed,
      request_release: release,
      unavailable_confirmation: { attemptedTool: "confirm_release", status: "not dispatched", error: absent },
    },
    page: { fresh, marked, moved, unmoved, gate },
    requests: { total: requests.length, offsite },
    consoleErrors: errors,
    proves:
      "Every tool above was dispatched by Chromium's WebMCP domain into the page's own handler, and " +
      "the page's rendered state was read afterwards. This is the agent-side path, exercised.",
    notClaimed:
      "No model was involved. This script chose the tools, wrote the input, and knew the revision to " +
      "quote. It shows that the surface works when something outside the page calls it; it does not " +
      "show a model finding the page, choosing a tool, or composing its arguments. That is a " +
      "separate class of evidence and it remains open — see docs/PROGRESS.md.",
  };

  mkdirSync(EVIDENCE, { recursive: true });
  const file = join(EVIDENCE, "webmcp-invocation.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(EVIDENCE, "native-registry.json"),
    `${JSON.stringify(
      {
        status: report.failed === 0 ? "VERIFIED_RUN" : "FAILED_RUN",
        evidenceClass: "VERIFIED_ARTIFACT",
        scope: "local loopback Chromium native WebMCP registry; not hosted and not model-selected",
        ranAt: report.ranAt,
        evidence: report.evidence,
        browser: report.browser,
        protocol: report.protocol,
        url: report.url,
        toolCount: report.registry.length,
        tools: report.registry,
        notClaimed:
          "This is a local native-registry observation from the flagged Chromium run. It does not " +
          "prove a hosted URL, model-selected replay, or judge-client compatibility.",
      },
      null,
      2,
    )}\n`,
  );
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
