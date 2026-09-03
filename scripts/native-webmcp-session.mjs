#!/usr/bin/env node
/**
 * A scripted session across all nine tools, over the MCP wire rather than over CDP.
 *
 * `scripts/webmcp-invoke.mjs` already proves the agent-side path by speaking Chromium's WebMCP
 * domain directly. This file proves the layer a client actually meets: it spawns
 * `scripts/mcp-bridge.mjs`, speaks newline-delimited JSON-RPC to it the way an MCP host does, and
 * walks a marking session end to end. What that establishes is the transport and the page's guards
 * under a real client protocol, nothing more.
 *
 * Every tool name and every argument below was written by hand. No model took part, no
 * natural-language instruction was issued, and `chosenBy` in the artifact says `script` for that
 * reason. The model half of this claim lives in `scripts/nl-replay.mjs` and nowhere else; if this
 * file's output is ever read as evidence that a model chose a tool, it is being read wrong.
 *
 * One thing here is not a transport check. `propose_marks` takes findings from its caller, and the
 * findings this file sends were composed here, not read out of `src/data/fixtures.ts`. The page
 * scores them itself and decides on its own what to hold back. That is the difference between the
 * demo shortcut and a result built from data the page never had, and the artifact records both the
 * findings sent and the fact that they differ from `DEMO_FINDINGS`.
 *
 * Usage, from inside `submissions/withheld` with a build served at --url:
 *   node scripts/native-webmcp-session.mjs --url http://127.0.0.1:4197/ --cdp-port 9565
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIDGE = resolve(HERE, "mcp-bridge.mjs");
const PACKAGE = resolve(HERE, "..");

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const PAGE_URL = arg("url", "http://127.0.0.1:4197/");
const CDP_PORT = arg("cdp-port", "9565");
const OUT = resolve(PACKAGE, arg("out", "docs/evidence-staging/native-mcp-session.json"));
const CHROMIUM = process.env.WITHHELD_CHROMIUM ?? "/usr/bin/chromium";
const LOG = `/tmp/withheld-native-${process.pid}.jsonl`;
const PROTOCOL = "2025-06-18";

const TOOL_NAMES = [
  "describe_stack",
  "explain_mark",
  "list_held_answers",
  "preview_unattended_outcome",
  "propose_marks",
  "read_answer",
  "read_rubric",
  "request_release",
  "set_marking_emphasis",
];

/**
 * A marker's read of this stack, composed here rather than imported.
 *
 * `src/data/fixtures.ts` exports `DEMO_FINDINGS` for the page's own demo button. These are
 * deliberately not those: several answers are read differently, and two answers the demo reports
 * nothing for are reported here. The point is that the page's marks come out of whatever a caller
 * sends, so what arrives through the tool is what gets scored.
 *
 * Line ids come from `read_rubric` at runtime, and the run refuses to continue if any id below is
 * not in the rubric the page returned — a hardcoded id that has been renamed would otherwise turn
 * this whole batch into an `invalid-argument` for a reason that looks like a page bug.
 */
const CALLER_FINDINGS = [
  { answerId: "ans-01", foundLineIds: ["l-same-temp", "l-conductor", "l-heat-flow"] },
  { answerId: "ans-02", foundLineIds: ["l-conductor", "l-rate"] },
  { answerId: "ans-03", foundLineIds: ["l-heat-flow"] },
  { answerId: "ans-04", foundLineIds: ["l-conductor", "l-heat-flow", "l-rate"] },
  { answerId: "ans-05", foundLineIds: ["l-same-temp"] },
  { answerId: "ans-06", foundLineIds: ["l-same-temp", "l-conductor"] },
  { answerId: "ans-07", foundLineIds: ["l-rate", "l-heat-flow"] },
  { answerId: "ans-08", foundLineIds: ["l-conductor", "l-same-temp"] },
  { answerId: "ans-09", foundLineIds: ["l-rate"] },
  { answerId: "ans-10", foundLineIds: [] },
  { answerId: "ans-11", foundLineIds: ["l-same-temp", "l-conductor", "l-heat-flow", "l-rate"] },
  { answerId: "ans-12", foundLineIds: ["l-conductor"] },
  { answerId: "ans-13", foundLineIds: ["l-heat-flow", "l-rate"] },
  { answerId: "ans-14", foundLineIds: ["l-same-temp", "l-rate"] },
];

