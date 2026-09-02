/**
 * GATE-W1 — the information gate.
 *
 * The other test files assert that no tool result *contains* a point value or the pass
 * boundary. This file asks the harder question: can an agent **derive** either of them, or
 * the one fact the redactions exist to hide — which answer sits on the grade cliff — out of
 * results that contain no forbidden number at all?
 *
 * Every test below is a channel that carries no number and could still leak: a receipt that
 * names a set the page picked, two answers on opposite sides of the boundary, a repeated
 * probe, an ordering. `docs/GATE-W1.md` walks the same list in prose, and names the two
 * residual channels these tests deliberately do not close.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildWithheldTools,
  type SessionPort,
  type ToolRegistration,
  type ToolResult,
} from "../src/tools/webmcp.ts";
import {
  createSession,
  holdsFor,
  looksLikeMarkerInstruction,
  proposeMarks,
  type Session,
} from "../src/domain/session.ts";
import { agentVisibleHolds, explainMark, explainMarkForAgent } from "../src/domain/views.ts";
import {
  DEMO_FINDINGS,
  SPOON_ANSWERS,
  SPOON_QUESTION,
  SPOON_RUBRIC,
} from "../src/data/fixtures.ts";

function makePort(): SessionPort & { current: () => Session } {
  let session = createSession(SPOON_RUBRIC, SPOON_ANSWERS, { question: SPOON_QUESTION });

  return {
    read: () => session,
    write: (next) => {
      session = next;
    },
    current: () => session,
  };
}

function byName(tools: ToolRegistration[], name: string): ToolRegistration {
  const tool = tools.find((candidate) => candidate.name === name);
  assert.ok(tool, `${name} should be registered`);
  return tool;
}

function payloadOf(result: ToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

/** The stack marked from the worked example, through the domain rather than the tools. */
function marked(): Session {
  const outcome = proposeMarks(createSession(SPOON_RUBRIC, SPOON_ANSWERS), DEMO_FINDINGS, 1);
  assert.ok(outcome.ok);
  return outcome.session;
}

/** Held for sitting near the boundary: the answers the agent is never allowed to name. */
function cliffAnswerIds(session: Session): string[] {
  return holdsFor(session)
    .filter((hold) => hold.reason === "near-boundary")
    .map((hold) => hold.answerId);
}

test("a release receipt names no answer the page picked, so the held set stays unrecoverable", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);

  const proposed = await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
  });
  assert.ok(payloadOf(proposed)["receipt"], "the worked example should land");

  const session = port.current();
  assert.ok(cliffAnswerIds(session).length > 0, "the fixture must hold something near the boundary");

  const result = await byName(tools, "request_release").execute({
    expectedRevision: session.revision,
  });
  const wire = JSON.stringify(payloadOf(result));

  // The agent named nothing in this call, so any answer id in the reply is a set the page
  // chose. Releasable means marked-and-not-held, so subtracting it from the marked answers in
  // describe_stack hands over the held set, and taking away the holds it is allowed to see
  // leaves the ones sitting on the boundary — by id, in one call, through a channel the
  // numeric guard cannot see, because an id is not a number.
  for (const answer of session.answers) {
    assert.equal(wire.includes(answer.id), false, `${answer.id} leaked through a release receipt`);
  }
});

test("a receipt still echoes back the ids the agent itself sent", async () => {
  const tools = buildWithheldTools(makePort());

  const result = await byName(tools, "propose_marks").execute({
    findings: [{ answerId: "ans-01", foundLineIds: ["l-conductor"] }],
    expectedRevision: 1,
  });

  // The rule is about provenance, not about ids: what the agent supplied may come back, so
  // it can tell a landed batch from a refused one.
  const receipt = payloadOf(result)["receipt"] as { answerIds: string[] };
  assert.deepEqual(receipt.answerIds, ["ans-01"]);
});

test("an answer above the boundary and one below it are the same answer to the agent", async () => {
  const session = marked();
  const sides = cliffAnswerIds(session).map((answerId) => {
    const full = explainMark(session, answerId);
    assert.ok(full);
    return { answerId, passes: full.passes };
  });

  const above = sides.find((side) => side.passes)?.answerId;
  const below = sides.find((side) => !side.passes)?.answerId;
  assert.ok(above && below, "the fixture must hold one answer on each side of the boundary");

  const tools = buildWithheldTools({ read: () => session, write: () => {} });
  const stack = payloadOf(await byName(tools, "describe_stack").execute({}));
  const states = new Map(
    (stack["answers"] as { id: string; state: string }[]).map((row) => [row.id, row.state]),
  );

  // The band test the page applies is symmetric: |total − boundary| ≤ band. So even an agent
  // that has inferred "one of these two is being held" cannot infer which side of the
  // boundary it is on, and the side is the half that would tell it where to push.
  for (const answerId of [above, below]) {
    assert.equal(explainMarkForAgent(session, answerId)?.heldReason, null);
    assert.equal(agentVisibleHolds(session).some((hold) => hold.answerId === answerId), false);
    assert.equal(states.get(answerId), "marked");
  }
});

test("probing the boundary twice on one answer destroys the channel and announces itself", () => {
  const session = marked();
  const target = cliffAnswerIds(session)[0];
  assert.ok(target);

  // Reading the band again at a different subset means re-marking the same answer, and a
  // second, different report makes it unstable — which outranks near-boundary in `holdsFor`,
  // so the reason the agent could have inferred from is gone, and the reason it gets instead
  // is one the teacher's own ledger shows. The probe costs the channel and leaves a trace.
  const again = proposeMarks(session, [{ answerId: target, foundLineIds: [] }], session.revision);
  assert.ok(again.ok);

  const reason = holdsFor(again.session).find((hold) => hold.answerId === target)?.reason;
  assert.equal(reason, "findings-unstable");
  assert.equal(agentVisibleHolds(again.session).some((hold) => hold.answerId === target), true);
});

test("the agent's hold list is in stack order, whatever order the marks arrived in", () => {
  const forwards = marked();

  const backwards = proposeMarks(
    createSession(SPOON_RUBRIC, SPOON_ANSWERS),
    [...DEMO_FINDINGS].reverse(),
    1,
  );
  assert.ok(backwards.ok);

  // An ordering is a number in disguise: a list sorted by closeness to the boundary would
  // rebuild the distance the totals were removed to hide. Both sessions hold the same
  // answers, so the two lists must be identical, and both must follow the stack.
  const named = agentVisibleHolds(forwards).map((hold) => hold.answerId);
  assert.deepEqual(agentVisibleHolds(backwards.session).map((hold) => hold.answerId), named);
  assert.deepEqual(
    named,
    forwards.answers.map((answer) => answer.id).filter((id) => named.includes(id)),
  );
});

test("the stack cannot supply enough clean probes to solve for the rubric", () => {
  // Each answer yields one honest band bit: its first mark. A second differing mark makes it
  // unstable, and unstable outranks near-boundary, so the bit is gone. Quarantined answers
  // never get a mark at all, so they yield nothing. With more rubric subsets than answers,
  // the truth table an attacker would need cannot be filled in a single session — and every
  // row of it is an inequality without a sign, not a point value.
  const subsets = 2 ** SPOON_RUBRIC.lines.length;
  const quarantining = SPOON_ANSWERS.filter((answer) =>
    looksLikeMarkerInstruction(answer.body),
  ).length;
  const cleanProbes = SPOON_ANSWERS.length - quarantining;

  assert.ok(subsets > cleanProbes, `${subsets} subsets against ${cleanProbes} usable probes`);
});
