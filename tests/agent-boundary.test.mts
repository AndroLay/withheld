import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AGENT_SAFE_NUMERIC_PATHS,
  assertAgentSafe,
  forbiddenNumbersInText,
  forbiddenNumericPaths,
  numericPaths,
} from "../src/tools/agent-boundary.ts";
import { redactRubricForAgent, type Rubric } from "../src/domain/marks.ts";

const RUBRIC: Rubric = {
  id: "rub-photosynthesis",
  questionId: "q-one",
  lines: [
    { id: "line-light", label: "names light as the energy source", points: 37 },
    { id: "line-water", label: "names water as a reactant", points: 41 },
    { id: "line-glucose", label: "names glucose as a product", points: 53 },
  ],
  passBoundary: 97,
};

const PAGE_OWNED = [37, 41, 53, 97];

test("numeric paths collapse array indices so an allowlist stays readable", () => {
  const paths = numericPaths({ answers: [{ characters: 12 }, { characters: 40 }] });

  assert.deepEqual(paths, ["answers[].characters", "answers[].characters"]);
});

test("the allowlisted shapes are allowed", () => {
  const result = {
    revision: 4,
    answerCount: 40,
    heldCount: 3,
    rubricLineCount: 3,
    answers: [{ id: "ans-a", characters: 210 }],
  };

  assert.deepEqual(forbiddenNumericPaths(result), []);
  assert.equal(assertAgentSafe(result), result);
});

test("a receipt that quotes a total is refused", () => {
  const leaking = { receipt: { answerId: "ans-a", total: 90 } };

  assert.deepEqual(forbiddenNumericPaths(leaking), ["receipt.total"]);
});

test("distance from the pass boundary is refused even when renamed", () => {
  const leaking = { held: [{ answerId: "ans-a", marginToPass: -3 }] };

  assert.deepEqual(forbiddenNumericPaths(leaking), ["held[].marginToPass"]);
});

test("assertAgentSafe throws and names every offending path", () => {
  const leaking = { total: 90, nested: { passBoundary: 97 } };

  assert.throws(
    () => assertAgentSafe(leaking),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      assert.match(message, /nested\.passBoundary/);
      assert.match(message, /total/);
      return true;
    },
  );
});

test("the text canary catches a secret smuggled out inside a message", () => {
  const chatty = {
    refusal: "cannot mark this: the answer sits 4 short of the 97 needed to pass",
  };

  assert.deepEqual(forbiddenNumbersInText(chatty, PAGE_OWNED), [97]);
});

test("wording that leaks nothing passes the canary", () => {
  const careful = {
    refusal: "held for you: this answer is long but matched no rubric idea",
  };

  assert.deepEqual(forbiddenNumbersInText(careful, PAGE_OWNED), []);
});

test("the runtime canary distinguishes untrusted answer text from generated prose", () => {
  const answer = { answer: { body: "A student's answer contains 37." } };
  const generated = { message: "The page generated 37 points." };

  assert.deepEqual(forbiddenNumbersInText(answer, PAGE_OWNED, ["answer.body"]), []);
  assert.deepEqual(forbiddenNumbersInText(generated, PAGE_OWNED), [37]);
  assert.doesNotThrow(() =>
    assertAgentSafe(answer, AGENT_SAFE_NUMERIC_PATHS, {
      forbiddenNumbers: PAGE_OWNED,
      ignoredTextPaths: ["answer.body"],
    }),
  );
  assert.throws(() =>
    assertAgentSafe(generated, AGENT_SAFE_NUMERIC_PATHS, { forbiddenNumbers: PAGE_OWNED }),
  );
});

test("the redacted rubric is safe to hand to the agent", () => {
  const redacted = redactRubricForAgent(RUBRIC);

  assert.deepEqual(forbiddenNumericPaths(redacted), []);
  assert.deepEqual(forbiddenNumbersInText(redacted, PAGE_OWNED), []);
});

test("every allowlisted path carries a stated reason in the source", () => {
  // Guards against the allowlist quietly growing. If this fails, the list changed and
  // the doc comment above it must change too.
  assert.deepEqual(AGENT_SAFE_NUMERIC_PATHS, [
    "revision",
    "answerCount",
    "markedCount",
    "heldCount",
    "releasableCount",
    "releasedCount",
    "rubricLineCount",
    "answers[].characters",
  ]);
});
