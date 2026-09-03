#!/usr/bin/env node
/**
 * A model, given an outcome and never a tool name, choosing this page's tools for itself.
 *
 * Everything else in `scripts/` proves the mechanism. `webmcp-invoke.mjs` dispatches over CDP and
 * `native-webmcp-session.mjs` dispatches over the MCP wire, and both knew every tool name, every
 * argument and every revision before they started. Neither shows a model deciding anything. This
 * file is the only place that claim is made, and it is made the narrow way: a real client CLI is
 * handed a goal in plain language, the nine tools of this page are the only tools it has, and what
 * it chose is read back out of the bridge's own transcript rather than out of its prose.
 *
 * The prompts below name no tool, no parameter and no internal id, and the run asserts that rather
 * than promising it. What the model does with a goal is its own; this file only records it.
 *
 * Two honest limits are built into the shape of the thing. Each CLI invocation spawns its own MCP
 * server, so each turn gets a fresh browser and a page back at its first revision: the model's
 * memory can carry across turns through --resume, the page's state cannot. And a turn that chose
 * nothing is recorded as having chosen nothing.
 *
 * Usage, from inside `submissions/withheld` with a build served at --url:
 *   node scripts/nl-replay.mjs --url http://127.0.0.1:4197/ --cdp-port 9600
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIDGE = resolve(HERE, "mcp-bridge.mjs");
const PACKAGE = resolve(HERE, "..");

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const PAGE_URL = arg("url", "http://127.0.0.1:4197/");
/**
 * Each attempt gets its own port, `BASE_PORT + n`, so a browser the previous attempt left holding a
 * port cannot swallow the next one. Six attempts at most (three turns, one retry each), so the base
 * is set clear of anything else here: 9565 is the native session's, and 9571/9572 belong to the
 * Terra and Sol profiles in `scripts/mcp-configs/`.
 */
const BASE_PORT = Number(arg("cdp-port", "9600"));
const OUT = resolve(PACKAGE, arg("out", "docs/evidence-staging/nl-replay.json"));
const MODEL = arg("model", "claude-opus-5");
const CLI = arg("cli", "claude");
const BUDGET = arg("budget", "4");
const TIMEOUT_MS = Number(arg("timeout", "420")) * 1000;
const CHROMIUM = process.env.WITHHELD_CHROMIUM ?? "/usr/bin/chromium";

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

const ALLOWED = TOOL_NAMES.map((name) => `mcp__withheld__${name}`);

/**
 * The built-ins are denied by name, one at a time.
 *
 * `--tools ""` looks like the way to do this and is not: on claude CLI 2.1.220 it empties the whole
 * tool set, the MCP tools with it, and the model then answers the goal out of its own context
 * without a single call. That failure was observed and cost a run. Denying the built-ins by name
 * leaves the nine WebMCP tools standing, which is the point: with no shell, no file read and no
 * search, the only way the model can learn anything about this page is to call it.
 */
const DENIED = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
];

/**
 * Three goals, in the order a person marking a stack would actually reach them.
 *
 * Each asks for an outcome. None names a tool, a parameter or an internal id — the run checks that
 * below rather than taking this comment's word for it. The second is the one that matters most: it
 * asks the model to form its own read of each answer and get that read recorded, which is the only
 * route to marks that came from outside the page's own fixture.
 */
const PROMPTS = [
  "A pile of student answers to one physics question is open in front of me and I have not looked at "
    + "it yet. Before I start marking, tell me what I am dealing with: what the question asks, how "
    + "many answers are waiting, and what the marking scheme actually lets me give credit for.",
  "Now do the marking for me. Go through the answers one by one, decide for yourself which of the "
    + "marking scheme's ideas each student genuinely got across, and get your judgement into the app "
    + "so it can be scored. Then tell me which answers I have to look at myself before anything goes "
    + "back to the students, and why.",
  "Good. Put in the ask for the marks that do not need me, and then tell me plainly whether that "
    + "sends anything to the students or not.",
];

/** Does this prompt hand the model a name it should have had to find? Computed, not asserted. */
function namesATool(prompt) {
  const text = prompt.toLowerCase();
  const spaced = TOOL_NAMES.map((name) => name.replace(/_/g, " "));
  return [...TOOL_NAMES, ...spaced].filter((name) => text.includes(name));
}

