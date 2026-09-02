import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createSession,
  holdsFor,
  proposeMarks,
  releasableAnswerIds,
  type Session,
} from "../src/domain/session.ts";
import {
  agentVisibleHolds,
  comparePolicies,
  explainMark,
  explainMarkForAgent,
  releaseOutcome,
  unattendedOutcome,
  unattendedOutcomeForAgent,
} from "../src/domain/views.ts";
import {
  assertAgentSafe,
  forbiddenNumbersInText,
  forbiddenNumericPaths,
} from "../src/tools/agent-boundary.ts";
import {
  DEMO_FINDINGS,
  PAGE_OWNED_NUMBERS,
  SPOON_ANSWERS,
  SPOON_RUBRIC,
} from "../src/data/fixtures.ts";

function marked(): Session {
  const outcome = proposeMarks(createSession(SPOON_RUBRIC, SPOON_ANSWERS), DEMO_FINDINGS, 1);
  assert.ok(outcome.ok);
  return outcome.session;
}

test("the teacher's explanation carries the arithmetic the agent never sees", () => {
  const explanation = explainMark(marked(), "ans-04");
  assert.ok(explanation);

  assert.equal(explanation.total, 48);
  assert.equal(explanation.passBoundary, 50);
  assert.equal(explanation.distanceFromBoundary, -2);
  assert.equal(explanation.passes, false);
  assert.equal(explanation.heldReason, "near-boundary");
});

test("the agent's explanation of the same mark contains no page-owned number", () => {
  const explanation = explainMarkForAgent(marked(), "ans-04");
  assert.ok(explanation);

  assert.deepEqual(forbiddenNumericPaths(explanation), []);
  assert.deepEqual(forbiddenNumbersInText(explanation, PAGE_OWNED_NUMBERS), []);
  assert.equal(assertAgentSafe(explanation), explanation);
});

test("the agent is not told that an answer sits near the boundary, even by hint", () => {
  const session = marked();
  const explanation = explainMarkForAgent(session, "ans-04");

  // The page knows. The agent is told nothing, not a vaguer code that could be inverted.
  assert.equal(explainMark(session, "ans-04")?.heldReason, "near-boundary");
  assert.equal(explanation?.heldReason, null);
});

test("the agent's hold list is shorter than the hold count, and that gap is the design", () => {
  const session = marked();
  const named = agentVisibleHolds(session);

  assert.deepEqual(named.map((hold) => hold.answerId), ["ans-10", "ans-11"]);
  assert.ok(named.length < holdsFor(session).length);
  assert.deepEqual(named.map((hold) => hold.reason).sort(), [
    "answer-contains-instructions",
    "long-answer-no-rubric-idea",
  ]);
});

test("the teacher's counterfactual says what would have gone out unwatched", () => {
  const outcome = unattendedOutcome(marked());

  assert.equal(outcome.rows.length, 5);
  assert.equal(outcome.wouldHavePassed, 1);
  assert.equal(outcome.wouldHaveFailed, 3);
  assert.equal(outcome.wouldHaveGoneUnmarked, 1);
  assert.equal(outcome.rows.find((row) => row.answerId === "ans-03")?.total, 52);
  assert.equal(outcome.rows.find((row) => row.answerId === "ans-11")?.total, null);
});

test("the agent's counterfactual is a workload, not an outcome", () => {
  const outcome = unattendedOutcomeForAgent(marked());

  assert.deepEqual(forbiddenNumericPaths(outcome), []);
  assert.deepEqual(forbiddenNumbersInText(outcome, PAGE_OWNED_NUMBERS), []);
  assert.equal(outcome.heldCount, 5);
  assert.equal(outcome.releasableCount, 9);
  assert.equal(outcome.needsHuman, true);

  // No pass/fail split reaches the agent: a split is an aggregate claim about totals.
  const keys = Object.keys(outcome);
  assert.deepEqual(keys.filter((key) => /pass|fail|total|boundary/i.test(key)), []);
});

test("every page-owned number is larger than any count the agent can see", () => {
  // This is what makes the text canary meaningful: a page-owned value can never be
  // mistaken for a cardinality or an index.
  const ceiling = Math.max(SPOON_ANSWERS.length, SPOON_RUBRIC.lines.length);

  for (const value of PAGE_OWNED_NUMBERS) {
    assert.ok(value > ceiling, `${value} could collide with a count`);
  }
});

test("no answer length collides with a page-owned number", () => {
  // `characters` is allowlisted, so an answer that happened to be exactly as long as a
  // rubric line is worth would trip the canary and hide a real leak behind a false one.
  for (const answer of SPOON_ANSWERS) {
    assert.equal(
      PAGE_OWNED_NUMBERS.includes(answer.body.length),
      false,
      `${answer.id} is ${answer.body.length} characters, which is a page-owned number`,
    );
  }
});

test("the release outcome counts only what would actually leave the page", () => {
  const session = marked();
  const outcome = releaseOutcome(session);
  const held = holdsFor(session).length;

  assert.equal(outcome.stillHeld, held);
  assert.equal(outcome.releasable, session.answers.length - held);
  assert.equal(outcome.wouldPass + outcome.wouldFail, outcome.releasable);

  // The split is over the releasable set alone. A held answer is not counted as a pass however
  // high it totalled, because it is not going anywhere.
  for (const hold of holdsFor(session)) {
    assert.equal(releasableAnswerIds(session).includes(hold.answerId), false);
  }
});

test("a session with nothing marked would release nothing", () => {
  const outcome = releaseOutcome(createSession(SPOON_RUBRIC, SPOON_ANSWERS));

  assert.equal(outcome.releasable, 0);
  assert.equal(outcome.wouldPass, 0);
  assert.equal(outcome.wouldFail, 0);
});

test("the policy comparison never holds fewer answers as care goes up", () => {
  const rows = comparePolicies(marked());

  assert.deepEqual(
    rows.map((row) => row.emphasis),
    ["standard", "cautious", "most-cautious"],
  );
  assert.equal(rows.filter((row) => row.selected).length, 1);

  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(
      rows[index]!.held >= rows[index - 1]!.held,
      `${rows[index]!.emphasis} held fewer than ${rows[index - 1]!.emphasis}`,
    );
    assert.ok(rows[index]!.releasable <= rows[index - 1]!.releasable);
  }

  for (const row of rows) {
    assert.equal(row.wouldPass + row.wouldFail, row.releasable);
    assert.ok(row.wouldGoUnmarked <= row.held);
  }
});

test("the policy comparison changes nothing about the session it is asked about", () => {
  const session = marked();
  const before = JSON.stringify(session);

  comparePolicies(session);

  assert.equal(JSON.stringify(session), before);
  assert.equal(session.emphasis, "standard");
});


\n