// ---------------------------------------------------------------------------- checks

const checks = [];

/** One labelled expected-versus-actual comparison. The label has to name what earned the result. */
function check(label, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  checks.push({ label, ok, expected, actual });
  if (ok) {
    console.log(`ok   ${label}`);
  } else {
    console.log(`FAIL ${label}`);
    console.log(`       expected ${JSON.stringify(expected)}`);
    console.log(`       actual   ${JSON.stringify(actual)}`);
  }
  return ok;
}

// ---------------------------------------------------------------------------- the wire

let bridge = null;
let nextId = 0;
const pending = new Map();
const stderrLines = [];

/** Newline-delimited JSON-RPC, the same framing an MCP host uses. */
function connect() {
  bridge = spawn(process.execPath, [BRIDGE], {
    cwd: PACKAGE,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      WITHHELD_URL: PAGE_URL,
      WITHHELD_CDP_PORT: CDP_PORT,
      WITHHELD_BRIDGE_LOG: LOG,
      WITHHELD_CHROMIUM: CHROMIUM,
    },
  });

  createInterface({ input: bridge.stdout }).on("line", (line) => {
    let message;
    // A half-flushed line is not a protocol error and must not end the run.
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.id === undefined || !pending.has(message.id)) return;
    const settle = pending.get(message.id);
    pending.delete(message.id);
    settle(message);
  });

  createInterface({ input: bridge.stderr }).on("line", (line) => {
    stderrLines.push(line);
    if (process.env.WITHHELD_VERBOSE) console.error(`  [bridge] ${line}`);
  });

  bridge.on("exit", (code, signal) => {
    for (const settle of pending.values()) {
      settle({ error: { code: -1, message: `bridge exited (${signal ?? code})` } });
    }
    pending.clear();
  });
}

