/**
 * Withheld — the two ways of answering the same question.
 *
 * Each view here comes in a pair: what the teacher sees, and what the agent is told. The
 * pair is the product. "How did this answer do?" is answered with a total and a distance
 * from the pass boundary for a person, and with a list of recognised ideas for an agent.
 * "What happens if nobody looks?" is answered with names and outcomes for a person, and
 * with a count for an agent.
 *
 * The redactions are projections, not filters over a shared object, so a field added to
 * the page-facing view does not silently appear in the agent-facing one.
 */

import { distanceFromBoundary, type Rubric } from "./marks.ts";
import {
  agentHoldReason,
  holdsFor,
  releasableAnswerIds,
  EMPHASIS_ORDER,
  type AgentHoldReason,
  type Emphasis,
  type HoldReason,
  type Session,
} from "./session.ts";

/** A mark as the teacher reads it, arithmetic included. Never returned by a tool. */
export type MarkExplanation = {
  answerId: string;
  studentAlias: string;
  awarded: { id: string; label: string; points: number }[];
  missed: { id: string; label: string; points: number }[];
  total: number;
  passBoundary: number;
  distanceFromBoundary: number;
  passes: boolean;
  heldReason: HoldReason | null;
};

/** A mark as the agent is told it: the ideas it named back, and nothing it can total. */
export type AgentMarkExplanation = {
  answerId: string;
  awardedLineIds: string[];
  awardedLabels: string[];
  missedLineIds: string[];
  heldReason: AgentHoldReason | null;
};

function lineParts(rubric: Rubric, ids: string[]) {
  return rubric.lines.filter((line) => ids.includes(line.id));
}

export function explainMark(session: Session, answerId: string): MarkExplanation | null {
  const answer = session.answers.find((candidate) => candidate.id === answerId);
  const mark = session.marks[answerId];
  if (!answer || !mark) return null;

  const awardedIds = mark.awardedLineIds;
  const missedIds = session.rubric.lines
    .map((line) => line.id)
    .filter((id) => !awardedIds.includes(id));
  const held = holdsFor(session).find((hold) => hold.answerId === answerId);

  return {
    answerId,
    studentAlias: answer.studentAlias,
    awarded: lineParts(session.rubric, awardedIds),
    missed: lineParts(session.rubric, missedIds),
    total: mark.total,
    passBoundary: session.rubric.passBoundary,
    distanceFromBoundary: distanceFromBoundary(session.rubric, mark),
    passes: mark.total >= session.rubric.passBoundary,
    heldReason: held?.reason ?? null,
  };
}

/**
 * The same explanation with every number removed. Note what is missing beyond the obvious:
 * no ordering by closeness to the boundary, and no "nearly" in any wording, because either
 * would rebuild the distance the totals were removed to hide. A hold the agent is not
 * allowed to know about reads as `null` here rather than as a vaguer code — see the note on
 * `AgentHoldReason`.
 */
export function explainMarkForAgent(
  session: Session,
  answerId: string,
): AgentMarkExplanation | null {
  const full = explainMark(session, answerId);
  if (!full) return null;

  return {
    answerId: full.answerId,
    awardedLineIds: full.awarded.map((line) => line.id),
    awardedLabels: full.awarded.map((line) => line.label),
    missedLineIds: full.missed.map((line) => line.id),
    heldReason: full.heldReason === null ? null : agentHoldReason(full.heldReason),
  };
}

export type AgentHold = { answerId: string; reason: AgentHoldReason };

/**
 * The held answers the agent is allowed to see by name. Answers held for sitting near the
 * pass boundary are not in this list at all; they are only in the count. That asymmetry is
 * the point of the tool, not a gap in it.
 */
export function agentVisibleHolds(session: Session): AgentHold[] {
  const holds: AgentHold[] = [];

  for (const hold of holdsFor(session)) {
    const reason = agentHoldReason(hold.reason);
    if (reason !== null) holds.push({ answerId: hold.answerId, reason });
  }

  return holds;
}


/** One held answer, and what would have happened to it had nobody looked. */
export type UnattendedRow = {
  answerId: string;
  studentAlias: string;
  reason: HoldReason;
  /** Null when the answer was quarantined: it has no mark, so it would ship unmarked. */
  total: number | null;
  wouldHavePassed: boolean | null;
};

/**
 * The counterfactual, for the teacher. This is the panel that makes the cost concrete: not
 * "three answers need review" but "this one would have gone out as a fail, one mark short."
 *
 * It deliberately does not claim any of these outcomes is wrong. Nobody knows that yet —
 * that is what the review is for. It reports only what would have left the page unwatched.
 */