// ---------------------------------------------------------------------------- the scratch client

/**
 * The CLI runs from a temporary directory, not from this package.
 *
 * A client started inside the repository loads the project's CLAUDE.md and can answer a question
 * about the page from the source tree instead of from the page. That happened once: the model
 * described state it had read out of the repo and called nothing. Out here there is no CLAUDE.md,
 * no git, and with the built-ins denied there is no way to reach any of it.
 */
const WORK = mkdtempSync(join(tmpdir(), "withheld-nl-"));

/**
 * One MCP config and one transcript per attempt, on a port of its own.
 *
 * `slot` only picks the debugging port; `label` only names the files. They are separate because a
 * retry is a second attempt at the same turn, and giving it the first attempt's port would put it
 * behind whatever Chromium the first attempt left holding that port.
 */
function configFor(slot, label) {
  const log = join(WORK, `bridge-turn-${label}.jsonl`);
  const file = join(WORK, `mcp-turn-${label}.json`);
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        mcpServers: {
          withheld: {
            command: process.execPath,
            args: [BRIDGE],
            env: {
              WITHHELD_URL: PAGE_URL,
              WITHHELD_CDP_PORT: String(BASE_PORT + slot),
              WITHHELD_BRIDGE_LOG: log,
              WITHHELD_CHROMIUM: CHROMIUM,
            },
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return { file, log, port: BASE_PORT + slot };
}

/**
 * What the model actually chose, read from the bridge's transcript.
 *
 * Not from the model's own account of itself. A model that says it read the marking scheme and left
 * no call in this log did not read it, and the log is what the artifact reports. One log per turn
 * rather than one shared file: nothing else is appending to it by the time it is read, so there is
 * no partially flushed last line to guess at — though the parse is guarded anyway, because the
 * bridge is killed at the end of a turn and a kill can land mid-write.
 */
function choicesFrom(log) {
  let text = "";
  try {
    text = readFileSync(log, "utf8");
  } catch {
    return [];
  }
  const chosen = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record?.direction !== "choice") continue;
    const body = record.body ?? {};
    chosen.push({
      at: record.at ?? null,
      tool: body.tool ?? null,
      arguments: body.arguments ?? null,
      ok: body.ok ?? null,
      code: body.code ?? null,
      ms: body.ms ?? null,
      summary: body.summary ?? null,
    });
  }
  return chosen;
}

function runCli(prompt, cfg, resumeId) {
  const args = [
    "--print",
    prompt,
    "--mcp-config",
    cfg.file,
    "--strict-mcp-config",
    "--allowedTools",
    ...ALLOWED,
    "--disallowedTools",
    ...DENIED,
    "--permission-mode",
    "dontAsk",
    "--model",
    MODEL,
    "--output-format",
    "json",
    "--max-budget-usd",
    BUDGET,
  ];
  if (resumeId) args.push("--resume", resumeId);
  return { args, spawned: spawn(CLI, args, { cwd: WORK, stdio: ["ignore", "pipe", "pipe"] }) };
}

/**
 * Run one turn to completion and never reject.
 *
 * A missing CLI, a gateway error and a model that answered without calling anything are all
 * outcomes this file has to be able to write down, so they come back as fields rather than as
 * throws. The kill on timeout is SIGKILL because the client owns a browser through the bridge and a
 * polite signal can leave it holding the debugging port.
 */
function awaitCli(prompt, cfg, resumeId) {
  return new Promise((resolvePromise) => {
    const started = Date.now();
    let settled = false;
    let out = "";
    let err = "";
    let timedOut = false;
    let spawnError = null;

    const { args, spawned } = runCli(prompt, cfg, resumeId);
    const timer = setTimeout(() => {
      timedOut = true;
      spawned.kill("SIGKILL");
    }, TIMEOUT_MS);

    const settle = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({
        args,
        exitCode: code ?? null,
        ms: Date.now() - started,
        timedOut,
        spawnError,
        stdout: out,
        stderrTail: err.split("\n").filter(Boolean).slice(-12),
      });
    };

    spawned.stdout.setEncoding("utf8");
    spawned.stderr.setEncoding("utf8");
    spawned.stdout.on("data", (chunk) => {
      out += chunk;
    });
    spawned.stderr.on("data", (chunk) => {
      err += chunk;
    });
    spawned.on("error", (error) => {
      spawnError = error?.message ?? String(error);
      settle(null);
    });
    spawned.on("close", settle);
  });
}

