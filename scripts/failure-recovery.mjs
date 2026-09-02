/**
 * Deterministic local failure/recovery journey for Withheld.
 *
 * This is deliberately a browser harness, not a model replay. It chooses every tool and argument
 * itself so the safety and recovery contract can be checked without inventing model evidence. The
 * page is served from the local production `dist/` directory, the browser uses the same WebMCP
 * testing flags as the other local probes, and human-only decisions are made by clicking the page.
 *
 * The resulting artifact contains redacted summaries: synthetic ids, revisions, counts, refusal
 * codes, and DOM state. It does not copy answer bodies, rubric point values, pass boundaries, or
 * browser profile data into the evidence file.
 *
 * Usage from submissions/withheld:
 *   node --experimental-strip-types scripts/failure-recovery.mjs
 *
 * A final hosted/model journey must be recorded separately. This file must never be labelled as
 * natural-language model evidence.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_FINDINGS } from "../src/data/fixtures.ts";
import { evidenceMeta } from "./evidence-meta.mjs";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const EVIDENCE = join(PACKAGE, "docs", "evidence");
const BROWSER_FLAGS = ["--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting"];

function flag(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const next = process.argv[at + 1];
  return next && !next.startsWith("--") ? next : true;
}

const PORT = Number(flag("port", 9431));
const PREVIEW_PORT = Number(flag("preview-port", 4191));
const KEEP = flag("keep", false) === true;

const cleanups = [];
function onExit(action) {
  cleanups.push(action);
}

function runCleanups() {
  while (cleanups.length > 0) {
    try {
      cleanups.pop()();
    } catch {
      // Cleanup failures must not hide the recorded journey result.
    }
  }
}

async function waitFor(what, attempt, { tries = 80, gap = 250 } = {}) {
  for (let index = 0; index < tries; index += 1) {
    try {
      const value = await attempt();
      if (value) return value;
    } catch {
      // The server, browser, or frame may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, gap));
  }
  throw new Error(`timed out waiting for ${what}`);
}

const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort(from) {
  for (let port = from; port < from + 24; port += 1) {
    const answering = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) })
      .then(() => true)
      .catch(() => false);
    if (!answering) return port;
  }
  throw new Error(`nothing free between ${from} and ${from + 23}`);
}

async function startPreview() {
  if (!existsSync(join(PACKAGE, "dist", "index.html"))) {
    throw new Error("dist/index.html is missing — run pnpm build first");
  }

  const port = await freePort(PREVIEW_PORT);
  const server = spawn(
    join(PACKAGE, "node_modules", ".bin", "vite"),
    ["preview", "--port", String(port), "--strictPort"],
    { cwd: PACKAGE, stdio: "ignore" },
  );
  onExit(() => server.kill("SIGTERM"));

  const url = `http://127.0.0.1:${port}/`;
  await waitFor("the preview server", async () => (await fetch(url)).ok);
  const served = await fetch(url).then((response) => response.text());
  if (!served.includes("<title>Withheld")) throw new Error("preview is not the Withheld build");
  return url;
}

function findBrowser() {
  const named = flag("browser");
  if (typeof named === "string") return named;
  const candidates = ["chromium", "chrome", "google-chrome-stable", "google-chrome", "brave"];
  for (const directory of (process.env.PATH ?? "").split(":").filter(Boolean)) {
    for (const candidate of candidates) {
      const path = join(directory, candidate);
      if (existsSync(path)) return path;
    }
  }
  throw new Error("no Chromium-family browser found on PATH — pass --browser");
}

function launchBrowser(binary) {
  const profile = mkdtempSync(join(tmpdir(), "withheld-recovery-"));
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
      ...BROWSER_FLAGS,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  onExit(() => {
    if (!KEEP) {
      browser.kill("SIGTERM");
      rmSync(profile, { recursive: true, force: true });
    }
  });
  return browser;
}

async function connect() {
  const page = await waitFor("a CDP page target", async () => {
    const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
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
    } else {
      events.push(message);
    }
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

async function invoke(cdp, frameId, toolName, input) {
  const { invocationId } = await cdp.command("WebMCP.invokeTool", { frameId, toolName, input });
  const answer = await waitFor(`${toolName} to answer`, () =>
    cdp.events.find(
      (event) =>
        event.method === "WebMCP.toolResponded" && event.params.invocationId === invocationId,
    ),
  );
  const output = answer.params.output?.content?.[0]?.text;
  let payload = null;
  try {
    payload = typeof output === "string" ? JSON.parse(output) : null;
  } catch {
    payload = null;
  }
  return { status: answer.params.status, payload };
}

const STATE = `
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
  const figures = [...document.querySelectorAll(".band__counts .count__num")].map((node) => Number(node.textContent));
  return {
    revision: Number(text(".top__rev .num")),
    figures,
    marked: figures[1] ?? null,
    held: figures[2] ?? null,
    stagedCount: figures[3] ?? null,
    staged: document.querySelector(".bar--waiting") !== null,
    sendDisabled: document.querySelector(".btn--send")?.disabled ?? null,
    timelineActions: [...document.querySelectorAll(".tl__what")].map((node) => node.textContent.trim()),
    timelineRevisions: [...document.querySelectorAll(".tl__rev")].map((node) => Number(node.textContent.replace(/[^0-9]/g, ""))),
  };
`;

function resultSummary(result) {
  const payload = result.payload ?? {};
  return {
    status: result.status,
    refused: payload.refused === true,
    code: typeof payload.code === "string" ? payload.code : null,
    revision: typeof payload.revision === "number" ? payload.revision : null,
    answerCount: typeof payload.answerCount === "number" ? payload.answerCount : null,
    markedCount: typeof payload.markedCount === "number" ? payload.markedCount : null,
    heldCount: typeof payload.heldCount === "number" ? payload.heldCount : null,
    releasableCount: typeof payload.releasableCount === "number" ? payload.releasableCount : null,
    releasedCount: typeof payload.releasedCount === "number" ? payload.releasedCount : null,
    awaitingHuman: payload.awaitingHuman === true,
    receiptAction: typeof payload.receipt?.action === "string" ? payload.receipt.action : null,
    echoedAnswerCount: Array.isArray(payload.receipt?.answerIds) ? payload.receipt.answerIds.length : 0,
  };
}

function safeState(state) {
  return {
    revision: state.revision,
    figures: state.figures,
    staged: state.staged,
    sendDisabled: state.sendDisabled,
    timelineActions: state.timelineActions,
    timelineRevisions: state.timelineRevisions,
  };
}

async function main() {
  const url = await startPreview();
  launchBrowser(findBrowser());
  const cdp = await connect();
  const version = await cdp.command("Browser.getVersion");

  await cdp.command("Runtime.enable");
  await cdp.command("Page.enable");
  await cdp.command("Network.enable");
  await cdp.command("Page.navigate", { url });
  await waitFor("the page to mount", () => cdp.evaluate('return document.querySelector(".app__cols") !== null;'));
  await cdp.command("WebMCP.enable");
  await waitFor("nine registered tools", () => registry(cdp.events).length >= 9);
  await settle();

  const checks = [];
  const trace = [];
  const check = (name, passed, detail) => {
    const entry = { name, passed: Boolean(passed), detail };
    checks.push(entry);
    console.log(`${entry.passed ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  let frameId = registry(cdp.events)[0]?.frameId;
  const registered = registry(cdp.events);
  check(
    "clean local load exposes exactly nine native tools",
    registered.length === 9,
    `${registered.length} tools`,
  );

  async function toolStep(name, toolName, input, expected) {
    const before = await cdp.evaluate(STATE);
    const result = await invoke(cdp, frameId, toolName, input);
    await settle();
    const after = await cdp.evaluate(STATE);
    const passed = expected(result, before, after);
    check(name, passed, JSON.stringify({ result: resultSummary(result), revision: `${before.revision}→${after.revision}` }));
    trace.push({
      step: name,
      actor: "deterministic-local-client",
      tool: toolName,
      input,
      revisionBefore: before.revision,
      revisionAfter: after.revision,
      result: resultSummary(result),
      pageBefore: safeState(before),
      pageAfter: safeState(after),
    });
    return { result, before, after };
  }

  const loaded = await cdp.evaluate(STATE);
  check("the page starts at a clean revision with no marked or staged work", loaded.revision === 1 && loaded.marked === 0 && loaded.staged === false, JSON.stringify(safeState(loaded)));

  const described = await toolStep(
    "the client reads the stack revision before any write",
    "describe_stack",
    {},
    (result, before, after) => result.status === "Completed" && result.payload?.revision === 1 && before.revision === after.revision,
  );

  const rubric = await toolStep(
    "the client reads the redacted rubric",
    "read_rubric",
    {},
    (result, before, after) =>
      result.status === "Completed" &&
      result.payload?.rubricLineCount === 4 &&
      !JSON.stringify(result.payload).match(/17|19|23|29|50/) &&
      before.revision === after.revision,
  );
  const lineIds = rubric.result.payload.rubric.lines.map((line) => line.id);

  await toolStep(
    "the client reads one synthetic answer as untrusted content",
    "read_answer",
    { answerId: "ans-01" },
    (result, before, after) => result.status === "Completed" && result.payload?.answer?.id === "ans-01" && before.revision === after.revision,
  );

  await toolStep(
    "requesting release before any mark is a safe wrong-phase refusal",
    "request_release",
    { expectedRevision: 1, operationId: "recovery-wrong-phase" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "nothing-to-release" && before.revision === after.revision,
  );

  await toolStep(
    "an extra key is rejected by the runtime contract",
    "describe_stack",
    { unexpected: true },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "invalid-argument" && before.revision === after.revision,
  );

  await toolStep(
    "an unknown answer id is rejected without a state change",
    "read_answer",
    { answerId: "ans-not-on-stack" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "unknown-answer" && before.revision === after.revision,
  );

  await toolStep(
    "an unknown rubric line id is rejected before arithmetic",
    "propose_marks",
    { findings: [{ answerId: "ans-01", foundLineIds: ["rubric-not-present"] }], expectedRevision: 1, operationId: "recovery-unknown-rubric" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "invalid-argument" && before.revision === after.revision,
  );

  await toolStep(
    "duplicate answer findings are rejected as one malformed batch",
    "propose_marks",
    { findings: [{ answerId: "ans-01", foundLineIds: [] }, { answerId: "ans-01", foundLineIds: [] }], expectedRevision: 1, operationId: "recovery-duplicate-answer" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "invalid-argument" && before.revision === after.revision,
  );

  await toolStep(
    "an oversized finding batch is refused before the reducer",
    "propose_marks",
    {
      findings: Array.from({ length: 15 }, (_, index) => ({ answerId: `ans-${String(index + 1).padStart(2, "0")}`, foundLineIds: [] })),
      expectedRevision: 1,
      operationId: "recovery-oversized",
    },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "invalid-argument" && before.revision === after.revision,
  );

  const proposed = await toolStep(
    "a valid bounded proposal changes the shared page state",
    "propose_marks",
    { findings: DEMO_FINDINGS, expectedRevision: described.after.revision, operationId: "recovery-proposal-v1" },
    (result, before, after) => result.status === "Completed" && result.payload?.receipt?.action === "propose_marks" && after.revision === before.revision + 1 && after.marked > 0 && after.held > 0,
  );

  await toolStep(
    "the client reads the resulting holds before retrying",
    "list_held_answers",
    {},
    (result, before, after) => result.status === "Completed" && result.payload?.heldCount === after.held && after.revision === before.revision,
  );

  const care = await toolStep(
    "a stricter page setting advances the revision",
    "set_marking_emphasis",
    { emphasis: "cautious", expectedRevision: proposed.after.revision, operationId: "recovery-care" },
    (result, before, after) => result.status === "Completed" && result.payload?.receipt?.action === "set_marking_emphasis" && after.revision === before.revision + 1 && after.held >= before.held,
  );

  await toolStep(
    "the old proposal is refused as stale and does not overwrite the page",
    "propose_marks",
    { findings: [{ answerId: "ans-02", foundLineIds: lineIds }], expectedRevision: proposed.after.revision, operationId: "recovery-stale-proposal" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "stale-revision" && before.revision === after.revision,
  );

  await toolStep(
    "replaying an accepted operation id is refused at the current revision",
    "set_marking_emphasis",
    { emphasis: "cautious", expectedRevision: care.after.revision, operationId: "recovery-care" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "duplicate-operation" && before.revision === after.revision,
  );

  await toolStep(
    "the client rereads the current revision after refusal",
    "describe_stack",
    {},
    (result, before, after) => result.status === "Completed" && result.payload?.revision === before.revision && before.revision === after.revision,
  );

  const retry = await toolStep(
    "a new proposal with the current revision recovers safely",
    "propose_marks",
    { findings: [{ answerId: "ans-02", foundLineIds: ["l-conductor", "l-heat-flow"] }], expectedRevision: care.after.revision, operationId: "recovery-proposal-v2" },
    (result, before, after) => result.status === "Completed" && result.payload?.receipt?.action === "propose_marks" && after.revision === before.revision + 1,
  );

  await toolStep(
    "the agent can stage a release but receives no answer ids",
    "request_release",
    { expectedRevision: retry.after.revision, operationId: "recovery-stage-v1" },
    (result, before, after) => result.status === "Completed" && result.payload?.awaitingHuman === true && result.payload?.receipt?.answerIds?.length === 0 && after.staged === true && after.revision === before.revision + 1,
  );

  await toolStep(
    "a second pending release request is refused without replacing the first",
    "request_release",
    { expectedRevision: retry.after.revision + 1, operationId: "recovery-stage-duplicate" },
    (result, before, after) => result.payload?.refused === true && result.payload?.code === "release-already-staged" && before.revision === after.revision && after.staged === true,
  );

  const beforeDecline = await cdp.evaluate(STATE);
  const clickedDecline = await cdp.evaluate('const button = document.querySelector(".bar__mid .btn"); if (!button) return false; button.click(); return true;');
  await settle();
  const afterDecline = await cdp.evaluate(STATE);
  check("a human decline clears the stage and records a page receipt", clickedDecline && !afterDecline.staged && afterDecline.revision === beforeDecline.revision + 1 && afterDecline.timelineActions.some((action) => /declined by human/i.test(action)), JSON.stringify({ revision: `${beforeDecline.revision}→${afterDecline.revision}`, timeline: afterDecline.timelineActions.at(-1) }));
  trace.push({ step: "human declines the staged release", actor: "human-ui", tool: null, input: null, revisionBefore: beforeDecline.revision, revisionAfter: afterDecline.revision, result: { action: "human_release_declined", released: false }, pageBefore: safeState(beforeDecline), pageAfter: safeState(afterDecline) });

  const beforeReload = await cdp.evaluate(STATE);
  await cdp.command("Page.reload", { ignoreCache: true });
  await waitFor("the page to recover after reload", () => cdp.evaluate('return document.querySelector(".app__cols") !== null;'));
  await settle();
  frameId = registry(cdp.events)[0]?.frameId ?? frameId;
  const afterReload = await cdp.evaluate(STATE);
  check("reload returns the ordinary fallback to a clean synthetic session", afterReload.revision === 1 && afterReload.marked === 0 && afterReload.staged === false, JSON.stringify({ before: safeState(beforeReload), after: safeState(afterReload), persistence: "not in scope" }));
  trace.push({ step: "reload and recover", actor: "browser-lifecycle", tool: null, input: { ignoreCache: true }, revisionBefore: beforeReload.revision, revisionAfter: afterReload.revision, result: { resetToCleanSession: true, persistence: "not in scope" }, pageBefore: safeState(beforeReload), pageAfter: safeState(afterReload) });

  const reread = await toolStep(
    "after reload the client rereads the new session before restaging",
    "describe_stack",
    {},
    (result, before, after) => result.status === "Completed" && result.payload?.revision === 1 && before.revision === after.revision,
  );

  const finalProposal = await toolStep(
    "the recovered session accepts a fresh bounded proposal",
    "propose_marks",
    { findings: [{ answerId: "ans-01", foundLineIds: lineIds }], expectedRevision: reread.after.revision, operationId: "recovery-final-proposal" },
    (result, before, after) => result.status === "Completed" && result.payload?.receipt?.action === "propose_marks" && after.revision === before.revision + 1,
  );

  await toolStep(
    "the recovered session stages release again",
    "request_release",
    { expectedRevision: finalProposal.after.revision, operationId: "recovery-stage-v2" },
    (result, before, after) => result.status === "Completed" && result.payload?.awaitingHuman === true && after.staged === true && after.revision === before.revision + 1,
  );

  const beforeConfirm = await cdp.evaluate(STATE);
  const clickedConfirm = await cdp.evaluate('const button = document.querySelector(".btn--send"); if (!button) return false; button.click(); return true;');
  await settle();
  const afterConfirm = await cdp.evaluate(STATE);
  check("a human confirm is the only final release action and leaves a receipt", clickedConfirm && !afterConfirm.staged && afterConfirm.revision === beforeConfirm.revision + 1 && afterConfirm.timelineActions.some((action) => /confirmed by human/i.test(action)) && afterConfirm.timelineRevisions.at(-1) === afterConfirm.revision, JSON.stringify({ revision: `${beforeConfirm.revision}→${afterConfirm.revision}`, timeline: afterConfirm.timelineActions.at(-1) }));
  trace.push({ step: "human confirms the staged release", actor: "human-ui", tool: null, input: null, revisionBefore: beforeConfirm.revision, revisionAfter: afterConfirm.revision, result: { action: "human_release_confirmed", released: true }, pageBefore: safeState(beforeConfirm), pageAfter: safeState(afterConfirm) });

  const finalRead = await toolStep(
    "the final reread shows the confirmed release as settled",
    "describe_stack",
    {},
    (result, before, after) => result.status === "Completed" && result.payload?.releasedCount === 1 && result.payload?.releaseRequested === false && before.revision === after.revision,
  );

  const failed = checks.filter((entry) => !entry.passed);
  const report = {
    status: failed.length === 0 ? "VERIFIED_RUN" : "FAILED_RUN",
    evidenceClass: "VERIFIED_ARTIFACT",
    scope: "local production build with deterministic CDP client; not hosted and not model-selected",
    ranAt: new Date().toISOString(),
    evidence: evidenceMeta(PACKAGE, { browserFlags: BROWSER_FLAGS }),
    browser: version.product,
    protocol: version.protocolVersion,
    url,
    registeredTools: registered.map((tool) => ({ name: tool.name, hasInputSchema: Boolean(tool.inputSchema), annotations: tool.annotations ?? null })),
    checks,
    passed: checks.length - failed.length,
    failed: failed.length,
    trace,
    final: {
      state: safeState(afterConfirm),
      describeStack: resultSummary(finalRead.result),
      noModel: true,
      noHostedUrl: true,
      humanActionsUsedPageUi: true,
    },
    notClaimed: [
      "This is not a natural-language model replay.",
      "This is not hosted evidence; the URL is loopback-only.",
      "Reload intentionally starts a new in-memory synthetic session because persistence is outside scope.",
      "No answer body, rubric point value, pass boundary, credential, or personal data is stored in this artifact.",
      "Unexpected tool exception is covered by the source/contract test; this browser journey does not force a transport exception.",
    ],
  };

  mkdirSync(EVIDENCE, { recursive: true });
  const file = join(EVIDENCE, "failure-recovery.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed} passed, ${report.failed} failed → ${file}`);
  if (failed.length > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(`\nbroke off: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
} finally {
  runCleanups();
}
