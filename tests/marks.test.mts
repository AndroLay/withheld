import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeMark,
  distanceFromBoundary,
  redactRubricForAgent,
  type Rubric,
} from "../src/domain/marks.ts";
import { SPOON_ANSWERS, SPOON_RUBRIC } from "../src/data/fixtures.ts";

// Deliberately odd point values and boundary, so a leak test can look for the exact
// numbers without colliding with ids, labels, or array indices.
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

/** Collect every object key in a value, at any depth. */
function keysOf(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) keysOf(item, found);
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      keysOf(child, found);
    }
  }
  return found;
}

test("computeMark sums only the lines the agent actually matched", () => {
  const mark = computeMark(RUBRIC, {
    answerId: "ans-01",
    foundLineIds: ["line-light", "line-glucose"],
  });

  assert.equal(mark.total, 37 + 53);
  assert.deepEqual(mark.awardedLineIds, ["line-light", "line-glucose"]);
});

test("computeMark is deterministic for identical input", () => {
  const finding = { answerId: "ans-01", foundLineIds: ["line-water"] };

  assert.deepEqual(computeMark(RUBRIC, finding), computeMark(RUBRIC, finding));
});

test("a rubric line the agent invented earns nothing", () => {
  const mark = computeMark(RUBRIC, {
    answerId: "ans-02",
    foundLineIds: ["line-water", "line-that-does-not-exist"],
  });

  assert.equal(mark.total, 41);
  assert.deepEqual(mark.awardedLineIds, ["line-water"]);
});

test("claiming the same line twice is paid once", () => {
  const mark = computeMark(RUBRIC, {
    answerId: "ans-03",
    foundLineIds: ["line-light", "line-light"],
  });

  assert.equal(mark.total, 37);
});

test("the agent-facing rubric carries no arithmetic at all", () => {
  const redacted = redactRubricForAgent(RUBRIC);
  const keys = keysOf(redacted);

  assert.equal(keys.has("points"), false, "point values must not cross the tool boundary");
  assert.equal(keys.has("passBoundary"), false, "the pass boundary must not cross either");

  // Belt and braces: the exact numbers must not survive serialisation in any form.
  const wire = JSON.stringify(redacted);
  for (const secret of [37, 41, 53, 97]) {
    assert.equal(
      wire.includes(String(secret)),
      false,
      `redacted rubric leaked the value ${secret}`,
    );
  }
});

test("distance from the boundary stays a page-side calculation", () => {
  const passing = computeMark(RUBRIC, {
    answerId: "ans-04",
    foundLineIds: ["line-light", "line-water", "line-glucose"],
  });
  const failing = computeMark(RUBRIC, { answerId: "ans-05", foundLineIds: ["line-light"] });

  assert.equal(distanceFromBoundary(RUBRIC, passing) >= 0, true);
  assert.equal(distanceFromBoundary(RUBRIC, failing) < 0, true);
});

test("computeMark preserves its invariants across duplicate and unknown input", () => {
  const candidates = [
    "line-light",
    "line-water",
    "line-glucose",
    "unknown-a",
    "unknown-b",
  ];

  for (let mask = 0; mask < 1 << candidates.length; mask += 1) {
    const input = candidates.filter((_, index) => (mask & (1 << index)) !== 0);
    const mark = computeMark(RUBRIC, {
      answerId: "ans-property",
      foundLineIds: [...input, ...input.slice(0, 2)],
    });
    const uniqueAwarded = new Set(mark.awardedLineIds);

    assert.equal(uniqueAwarded.size, mark.awardedLineIds.length);
    assert.equal(mark.awardedLineIds.every((id) => RUBRIC.lines.some((line) => line.id === id)), true);
    assert.equal(
      mark.total,
      mark.awardedLineIds.reduce(
        (total, id) => total + (RUBRIC.lines.find((line) => line.id === id)?.points ?? 0),
        0,
      ),
    );
  }
});

test("the synthetic fixture has unique, non-empty identities and positive page-owned values", () => {
  const answerIds = new Set(SPOON_ANSWERS.map((answer) => answer.id));
  const lineIds = new Set(SPOON_RUBRIC.lines.map((line) => line.id));

  assert.equal(answerIds.size, SPOON_ANSWERS.length);
  assert.equal(lineIds.size, SPOON_RUBRIC.lines.length);
  assert.ok(SPOON_ANSWERS.every((answer) => answer.id && answer.studentAlias && answer.body));
  assert.ok(SPOON_ANSWERS.every((answer) => answer.questionId === SPOON_RUBRIC.questionId));
  assert.ok(SPOON_RUBRIC.lines.every((line) => line.id && line.label && line.points > 0));
  assert.ok(SPOON_RUBRIC.passBoundary > SPOON_ANSWERS.length);
});
