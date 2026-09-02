/**
 * Withheld — page-owned arithmetic.
 *
 * The whole product rests on one information boundary: the agent reports which
 * canonical rubric ideas it recognised in a student's answer, in words. It never
 * receives the point value of a line, and never receives the pass boundary. So it
 * has no way to compute a total, and no way to work out whether an answer sits
 * near a grade cliff — which means it cannot compute, guess, or forge the
 * escalation decision. The page does that, in code, here.
 *
 * Agent brings language. Page keeps arithmetic and authority.
 */

/** A rubric line as the page holds it. `points` never leaves this module's owner. */
export type RubricLine = {
  id: string;
  label: string;
  points: number;
};

/** A rubric as the page holds it, including the boundary the agent must not learn. */
export type Rubric = {
  id: string;
  questionId: string;
  lines: RubricLine[];
  /** Total at or above which the answer passes. Page-owned. */
  passBoundary: number;
};

/** A rubric line as the agent is allowed to see it: label only, no arithmetic. */
export type AgentRubricLine = Pick<RubricLine, "id" | "label">;

/** What `read_rubric` may return. Deliberately missing `points` and `passBoundary`. */
export type AgentRubric = {
  id: string;
  questionId: string;
  lines: AgentRubricLine[];
};

/** What the agent reports back: recognised ideas, nothing numeric. */
export type AgentFinding = {
  answerId: string;
  foundLineIds: string[];
};

/** A mark, computed only by the page. */
export type Mark = {
  answerId: string;
  awardedLineIds: string[];
  total: number;
};

/**
 * Strip every page-owned number before a rubric crosses the tool boundary.
 * `tests/marks.test.mts` asserts the output carries no point value and no boundary.
 */
export function redactRubricForAgent(rubric: Rubric): AgentRubric {
  return {
    id: rubric.id,
    questionId: rubric.questionId,
    lines: rubric.lines.map((line) => ({ id: line.id, label: line.label })),
  };
}

/**
 * Pure function from (rubric, finding) to a mark. Same inputs always give the same
 * mark, which is what lets the evals assert exact totals without calling a model.
 * Unknown line ids are ignored rather than trusted: the agent does not get to
 * invent a rubric line and be paid for it.
 */
export function computeMark(rubric: Rubric, finding: AgentFinding): Mark {
  const byId = new Map(rubric.lines.map((line) => [line.id, line]));
  const awarded = finding.foundLineIds
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => byId.has(id));

  let total = 0;
  for (const id of awarded) {
    total += byId.get(id)?.points ?? 0;
  }

  return { answerId: finding.answerId, awardedLineIds: awarded, total };
}

/** How close a total sits to the pass boundary. Page-only; never returned by a tool. */
export function distanceFromBoundary(rubric: Rubric, mark: Mark): number {
  return mark.total - rubric.passBoundary;
}