function rpc(method, params) {
  return new Promise((settle) => {
    const id = ++nextId;
    pending.set(id, settle);
    bridge.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

const calls = [];

/**
 * One tool call, recorded.
 *
 * `src/tools/webmcp.ts` answers in MCP shape already — `content[0].text` and `structuredContent`
 * carry the same object — and the bridge passes both through. `structuredContent` is preferred here
 * because it needs no parse; the text is the fallback for a client that only ever sees content.
 * A refusal is a payload with `refused: true` and a code, delivered as a normal result with
 * `isError` set, so it is read here rather than thrown.
 */
async function call(tool, args = {}) {
  const message = await rpc("tools/call", { name: tool, arguments: args });
  if (message.error) {
    throw new Error(`${tool} failed at the transport: ${message.error.message}`);
  }
  const result = message.result ?? {};
  let payload = result.structuredContent;
  if (payload === undefined) {
    const text = result.content?.[0]?.text;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text ?? null };
    }
  }
  const record = {
    order: calls.length + 1,
    tool,
    arguments: args,
    isError: result.isError === true,
    refused: payload?.refused === true,
    code: payload?.code ?? null,
    payload,
  };
  calls.push(record);
  return record;
}

/** Each write needs an operationId nothing has used before: a reused one is refused first of all. */
let operations = 0;
const nextOperationId = (why) => `native-${why}-${++operations}`;

// ---------------------------------------------------------------------------- the session

async function main() {
  connect();

  const handshakeAt = Date.now();
  const hello = await rpc("initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "native-webmcp-session", version: "1" },
  });
  const handshakeMs = Date.now() - handshakeAt;
  check("initialize echoes the protocol version the client asked for", PROTOCOL, hello.result?.protocolVersion);
  check("the server declares that its tool list can change", true, hello.result?.capabilities?.tools?.listChanged);

  const listed = await rpc("tools/list", {});
  const tools = listed.result?.tools ?? [];
  const names = tools.map((tool) => tool.name).sort();
  check("the page registered nine tools and the bridge lists all nine", TOOL_NAMES, names);
  check(
    "every listed tool carries a description and an input schema",
    { described: 9, schemas: 9 },
    {
      described: tools.filter((tool) => typeof tool.description === "string" && tool.description.length > 0).length,
      schemas: tools.filter((tool) => tool.inputSchema && typeof tool.inputSchema === "object").length,
    },
  );

  // 1. Read the stack. Everything below takes its ids and its revision from here, never from a
  //    constant, so a fixture change cannot leave this file asserting against something stale.
  const stack = await call("describe_stack");
  check("describe_stack answers without refusing", { refused: false, isError: false }, { refused: stack.refused, isError: stack.isError });
  const answerIds = (stack.payload.answers ?? []).map((answer) => answer.id);
  check(
    "the stack reports fourteen answers and none of them marked yet",
    { answerCount: 14, listed: 14, markedCount: 0 },
    { answerCount: stack.payload.answerCount, listed: answerIds.length, markedCount: stack.payload.markedCount },
  );
  check(
    "no mark, point value or pass boundary appears in the stack payload",
    { points: false, passBoundary: false },
    {
      points: JSON.stringify(stack.payload).includes("\"points\""),
      passBoundary: JSON.stringify(stack.payload).includes("passBoundary"),
    },
  );

  // 2. The rubric, redacted. The ids in CALLER_FINDINGS are checked against it rather than trusted,
  //    because a renamed line would otherwise come back as invalid-argument and read like a page bug.
  const rubric = await call("read_rubric");
  const lineIds = (rubric.payload.rubric?.lines ?? []).map((line) => line.id);
  check(
    "read_rubric returns the line ids an agent may report, with no point value attached",
    { lines: rubric.payload.rubricLineCount, points: false },
    { lines: lineIds.length, points: JSON.stringify(rubric.payload).includes("\"points\"") },
  );
  const unknownLineIds = [...new Set(CALLER_FINDINGS.flatMap((finding) => finding.foundLineIds))]
    .filter((id) => !lineIds.includes(id));
  check("every rubric line this run intends to report exists in the rubric the page returned", [], unknownLineIds);

  // 3. One answer in full, then an id the stack does not have.
  const firstId = answerIds[0];
  const answer = await call("read_answer", { answerId: firstId });
  check(
    "read_answer returns that student's own writing and the state the page holds it in",
    { id: firstId, hasBody: true, state: "awaiting-marks" },
    {
      id: answer.payload.answer?.id,
      hasBody: typeof answer.payload.answer?.body === "string" && answer.payload.answer.body.length > 0,
      state: answer.payload.answer?.state,
    },
  );

  const missing = await call("read_answer", { answerId: "ans-99" });
  check(
    "read_answer on an id the stack does not have is refused unknown-answer, as a readable result",
    { code: "unknown-answer", isError: true },
    { code: missing.code, isError: missing.isError },
  );

  // 4. An argument the closed schema does not allow. The runtime repeats the schema check rather
  //    than coercing, so this is a refusal from the page and not a validation error in the bridge.
  const extra = await call("describe_stack", { unexpected: 1 });
  check(
    "an argument outside the closed schema is refused invalid-argument by the page itself",
    { code: "invalid-argument", isError: true },
    { code: extra.code, isError: extra.isError },
  );

  // 5. Counts only, before anything is marked.
  const before = await call("preview_unattended_outcome");
  check("preview_unattended_outcome answers in counts and refuses nothing", false, before.refused);

  // 6. Two refusals on the write path, both before anything has been accepted, so neither can be
  //    explained away by a guard that only exists after a commit.
  //
  //    The order of guards in `proposeMarks` is duplicate-operation, then stale-revision, then
  //    unknown-answer. Each test below therefore has to be clean on every guard ahead of the one it
  //    is actually testing: a fresh operationId for the stale-revision test, and the board's real
  //    revision for the unknown-answer test. Get that wrong and the check passes for another
  //    reason entirely while its label goes on claiming this one.
  const revisionBefore = stack.payload.revision;
  const stale = await call("propose_marks", {
    findings: CALLER_FINDINGS.slice(0, 2),
    expectedRevision: revisionBefore + 1,
    operationId: nextOperationId("stale"),
  });
  check(
    "propose_marks quoting a revision the board is not at is refused stale-revision",
    { code: "stale-revision", isError: true },
    { code: stale.code, isError: stale.isError },
  );

  const unknown = await call("propose_marks", {
    findings: [...CALLER_FINDINGS.slice(0, 2), { answerId: "ans-99", foundLineIds: [lineIds[0]] }],
    expectedRevision: revisionBefore,
    operationId: nextOperationId("unknown"),
  });
  check(
    "one unknown answer id refuses the whole batch as unknown-answer",
    { code: "unknown-answer", isError: true },
    { code: unknown.code, isError: unknown.isError },
  );

  const afterRefusals = await call("describe_stack");
  check(
    "neither refused batch landed even in part: the revision has not moved and nothing is marked",
    { revision: revisionBefore, markedCount: 0 },
    { revision: afterRefusals.payload.revision, markedCount: afterRefusals.payload.markedCount },
  );

  // 7. The accepted write, carrying findings composed in this file. This is the step that makes the
  //    page's marks a function of data that arrived through the tool surface rather than of the
  //    fixture behind the demo button.
  const acceptedOperationId = nextOperationId("marks");
  const accepted = await call("propose_marks", {
    findings: CALLER_FINDINGS,
    expectedRevision: revisionBefore,
    operationId: acceptedOperationId,
  });
  check(
    "propose_marks with caller-supplied findings is accepted and returns a receipt",
    { refused: false, isError: false, action: "propose_marks", revision: revisionBefore + 1 },
    {
      refused: accepted.refused,
      isError: accepted.isError,
      action: accepted.payload.receipt?.action,
      revision: accepted.payload.revision,
    },
  );
  check(
    "the receipt echoes only the answers this caller named",
    CALLER_FINDINGS.map((finding) => finding.answerId),
    accepted.payload.receipt?.answerIds,
  );

  const duplicate = await call("propose_marks", {
    findings: CALLER_FINDINGS,
    expectedRevision: accepted.payload.revision,
    operationId: acceptedOperationId,
  });
  check(
    "replaying an operationId the page has already seen is refused duplicate-operation",
    { code: "duplicate-operation", isError: true },
    { code: duplicate.code, isError: duplicate.isError },
  );

  const marked = await call("describe_stack");
  const states = {};
  for (const entry of marked.payload.answers ?? []) {
    states[entry.state] = (states[entry.state] ?? 0) + 1;
  }
  check(
    "the revision moved exactly once and nothing is still awaiting marks",
    { revision: revisionBefore + 1, awaiting: undefined },
    { revision: marked.payload.revision, awaiting: states["awaiting-marks"] },
  );
  check(
    "markedCount agrees with the per-answer states, and the fourteen answers are all accounted for",
    { agrees: true, total: 14 },
    {
      agrees: marked.payload.markedCount === (states.marked ?? 0),
      total: Object.values(states).reduce((sum, count) => sum + count, 0),
    },
  );
  // The caller reported every rubric line for ans-11. The page marked it nothing and quarantined it
  // instead, which is a decision the page made about the caller's report rather than one the caller
  // could ask for. Asserting "at least one" rather than a name keeps this honest if the fixture moves.
  check(
    "the page quarantined at least one answer on its own reading, and gave it no mark",
    true,
    (states.quarantined ?? 0) >= 1,
  );
  check(
    "the page still returns no mark, no point value and no pass boundary after marking",
    { points: false, passBoundary: false },
    {
      points: JSON.stringify(marked.payload).includes("\"points\""),
      passBoundary: JSON.stringify(marked.payload).includes("passBoundary"),
    },
  );

  // 8. What the page accepted for one answer, and what it is holding back overall.
  const markedId = (marked.payload.answers ?? []).find((entry) => entry.state === "marked")?.id;
  const explained = await call("explain_mark", { answerId: markedId });
  check(
    "explain_mark names the rubric ideas the page accepted and the ones it did not see, with no total",
    { refused: false, hasExplanation: true, total: false },
    {
      refused: explained.refused,
      hasExplanation: explained.payload.explanation !== undefined,
      total: JSON.stringify(explained.payload).includes("\"total\""),
    },
  );

  const held = await call("list_held_answers");
  check(
    "list_held_answers names no more holds than it counts, which is the gap the page keeps on purpose",
    true,
    (held.payload.namedHolds ?? []).length <= held.payload.heldCount,
  );

  // 9. The release. `request_release` runs before the emphasis is raised, because raising it can
  //    leave nothing releasable and the refusal would then be nothing-to-release — a true refusal
  //    with the wrong label on it.
  let revision = marked.payload.revision;
  const release = await call("request_release", {
    expectedRevision: revision,
    operationId: nextOperationId("release"),
  });
  check(
    "request_release records a request and says in the payload that a person still has to act",
    { refused: false, action: "request_release", awaitingHuman: true },
    { refused: release.refused, action: release.payload.receipt?.action, awaitingHuman: release.payload.awaitingHuman },
  );
  check(
    "the receipt does not name which answers would go out, only how many are releasable",
    { named: [], counted: typeof release.payload.releasableCount === "number" },
    { named: release.payload.receipt?.answerIds, counted: typeof release.payload.releasableCount === "number" },
  );
  revision = release.payload.revision;

  const twice = await call("request_release", {
    expectedRevision: revision,
    operationId: nextOperationId("release-again"),
  });
  check(
    "a second release request, with a fresh operation id and the current revision, is refused release-already-staged",
    { code: "release-already-staged", isError: true },
    { code: twice.code, isError: twice.isError },
  );

  // 10. Emphasis moves one way only.
  const raised = await call("set_marking_emphasis", {
    emphasis: "most-cautious",
    expectedRevision: revision,
    operationId: nextOperationId("raise"),
  });
  check(
    "set_marking_emphasis accepts a level above the current one and reports the level it moved to",
    { refused: false, emphasis: "most-cautious", action: "set_marking_emphasis" },
    { refused: raised.refused, emphasis: raised.payload.emphasis, action: raised.payload.receipt?.action },
  );
  revision = raised.payload.revision;

  const lowered = await call("set_marking_emphasis", {
    emphasis: "standard",
    expectedRevision: revision,
    operationId: nextOperationId("lower"),
  });
  check(
    "lowering the emphasis is refused emphasis-cannot-be-lowered, so no setting here releases more than the page would",
    { code: "emphasis-cannot-be-lowered", isError: true },
    { code: lowered.code, isError: lowered.isError },
  );

  // 11. The reservation, asserted against the registry rather than against the prose. `confirmRelease`
  //     exists in src/domain/session.ts and is not exported to the tool layer: there is no ninth-and-a-half
  //     tool, and the nine that exist contain no confirm of any kind.
  check(
    "no tool in the registry can confirm a release; the only release tool is the one that asks",
    ["request_release"],
    names.filter((name) => name.includes("release") || name.includes("confirm")),
  );

  return { handshakeMs, tools, stack: stack.payload, rubricLineIds: lineIds };
}

