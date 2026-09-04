#!/usr/bin/env node
/**
 * Deterministic multi-agent simulation for Withheld.
 *
 * This is a bounded role simulation over the real Withheld tool surface. It is useful for checking
 * hand-offs, refusal recovery and the human-only release boundary without inventing a model trace.
 * It is deliberately not natural-language model evidence, native-host evidence, or user validation.
 * All data comes from the synthetic spoon fixture and only ids, revisions, refusal codes and safe
 * summaries are written to the artifact. Answer bodies and page-owned arithmetic never leave memory.
 *
 * Usage from submissions/withheld:
 *   node --experimental-strip-types docs/evidence/harness/multi-agent-simulation.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEMO_FINDINGS,
  SPOON_ANSWERS,
  SPOON_QUESTION,
  SPOON_RUBRIC,
} from "../../../src/data/fixtures.ts";
import {
  forbiddenNumbersInText,
  forbiddenNumericPaths,
} from "../../../src/tools/agent-boundary.ts";
import {
  confirmRelease,
  createSession,
  declineRelease,
  holdsFor,
} from "../../../src/domain/session.ts";
import { buildWithheldTools } from "../../../src/tools/webmcp.ts";
import { evidenceMeta } from "../../../scripts/evidence-meta.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = resolve(HERE, "../../..");
const OUT = resolve(PACKAGE, "docs/evidence/multi-agent-simulation.json");
const PAGE_OWNED_NUMBERS = [17, 19, 23, 29, 50];

let session = createSession(SPOON_RUBRIC, SPOON_ANSWERS, { question: SPOON_QUESTION });
const dispatches = [];
const trace = [];
const checks = [];

const port = {
  read: () => session,
  write: (next) => {
    session = next;
  },
  observe: (dispatch) => dispatches.push({ ...dispatch }),
};

const tools = buildWithheldTools(port);
const byName = new Map(tools.map((tool) => [tool.name, tool]));

function check(id, label, passed, detail) {
  checks.push({ id, label, passed: Boolean(passed), detail });
}

function boundaryViolation(payload, toolName) {
  return {
    numericPaths: forbiddenNumericPaths(payload),
    textHits: forbiddenNumbersInText(
      payload,
      PAGE_OWNED_NUMBERS,
      toolName === "read_answer" ? ["answer.body"] : [],
    ),
  };
}

function summary(payload, toolName) {
  const allowed = [
    "refused",
    "code",
    "revision",
    "answerCount",
    "heldCount",
    "releasableCount",
    "releasedCount",
    "awaitingHuman",
    "receiptAction",
    "emphasis",
  ];
  const result = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) result[key] = payload[key];
  }
  if (toolName === "read_answer") result.answerBodyStored = false;
  result.payloadKeys = Object.keys(payload).sort();
  return result;
}

async function call(agent, toolName, input) {
  const before = session.revision;
  const tool = byName.get(toolName);
  if (!tool) throw new Error(`simulation requested unavailable tool: ${toolName}`);

  const result = await tool.execute(input);
  const payload = result.structuredContent;
  const after = session.revision;
  const violation = boundaryViolation(payload, toolName);
  const record = {
    step: trace.length + 1,
    agent,
    tool: toolName,
    input,
    beforeRevision: before,
    afterRevision: after,
    result: summary(payload, toolName),
    boundaryViolation: violation,
  };
  trace.push(record);
  return { result, payload, before, after, boundaryViolation: violation };
}

function humanAction(agent, action, apply) {
  const before = session.revision;
  const next = apply(session);
  session = next;
  const record = {
    step: trace.length + 1,
    agent,
    action,
    beforeRevision: before,
    afterRevision: session.revision,
    releasedCount: session.releasedAnswerIds.length,
    receiptAction: session.receipts.at(-1)?.action ?? null,
  };
  trace.push(record);
  return record;
}

async function run() {
  // The registry is built from the production registrations, not from a second list of names.
  const names = tools.map((tool) => tool.name).sort();
  check("registry-count", "the simulated host exposes exactly nine Withheld tools", names.length === 9, `${names.length} tools`);
  check("registry-no-confirm", "the registry has no confirm_release tool", !byName.has("confirm_release"), "confirm_release absent");

  const discovered = await call("recognition-agent", "describe_stack", {});
  const rubric = await call("recognition-agent", "read_rubric", {});
  check("discover-first", "the recognition agent starts with live stack state", discovered.payload.revision === 1, `revision ${discovered.payload.revision}`);
  check("rubric-redacted", "the rubric hand-off contains no page-owned arithmetic", rubric.result.structuredContent && rubric.boundaryViolation.numericPaths.length === 0 && rubric.boundaryViolation.textHits.length === 0, "redacted rubric payload");

  // The recognition role reads every synthetic answer, but the harness records only ids and safe
  // metadata. The proposal below is a deterministic role output, not a model-generated finding.
  for (const answer of SPOON_ANSWERS) {
    await call("recognition-agent", "read_answer", { answerId: answer.id });
  }
  check("answer-sweep", "the recognition role inspected all synthetic answers without storing bodies", trace.filter((item) => item.tool === "read_answer").length === SPOON_ANSWERS.length && trace.filter((item) => item.tool === "read_answer").every((item) => item.result.answerBodyStored === false), `${SPOON_ANSWERS.length} answer reads`);

  const proposal = await call("recognition-agent", "propose_marks", {
    findings: DEMO_FINDINGS,
    expectedRevision: session.revision,
    operationId: "sim-recognition-proposal-v1",
  });
  check("proposal-accepted", "the bounded recognition proposal moves shared page state once", !proposal.payload.refused && proposal.after === proposal.before + 1, `${proposal.before}→${proposal.after}`);
  check("injection-quarantined", "the marker-directed synthetic answer is quarantined without a mark", session.quarantined.includes("ans-11") && !session.marks["ans-11"], "ans-11 quarantined");

  const safetyHeld = await call("safety-agent", "list_held_answers", {});
  const safetyPreview = await call("safety-agent", "preview_unattended_outcome", {});
  check("safety-views-redacted", "safety-agent views contain no page-owned arithmetic", safetyHeld.boundaryViolation.numericPaths.length === 0 && safetyHeld.boundaryViolation.textHits.length === 0 && safetyPreview.boundaryViolation.numericPaths.length === 0 && safetyPreview.boundaryViolation.textHits.length === 0, "no forbidden numeric payload");

  const stale = await call("adversarial-agent", "propose_marks", {
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
    operationId: "sim-stale-proposal-v1",
  });
  check("stale-refusal", "a stale agent proposal is refused without moving state", stale.payload.code === "stale-revision" && stale.after === stale.before, stale.payload.code);

  const duplicate = await call("adversarial-agent", "propose_marks", {
    findings: DEMO_FINDINGS,
    expectedRevision: session.revision,
    operationId: "sim-recognition-proposal-v1",
  });
  check("duplicate-refusal", "a replayed operation id is refused without moving state", duplicate.payload.code === "duplicate-operation" && duplicate.after === duplicate.before, duplicate.payload.code);

  const malformed = await call("adversarial-agent", "propose_marks", {
    findings: DEMO_FINDINGS,
    expectedRevision: session.revision,
    operationId: "sim-malformed-proposal-v1",
    unexpected: true,
  });
  check("malformed-refusal", "an unexpected argument is refused before the reducer", malformed.payload.code === "invalid-argument" && malformed.after === malformed.before, malformed.payload.code);

  const stage = await call("release-agent", "request_release", {
    expectedRevision: session.revision,
    operationId: "sim-release-stage-v1",
  });
  check("release-stage-only", "the release agent can stage but not release", !stage.payload.refused && stage.payload.awaitingHuman === true && session.releaseRequest !== null && session.releasedAnswerIds.length === 0, `${stage.before}→${stage.after}`);
  check("human-tool-absent", "the release agent cannot find a confirmation tool", !byName.has("confirm_release"), "tool lookup absent");

  const decline = humanAction("human-gate", "decline_release", declineRelease);
  check("decline-recorded", "human decline clears staging and records a receipt", session.releaseRequest === null && session.releasedAnswerIds.length === 0 && decline.receiptAction === "human_release_declined", `revision ${decline.afterRevision}`);

  await call("release-agent", "describe_stack", {});
  const restage = await call("release-agent", "request_release", {
    expectedRevision: session.revision,
    operationId: "sim-release-stage-v2",
  });
  check("restage-after-decline", "the release agent can re-stage after a human decline", !restage.payload.refused && session.releaseRequest !== null, `revision ${restage.after}`);

  const beforeConfirm = session.releasedAnswerIds.length;
  const confirm = humanAction("human-gate", "confirm_release", confirmRelease);
  check("confirm-human-only", "only the human boundary releases answers and records a receipt", session.releasedAnswerIds.length > beforeConfirm && confirm.receiptAction === "human_release_confirmed", `released ${beforeConfirm}→${session.releasedAnswerIds.length}`);

  const releasedId = session.releasedAnswerIds[0];
  const postRelease = await call("adversarial-agent", "propose_marks", {
    findings: [{ answerId: releasedId, foundLineIds: [] }],
    expectedRevision: session.revision,
    operationId: "sim-post-release-proposal-v1",
  });
  check("released-refusal", "an agent cannot rewrite an answer after human release", postRelease.payload.code === "already-released" && postRelease.after === postRelease.before, postRelease.payload.code);

  const finalRead = await call("audit-agent", "describe_stack", {});
  check("final-state-consistent", "the final read sees the same human release state", finalRead.payload.releasedCount === session.releasedAnswerIds.length && session.receipts.at(-1)?.action === "human_release_confirmed", `released ${finalRead.payload.releasedCount}`);
  check("revision-monotonic", "accepted writes and human actions have monotonic revisions", trace.every((item, index) => index === 0 || item.afterRevision >= trace[index - 1].afterRevision), `final revision ${session.revision}`);
  check("all-safe-outputs", "non-answer tool outputs pass the production boundary checks", trace.filter((item) => item.tool && item.tool !== "read_answer").every((item) => item.boundaryViolation.numericPaths.length === 0 && item.boundaryViolation.textHits.length === 0), "numeric canary clear");

  const failed = checks.filter((item) => !item.passed);
  const metadata = evidenceMeta(PACKAGE, { artifactPaths: [] });
  const artifact = {
    artifact: "multi-agent-simulation",
    schemaVersion: 1,
    project: "withheld",
    status: failed.length === 0 ? "PASS_WITH_LIMITATIONS" : "FAIL",
    evidenceClass: "SIMULATED_RUN",
    classification: "DETERMINISTIC_MULTI_AGENT_ROLE_SIMULATION",
    claim: "Four bounded roles exercised the real Withheld tool surface and shared session, including refusal recovery and the human-only release boundary.",
    notClaimed: [
      "This is not a natural-language model replay. No LLM selected a tool or composed an argument.",
      "This is not native-host discovery. The registrations were built directly from the production TypeScript tool surface.",
      "This is not GATE-P2, user validation, learner validation, adoption evidence, or measured time saving.",
      "Human release actions are direct calls to the page-owned domain functions to model the UI boundary; no agent was given a confirmation tool.",
    ],
    scenario: {
      question: "synthetic spoon marking fixture",
      answerCount: SPOON_ANSWERS.length,
      roles: [
        { id: "recognition-agent", responsibility: "read live context and submit bounded rubric-line findings" },
        { id: "safety-agent", responsibility: "inspect holds and unattended outcome without page-owned arithmetic" },
        { id: "adversarial-agent", responsibility: "exercise stale, duplicate, malformed and post-release recovery" },
        { id: "release-agent", responsibility: "stage a release request and stop at the human boundary" },
        { id: "audit-agent", responsibility: "re-read final shared state and receipt continuity" },
        { id: "human-gate", responsibility: "decline and confirm through page-owned functions; not an agent" },
      ],
    },
    handoffs: [
      "recognition-agent → safety-agent: accepted proposal and current revision",
      "safety-agent → adversarial-agent: redacted views and refusal surface",
      "adversarial-agent → release-agent: unchanged state after negative probes",
      "release-agent → human-gate: staged request awaiting a person",
      "human-gate → audit-agent: receipt and final released state",
    ],
    trace,
    dispatches,
    checks: { total: checks.length, passed: checks.filter((item) => item.passed).length, failed: failed.length, items: checks },
    releaseState: {
      finalRevision: session.revision,
      finalReleasedCount: session.releasedAnswerIds.length,
      finalReceiptActions: session.receipts.map((receipt) => receipt.action),
      humanReleaseReceiptPresent: session.receipts.some((receipt) => receipt.action === "human_release_confirmed"),
    },
    binding: metadata,
    rerun: "node --experimental-strip-types docs/evidence/harness/multi-agent-simulation.mjs",
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`multi-agent simulation: ${artifact.checks.passed}/${artifact.checks.total} checks passed\n`);
  process.stdout.write(`artifact: ${OUT}\n`);
  if (failed.length > 0) process.exitCode = 1;
}

run().catch((error) => {
  process.stderr.write(`multi-agent simulation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