/** The client's `--output-format json` envelope, or null if it printed something else. */
function envelope(stdout) {
  const whole = stdout.trim();
  if (!whole) return null;
  try {
    return JSON.parse(whole);
  } catch {
    // A crash can prepend a line or two of plain text; the envelope is still in there.
  }
  for (const line of whole.split("\n").map((l) => l.trim()).filter(Boolean).reverse()) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object") return value;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Which model actually answered, not which one was asked for.
 *
 * `--model` is a request. A fallback, a downgrade or an alias resolution all end with a different
 * model doing the work, and an artifact that reports the flag instead of the fact is wrong in
 * exactly the way that matters here.
 */
function modelsThatAnswered(env) {
  const usage = env?.modelUsage;
  if (usage && typeof usage === "object") return Object.keys(usage);
  if (typeof env?.model === "string") return [env.model];
  return [];
}

const clip = (text, max = 1400) =>
  typeof text === "string" && text.length > max
    ? `${text.slice(0, max)}… [truncated, ${text.length} chars]`
    : (text ?? null);

// ------------------------------------------------------------------- did it bring its own reading?

/**
 * The demo's own findings, lifted out of the fixture as text.
 *
 * This is an .mjs file and cannot import a .ts module, so the array is read with a bracket scan and
 * a regex instead. It is only ever used for a comparison, and a failed read returns null so the
 * comparison reports "could not check" rather than a convenient "different".
 */
function demoFindings() {
  let text = "";
  try {
    text = readFileSync(resolve(PACKAGE, "src/data/fixtures.ts"), "utf8");
  } catch {
    return null;
  }
  const at = text.indexOf("DEMO_FINDINGS");
  const open = at < 0 ? -1 : text.indexOf("[", at);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "[") depth += 1;
    else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const block = text.slice(open, end + 1);
  const findings = [];
  const entry = /answerId:\s*"([^"]+)"[\s\S]*?foundLineIds:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = entry.exec(block))) {
    findings.push({
      answerId: match[1],
      foundLineIds: [...match[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
    });
  }
  return findings.length ? findings : null;
}

/** Order must not decide the comparison, so both sides are sorted the same way before matching. */
function normalizeFindings(list) {
  if (!Array.isArray(list)) return null;
  return list
    .map((f) => ({
      answerId: String(f?.answerId ?? ""),
      foundLineIds: [...(Array.isArray(f?.foundLineIds) ? f.foundLineIds : [])].map(String).sort(),
    }))
    .sort((a, b) => a.answerId.localeCompare(b.answerId));
}

// ---------------------------------------------------------------------------------- the three turns

const startedAt = new Date().toISOString();
const turns = [];
let resumeId = null;
let slot = 0;

for (let index = 0; index < PROMPTS.length; index += 1) {
  const prompt = PROMPTS[index];
  const turnNumber = index + 1;
  const attempts = [];
  let kept = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    slot += 1;
    const cfg = configFor(slot, `${turnNumber}-${attempt}`);
    const resumedFrom = resumeId;
    const run = await awaitCli(prompt, cfg, resumedFrom);
    const env = envelope(run.stdout);
    const chosen = choicesFrom(cfg.log);
    kept = {
      attempt,
      cdpPort: cfg.port,
      resumeRequested: Boolean(resumedFrom),
      resumedFrom,
      ms: run.ms,
      exitCode: run.exitCode,
      timedOut: run.timedOut,
      spawnError: run.spawnError,
      cliReportedError: env?.is_error ?? null,
      subtype: env?.subtype ?? null,
      sessionId: env?.session_id ?? null,
      modelsThatAnswered: modelsThatAnswered(env),
      costUsd: env?.total_cost_usd ?? null,
      reply: clip(typeof env?.result === "string" ? env.result : null),
      unparsedStdoutHead: env ? null : clip(run.stdout, 600),
      stderrTail: run.stderrTail,
      chose: chosen,
    };
    attempts.push(kept);
    process.stdout.write(
      `turn ${turnNumber} attempt ${attempt}: ${chosen.length} call(s), ${run.ms} ms`
        + `${run.spawnError ? `, spawn error: ${run.spawnError}` : ""}`
        + `${run.timedOut ? ", timed out" : ""}`
        + `${env?.is_error ? ", client reported an error" : ""}\n`,
    );
    // Retry only the one failure a retry can fix: it answered, and it called nothing.
    if (chosen.length > 0 || run.spawnError || run.timedOut) break;
  }

  turns.push({
    turn: turnNumber,
    prompt,
    promptNamesTools: namesATool(prompt),
    attemptsRun: attempts.length,
    attempts,
    chose: kept?.chose ?? [],
  });
  if (kept?.sessionId) resumeId = kept.sessionId;
}