// ---------------------------------------------------------------------------- the artifact

/**
 * `DEMO_FINDINGS`, read out of the source rather than imported, because this is an .mjs file and
 * that is a TypeScript module. The comparison it feeds is the point of the exercise: if the
 * findings this run sent were the demo's, the marks would prove nothing about data arriving from
 * outside the page.
 */
function demoFindings() {
  const source = readFileSync(resolve(PACKAGE, "src/data/fixtures.ts"), "utf8");
  const block = source.match(/DEMO_FINDINGS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) return null;
  const entries = [...block[1].matchAll(/answerId:\s*"([^"]+)",\s*foundLineIds:\s*\[([^\]]*)\]/g)];
  return entries.map((entry) => ({
    answerId: entry[1],
    foundLineIds: [...entry[2].matchAll(/"([^"]+)"/g)].map((id) => id[1]),
  }));
}

function shutdown() {
  try {
    bridge?.stdin?.end();
  } catch {
    /* already closed */
  }
  try {
    bridge?.kill("SIGKILL");
  } catch {
    /* already gone */
  }
}

const startedAt = new Date().toISOString();
let session = null;
let failure = null;

try {
  session = await main();
} catch (error) {
  failure = String(error?.stack ?? error?.message ?? error);
  console.log(`FAIL the run stopped early: ${failure.split("\n")[0]}`);
} finally {
  shutdown();
}