export type UnattendedOutcome = {
  rows: UnattendedRow[];
  wouldHavePassed: number;
  wouldHaveFailed: number;
  wouldHaveGoneUnmarked: number;
};

export function unattendedOutcome(session: Session): UnattendedOutcome {
  const rows: UnattendedRow[] = holdsFor(session).map((hold) => {
    const answer = session.answers.find((candidate) => candidate.id === hold.answerId);
    const mark = session.marks[hold.answerId];

    return {
      answerId: hold.answerId,
      studentAlias: answer?.studentAlias ?? hold.answerId,
      reason: hold.reason,
      total: mark?.total ?? null,
      wouldHavePassed: mark ? mark.total >= session.rubric.passBoundary : null,
    };
  });

  return {
    rows,
    wouldHavePassed: rows.filter((row) => row.wouldHavePassed === true).length,
    wouldHaveFailed: rows.filter((row) => row.wouldHavePassed === false).length,
    wouldHaveGoneUnmarked: rows.filter((row) => row.wouldHavePassed === null).length,
  };
}

/**
 * The counterfactual as the agent is told it: how much is still waiting on a person, and
 * nothing about what would happen to any of it. No pass/fail split, because a split is an
 * aggregate statement about totals relative to the boundary.
 *
 * `namedHolds` is shorter than `heldCount` whenever an answer is held for sitting near the
 * boundary. The agent seeing that gap is intended: it learns that a person is needed
 * without learning who for.
 */
export type AgentUnattendedOutcome = {
  answerCount: number;
  heldCount: number;
  releasableCount: number;
  namedHolds: AgentHold[];
  needsHuman: boolean;
};

export function unattendedOutcomeForAgent(session: Session): AgentUnattendedOutcome {
  const heldCount = holdsFor(session).length;

  return {
    answerCount: session.answers.length,
    heldCount,
    releasableCount: releasableAnswerIds(session).length,
    namedHolds: agentVisibleHolds(session),
    needsHuman: heldCount > 0,
  };
}

/**
 * What confirming a release would actually do, counted. For the teacher, and for the teacher
 * only: it is a pass/fail split over a named set of answers, which is the most concentrated
 * page-owned number on the whole page.
 *
 * It exists so the comparison table beside it is arithmetic done once, in the domain, rather
 * than three sums written into a component. The set is recomputed from the session rather than
 * read from `releaseRequest`, for the same reason `confirmRelease` recomputes it: a hold raised
 * after the request was staged has to count.
 */
export type ReleaseOutcome = {
  /** Answers that would leave the page. */
  releasable: number;
  wouldPass: number;
  wouldFail: number;
  /** Still waiting on a person afterwards. */
  stillHeld: number;
};

export function releaseOutcome(session: Session): ReleaseOutcome {
  const releasable = releasableAnswerIds(session);
  const totals = releasable.map((id) => session.marks[id]?.total ?? null);

  return {
    releasable: releasable.length,
    wouldPass: totals.filter((total) => total !== null && total >= session.rubric.passBoundary)
      .length,
    wouldFail: totals.filter((total) => total !== null && total < session.rubric.passBoundary)
      .length,
    stillHeld: holdsFor(session).length,
  };
}

/**
 * The same stack under each care setting, side by side. For the teacher: it is the only place the
 * cost of caution is legible, and the trade-off runs the wrong way from intuition — more care means
 * more held, which means fewer marks reaching students today.
 *
 * Each row is computed by asking the existing rules about a session that differs only in its
 * emphasis. Nothing is committed and nothing is written: `holdsFor` and `releasableAnswerIds` are
 * pure, so a projection is just a call with a different argument. That is deliberate — a comparison
 * built by re-implementing the hold rules would drift away from the rules that actually run.
 */
export type PolicyProjection = {
  emphasis: Emphasis;
  selected: boolean;
  /** Below the current setting, and therefore refused by `setMarkingEmphasis`. */
  locked: boolean;
  held: number;
  releasable: number;
  wouldPass: number;
  wouldFail: number;
  wouldGoUnmarked: number;
};

export function comparePolicies(session: Session): PolicyProjection[] {
  const current = EMPHASIS_ORDER.indexOf(session.emphasis);

  return EMPHASIS_ORDER.map((emphasis, index) => {
    const probe: Session = { ...session, emphasis };
    const holds = holdsFor(probe);
    const outcome = releaseOutcome(probe);

    return {
      emphasis,
      selected: emphasis === session.emphasis,
      locked: index < current,
      held: holds.length,
      releasable: outcome.releasable,
      wouldPass: outcome.wouldPass,
      wouldFail: outcome.wouldFail,
      wouldGoUnmarked: holds.filter((hold) => session.marks[hold.answerId] === undefined).length,
    };
  });
}