// ------------------------------------------------------------------------------------ what happened

const everyChoice = turns.flatMap((t) => t.chose.map((c) => ({ turn: t.turn, ...c })));
const ran = everyChoice.length > 0;
const distinctTools = [...new Set(everyChoice.map((c) => c.tool).filter(Boolean))].sort();
const refusals = everyChoice
  .filter((c) => c.ok === false)
  .map((c) => ({ turn: c.turn, tool: c.tool, code: c.code ?? null }));

const normalizedDemo = normalizeFindings(demoFindings());
const proposals = everyChoice
  .filter((c) => c.tool === "propose_marks")
  .map((c) => {
    const sent = normalizeFindings(c.arguments?.findings);
    return {
      turn: c.turn,
      accepted: c.ok === true,
      code: c.code ?? null,
      answersNamed: sent ? sent.length : 0,
      findings: sent,
      identicalToDemo:
        normalizedDemo && sent ? JSON.stringify(sent) === JSON.stringify(normalizedDemo) : null,
    };
  });
const accepted = proposals.filter((p) => p.accepted);

/**
 * The owner's question, answered as narrowly as the evidence allows.
 *
 * "Marks that are not the demo's" needs two things to be true at once: the page accepted a
 * `propose_marks` call, and the findings in that call were not the fixture's own `DEMO_FINDINGS`.
 * Either one alone proves nothing — the demo button also produces an accepted call, and a novel
 * batch that got refused never reached the page.
 */
const externalData = {
  question: "Did marks that are not the demo's own reach the page, chosen by the model?",
  demoFindingsFromSource: normalizedDemo ? normalizedDemo.length : null,
  couldNotReadDemoFindings: normalizedDemo === null,
  proposeMarksCalls: proposals,
  pageAcceptedModelMarks: accepted.length > 0,
  everyAcceptedBatchDifferedFromDemo:
    accepted.length > 0 && accepted.every((p) => p.identicalToDemo === false),
  whyItMatters:
    "propose_marks scores whatever findings the caller sends. DEMO_FINDINGS is one caller — the "
    + "page's own button — going through the same dispatch path. A batch the model composed and the "
    + "page accepted is marking data that came from outside the demo.",
};

// ---------------------------------------------------------------------------------- the artifact

const attemptsFlat = turns.flatMap((t) => t.attempts);
const answeringModels = [...new Set(attemptsFlat.flatMap((a) => a.modelsThatAnswered))].sort();
const promptsClean = turns.every((t) => t.promptNamesTools.length === 0);