const passed = checks.filter((entry) => entry.ok).length;
const demo = demoFindings();
const refusals = calls.filter((entry) => entry.refused).map((entry) => ({
  order: entry.order,
  tool: entry.tool,
  code: entry.code,
  message: entry.payload?.message ?? null,
}));

const artifact = {
  artifact: "native-mcp-session",
  project: "withheld",
  status: failure === null && passed === checks.length ? "PASS" : "FAIL",
  classification: "VERIFIED_RUN",
  chosenBy: "script — every tool name and every argument in scripts/native-webmcp-session.mjs was written by hand",
  ranAt: startedAt,
  finishedAt: new Date().toISOString(),
  transport: {
    protocol: "MCP over newline-delimited JSON-RPC 2.0 on stdin/stdout",
    protocolVersion: PROTOCOL,
    bridge: "scripts/mcp-bridge.mjs",
    bridgeSha256: createHash("sha256").update(readFileSync(BRIDGE)).digest("hex"),
    handshakeMs: session?.handshakeMs ?? null,
  },
  browser: {
    binary: CHROMIUM,
    flags: [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--enable-experimental-web-platform-features",
      "--enable-features=WebMCPTesting",
    ],
    note: "Without --enable-features=WebMCPTesting the WebMCP registry is empty and no tool is reachable.",
  },
  page: { url: PAGE_URL },
  registry: {
    count: session?.tools?.length ?? null,
    names: (session?.tools ?? []).map((tool) => tool.name),
  },
  callerSuppliedFindings: {
    what: "The findings propose_marks carried were composed in this file, not read from src/data/fixtures.ts.",
    sent: CALLER_FINDINGS,
    demoFindingsFromSource: demo,
    identicalToDemo: demo === null ? null : JSON.stringify(demo) === JSON.stringify(CALLER_FINDINGS),
    whyItMatters:
      "propose_marks scores whatever its caller sends. The page's marks after this run are a "
      + "function of data that reached it through the tool surface, which is what separates a "
      + "result from the demo button's replay of its own fixture.",
  },
  calls,
  refusals,
  checks,
  totals: { checks: checks.length, passed, failed: checks.length - passed, toolCalls: calls.length },
  failure,
  bridgeStderrTail: stderrLines.slice(-12),
  notClaimed: [
    "No model took part. Every tool name and every argument was written by hand in this file, and chosenBy says so.",
    "No natural-language instruction was issued. Nothing here shows a model choosing a tool; that claim lives only in scripts/nl-replay.mjs.",
    "This is headless Chromium on one Linux machine behind an experimental flag. It says nothing about ChatGPT's in-app browser or any shipped host.",
    "It does not show that the marks are pedagogically correct. It shows that the page accepted a caller's report, scored it itself, and held back what it decided to hold back.",
    "One run is not a determinism claim, and the run mutates page state, so a second run against the same live session would refuse differently.",
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);

console.log(`\n${passed}/${checks.length} checks, ${calls.length} tool calls, ${refusals.length} refusals`);
console.log(`refusal codes: ${refusals.map((entry) => entry.code).join(", ") || "none"}`);
console.log(`artifact: ${OUT}`);
process.exit(failure === null && passed === checks.length ? 0 : 1);