const artifact = {
  artifact: "natural-language-replay",
  generator: "scripts/nl-replay.mjs",
  startedAt,
  finishedAt: new Date().toISOString(),
  classification: ran ? "VERIFIED_RUN" : "NOT_RUN",
  chosenBy: "model",
  claim: ran
    ? "A model was handed three plain-language goals, was allowed no tools other than this page's "
      + "nine, and picked which of them to call. Every call listed here was read out of the bridge's "
      + "own transcript, not out of the model's account of itself."
    : "Nothing is proven here. The client left no tool call in the transcript, so this file records "
      + "a run that did not happen rather than a result.",
  client: {
    cli: CLI,
    modelRequested: MODEL,
    modelsThatAnswered: answeringModels,
    budgetUsd: Number(BUDGET),
    perTurnTimeoutMs: TIMEOUT_MS,
    workdir: WORK,
    whyOutsideTheRepo:
      "Started in a temporary directory so the client cannot load this project's CLAUDE.md and "
      + "answer from the source tree instead of from the page.",
  },
  toolset: {
    allowed: ALLOWED,
    denied: DENIED,
    whyDenied:
      "The built-ins are denied by name rather than with an empty --tools, which on claude CLI "
      + "2.1.220 empties the MCP tools too. With no shell, no file read and no search, the only way "
      + "the model can learn anything about this page is to call it.",
  },
  transport: {
    bridge: "scripts/mcp-bridge.mjs",
    bridgeSha256: bridgeHash(),
    pageUrl: PAGE_URL,
    cdpPortBase: BASE_PORT,
    chromium: CHROMIUM,
  },
  promptHygiene: {
    checked: "every prompt is searched for all nine tool names, underscored and spaced",
    clean: promptsClean,
    named: turns
      .filter((t) => t.promptNamesTools.length > 0)
      .map((t) => ({ turn: t.turn, named: t.promptNamesTools })),
  },
  turns,
  totals: {
    turnsAttempted: turns.length,
    turnsWithCalls: turns.filter((t) => t.chose.length > 0).length,
    clientInvocations: attemptsFlat.length,
    totalCalls: everyChoice.length,
    distinctToolCount: distinctTools.length,
    distinctTools,
    refusalCount: refusals.length,
    refusals,
  },
  externalData,
  blocked: ran
    ? null
    : {
        reason:
          "The client produced no tool call in any turn. Everything below is what it did instead.",
        attempts: attemptsFlat.map((a) => ({
          attempt: a.attempt,
          exitCode: a.exitCode,
          timedOut: a.timedOut,
          spawnError: a.spawnError,
          cliReportedError: a.cliReportedError,
          subtype: a.subtype,
          reply: a.reply,
          stderrTail: a.stderrTail,
        })),
      },
  notClaimed: [
    "Not a claim that page state carried across turns. Each client invocation starts its own MCP "
      + "server, so every turn gets a fresh browser and a page back at revision 1. The model's memory "
      + "carries through --resume; the page's does not. A turn that asks for a release can honestly "
      + "meet nothing-to-release and have to mark first — that is the page's own ordering.",
    "Not a claim about other clients. One model, one CLI, headless Chromium, one Linux machine. "
      + "Nothing here says anything about ChatGPT's in-app browser or any other agent.",
    "Not a claim that the marks are pedagogically right. They are the model's reading of each "
      + "answer. explain_mark and the held answers exist precisely because that judgement stays with "
      + "a person.",
    "Not a release. request_release only stages one; confirmRelease is not exposed as a tool, so no "
      + "tool in this run could send anything to a student.",
    "Not determinism. One run. A model may choose differently next time, and this file would record "
      + "that just as plainly.",
    "The model's prose is stored under reply as context and is not evidence of anything. Only the "
      + "chose arrays, read from the bridge's transcript, are.",
  ],
};

/** The transport this run actually went through, pinned so the artifact cannot drift off it. */
function bridgeHash() {
  try {
    return createHash("sha256").update(readFileSync(BRIDGE)).digest("hex");
  } catch {
    return null;
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);

const turnsWithCalls = turns.filter((t) => t.chose.length > 0).length;
process.stdout.write(
  `\n${artifact.classification} — ${everyChoice.length} call(s) in ${turnsWithCalls}/${turns.length} turn(s)\n`,
);
process.stdout.write(`tools chosen: ${distinctTools.join(", ") || "none"}\n`);
process.stdout.write(`refusals met: ${refusals.map((r) => r.code).join(", ") || "none"}\n`);
process.stdout.write(
  `model marks accepted by the page: ${externalData.pageAcceptedModelMarks}`
    + `, every accepted batch differed from DEMO_FINDINGS: ${externalData.everyAcceptedBatchDifferedFromDemo}\n`,
);
process.stdout.write(`answered by: ${answeringModels.join(", ") || "unknown"}\n`);
if (!promptsClean) process.stdout.write("PROMPT LEAK: a prompt named a tool. See promptHygiene.\n");
process.stdout.write(`artifact: ${OUT}\ntranscripts: ${WORK}\n`);

process.exitCode = ran && promptsClean ? 0 : 1;
