/**
 * Withheld — the page's marking session.
 *
 * `marks.ts` owns the arithmetic. This file owns the authority: what gets held back for a
 * human, what an agent is allowed to change, and what only a person can do. Every function
 * here is pure — a write returns a new session — so the escalation rules can be asserted
 * exactly without a model in the loop.
 *
 * Two rules shape the whole file.
 *
 * An agent may ask the page to be *more* careful, never less. `set_marking_emphasis` can
 * only widen the criteria for holding an answer back, so there is no setting an injected
 * instruction could reach for to make the page release more.
 *
 * The page tells the agent less than it tells the teacher. The teacher sees that an answer
 * sits two marks short of a pass; the agent is told only that the page reserved it. Telling
 * the agent which answers sit on the cliff would hand over the boundary one bit at a time,
 * and would tell an injected instruction exactly which answer is worth attacking.
 */

import {
  computeMark,
  distanceFromBoundary,
  type AgentFinding,
  type Mark,
  type Rubric,
} from "./marks.ts";

/** A student answer. Alias only — the demo carries no personal data. */
export type Answer = {
  id: string;
  studentAlias: string;
  questionId: string;
  /** Untrusted text. Never interpreted as an instruction by anything in this file. */
  body: string;
};

/** How careful the page is being. An agent may raise this; nothing may lower it. */
export type Emphasis = "standard" | "cautious" | "most-cautious";

export const EMPHASIS_ORDER: readonly Emphasis[] = ["standard", "cautious", "most-cautious"];

/** Page-owned thresholds. None of these ever crosses the tool boundary. */
export type MarkingPolicy = {
  /** Hold any total that lands this close to the pass boundary, either side of it. */
  boundaryBand: number;
  /** Hold any answer at least this long that matched no rubric line at all. */
  longAnswerCharacters: number;
};

export const STANDARD_POLICY: MarkingPolicy = { boundaryBand: 4, longAnswerCharacters: 240 };

/**
 * Widening only, and monotonically. Each step up holds a wider band around the boundary
 * and treats a shorter answer as substantial, so a higher emphasis can never hold fewer
 * answers than a lower one. `tests/session.test.mts` asserts that.
 */
export function policyFor(emphasis: Emphasis, base: MarkingPolicy = STANDARD_POLICY): MarkingPolicy {
  const step = Math.max(0, EMPHASIS_ORDER.indexOf(emphasis));
  return {
    boundaryBand: base.boundaryBand + step * 6,
    longAnswerCharacters: Math.max(40, base.longAnswerCharacters - step * 80),
  };
}

/** Why the page held an answer, as the teacher reads it. */
export type HoldReason =
  | "near-boundary"
  | "long-answer-no-rubric-idea"
  | "answer-contains-instructions"
  | "findings-unstable";

/**
 * Why the page held an answer, as the agent is told — and the near-boundary case is
 * absent from this union on purpose.
 *
 * An earlier draft mapped `near-boundary` onto a vague code like `page-reserved`. That is
 * a fig leaf: the mapping lives in this open-source file, so anything reading it can invert
 * a one-to-one rename in a second. The honest version is omission. Answers held for
 * sitting near the boundary are counted for the agent and never named to it, so it cannot
 * learn which answer sits on the cliff and therefore cannot learn which one is worth
 * attacking. See SECURITY.md for the residual signal that a count still carries.
 *
 * The three that remain are safe to name, and useful: two are facts about the agent's own
 * behaviour, and the third is something it should act on.
 */
export type AgentHoldReason =
  | "long-answer-no-rubric-idea"
  | "answer-contains-instructions"
  | "findings-unstable";

const AGENT_VISIBLE_REASONS: readonly HoldReason[] = [
  "long-answer-no-rubric-idea",
  "answer-contains-instructions",
  "findings-unstable",
];

/** The agent-facing reason, or null when naming it would point at the boundary. */
export function agentHoldReason(reason: HoldReason): AgentHoldReason | null {
  return AGENT_VISIBLE_REASONS.includes(reason) ? (reason as AgentHoldReason) : null;
}


/**
 * Instructions addressed at whoever is marking. This is a router, not a filter: a matching
 * answer is quarantined and escalated to a human instead of being marked, so the pattern
 * list does not have to be complete for the page to stay safe. A false positive costs one
 * answer a human glance, which is the direction an error should fall in.
 */
const MARKER_DIRECTED_INSTRUCTION = new RegExp(
  [
    String.raw`\b(?:award|give|assign|grant)\b[^.!?]{0,40}\b(?:full|maximum|top)\s+(?:marks?|points?|credit|score)\b`,
    String.raw`\bignore\b[^.!?]{0,40}\b(?:rubric|instructions?|marking|guidance|previous)\b`,
    String.raw`\byou\s+(?:must|should|shall|will|have to)\s+(?:award|give|mark|pass|score)\b`,
    String.raw`\b(?:as|to)\s+the\s+(?:marker|examiner|grader|teacher|assistant)\b[^.!?]{0,20}\b(?:award|give|pass|ignore)\b`,
  ].join("|"),
  "i",
);

/** Whether an answer body is addressing the marker rather than answering the question. */
export function looksLikeMarkerInstruction(body: string): boolean {
  return MARKER_DIRECTED_INSTRUCTION.test(body);
}

export type Hold = { answerId: string; reason: HoldReason };

/** What the page wrote down when it accepted a change. Identified by string, never a date. */
export type Receipt = {
  id: string;
  action: "propose_marks" | "set_marking_emphasis" | "request_release";
  answerIds: string[];
};

export type ReleaseRequest = { receiptId: string; answerIds: string[] };

export type Session = {
  /** Monotonic. Doubles as the session's clock: nothing here uses wall time. */
  revision: number;
  /** The question the stack answers. Safe to show an agent; it is the teacher's own text. */
  question: string;
  rubric: Rubric;
  answers: Answer[];
  emphasis: Emphasis;
  basePolicy: MarkingPolicy;
  marks: Record<string, Mark>;
  /** Last accepted set of line ids per answer, sorted and joined. Detects a wobbly agent. */
  fingerprints: Record<string, string>;
  /** Answers that addressed the marker. Never marked, always escalated. */
  quarantined: string[];
  /** Answers the agent marked twice, differently. */
  unstable: string[];
  receipts: Receipt[];
  releaseRequest: ReleaseRequest | null;
  releasedAnswerIds: string[];
};

export function createSession(
  rubric: Rubric,
  answers: Answer[],
  options: { question?: string; basePolicy?: MarkingPolicy } = {},
): Session {
  return {
    revision: 1,
    question: options.question ?? "",
    rubric,
    answers,
    emphasis: "standard",
    basePolicy: options.basePolicy ?? STANDARD_POLICY,
    marks: {},
    fingerprints: {},
    quarantined: [],
    unstable: [],
    receipts: [],
    releaseRequest: null,
    releasedAnswerIds: [],
  };
}

/**
 * Holds are derived, not stored, so raising the emphasis re-decides every answer at once
 * rather than leaving earlier decisions standing at the old threshold.
 *
 * Order is priority order. An answer that addressed the marker is reported as that and
 * nothing else, because it is the fact a teacher needs first.
 */
export function holdsFor(session: Session): Hold[] {
  const policy = policyFor(session.emphasis, session.basePolicy);
  const holds: Hold[] = [];

  for (const answer of session.answers) {
    if (session.quarantined.includes(answer.id)) {
      holds.push({ answerId: answer.id, reason: "answer-contains-instructions" });
      continue;
    }

    const mark = session.marks[answer.id];
    if (!mark) continue; // Not marked yet. Pending is not the same as held.

    if (session.unstable.includes(answer.id)) {
      holds.push({ answerId: answer.id, reason: "findings-unstable" });
      continue;
    }

    if (mark.awardedLineIds.length === 0 && answer.body.length >= policy.longAnswerCharacters) {
      holds.push({ answerId: answer.id, reason: "long-answer-no-rubric-idea" });
      continue;
    }

    if (Math.abs(distanceFromBoundary(session.rubric, mark)) <= policy.boundaryBand) {
      holds.push({ answerId: answer.id, reason: "near-boundary" });
    }
  }

  return holds;
}

/** Marked, not held, not already gone. The only answers a release may touch. */
export function releasableAnswerIds(session: Session): string[] {
  const held = new Set(holdsFor(session).map((hold) => hold.answerId));

  return session.answers
    .map((answer) => answer.id)
    .filter((id) => session.marks[id] !== undefined)
    .filter((id) => !held.has(id))
    .filter((id) => !session.releasedAnswerIds.includes(id));
}

/**
 * Structured refusal. Every write can fail this way, and the message carries no digits so
 * that no refusal path can become the leak the rest of the design is guarding against.
 */
export type RefusalCode =
  | "stale-revision"
  | "unknown-answer"
  | "already-released"
  | "emphasis-cannot-be-lowered"
  | "nothing-to-release"
  | "invalid-argument";

export type Refusal = { ok: false; code: RefusalCode; message: string };
export type Commit = { ok: true; session: Session; receipt: Receipt };
export type Outcome = Commit | Refusal;

const REFUSAL_MESSAGE: Record<RefusalCode, string> = {
  "stale-revision": "the stack moved on since you read it; read it again and retry",
  "unknown-answer": "no answer on this stack has that id",
  "already-released": "that answer has gone to the student and cannot be marked again",
  "emphasis-cannot-be-lowered": "emphasis may be raised but never lowered",
  "nothing-to-release": "nothing is both marked and unheld, so there is nothing to release",
  "invalid-argument": "the arguments did not match what this tool accepts",
};

/** Build a refusal from outside this module — the tool layer's argument checks use it. */
export function refusal(code: RefusalCode): Refusal {
  return { ok: false, code, message: REFUSAL_MESSAGE[code] };
}

function refuse(code: RefusalCode): Refusal {
  return refusal(code);
}

/** Bump the revision and write the receipt. The only way state changes in this file. */
function commit(
  session: Session,
  patch: Partial<Session>,
  action: Receipt["action"],
  answerIds: string[],
): Commit {
  const revision = session.revision + 1;
  const receipt: Receipt = { id: `rcp-${revision}`, action, answerIds };
  const next: Session = {
    ...session,
    ...patch,
    revision,
    receipts: [...session.receipts, receipt],
  };

  return { ok: true, session: next, receipt };
}

function fingerprint(mark: Mark): string {
  return [...mark.awardedLineIds].sort().join("+");
}

/**
 * The agent's main move: here are the rubric ideas I recognised. The page decides what
 * that is worth, whether it believes the agent this time, and whether a human must look.
 *
 * The whole batch is refused if any id is unknown or already released. Partial acceptance
 * would leave the agent guessing which half landed, and guessing is the thing this design
 * is trying to remove.
 */
export function proposeMarks(
  session: Session,
  findings: AgentFinding[],
  expectedRevision: number,
): Outcome {
  if (expectedRevision !== session.revision) return refuse("stale-revision");

  const byId = new Map(session.answers.map((answer) => [answer.id, answer]));

  for (const finding of findings) {
    if (!byId.has(finding.answerId)) return refuse("unknown-answer");
    if (session.releasedAnswerIds.includes(finding.answerId)) return refuse("already-released");
  }

  const marks = { ...session.marks };
  const fingerprints = { ...session.fingerprints };
  const quarantined = [...session.quarantined];
  const unstable = [...session.unstable];

  for (const finding of findings) {
    const answer = byId.get(finding.answerId);
    if (!answer) continue;

    // Quarantine wins over marking. An answer that addressed the marker does not get a
    // mark at all, so there is no number for a later step to release by accident.
    if (looksLikeMarkerInstruction(answer.body)) {
      if (!quarantined.includes(answer.id)) quarantined.push(answer.id);
      delete marks[answer.id];
      continue;
    }

    const mark = computeMark(session.rubric, finding);
    const print = fingerprint(mark);
    const previous = fingerprints[answer.id];

    if (previous !== undefined && previous !== print && !unstable.includes(answer.id)) {
      unstable.push(answer.id);
    }

    marks[answer.id] = mark;
    fingerprints[answer.id] = print;
  }

  return commit(
    session,
    { marks, fingerprints, quarantined, unstable },
    "propose_marks",
    findings.map((finding) => finding.answerId),
  );
}

/** Raise how careful the page is. Lowering it is refused, not silently ignored. */
export function setMarkingEmphasis(
  session: Session,
  emphasis: Emphasis,
  expectedRevision: number,
): Outcome {
  if (expectedRevision !== session.revision) return refuse("stale-revision");

  const current = EMPHASIS_ORDER.indexOf(session.emphasis);
  const wanted = EMPHASIS_ORDER.indexOf(emphasis);
  if (wanted < current) return refuse("emphasis-cannot-be-lowered");

  return commit(session, { emphasis }, "set_marking_emphasis", []);
}

/**
 * The agent asks for the unheld marks to go out. Asking is all it can do: this records a
 * request and nothing leaves the page. `confirmRelease` below is the human's action and is
 * deliberately unreachable from the tool surface — there is no `confirm_release` tool.
 */
export function requestRelease(session: Session, expectedRevision: number): Outcome {
  if (expectedRevision !== session.revision) return refuse("stale-revision");

  const answerIds = releasableAnswerIds(session);
  if (answerIds.length === 0) return refuse("nothing-to-release");

  const committed = commit(session, {}, "request_release", answerIds);
  return {
    ...committed,
    session: {
      ...committed.session,
      releaseRequest: { receiptId: committed.receipt.id, answerIds },
    },
  };
}

/**
 * The teacher's click. Not exported to the tool layer, not wrapped in a tool, and not
 * callable by an agent under any name. Releases exactly the answers the request named, and
 * re-checks that each is still releasable, so a hold raised between the request and the
 * click still wins.
 */
export function confirmRelease(session: Session): Session {
  const request = session.releaseRequest;
  if (!request) return session;

  const stillFine = new Set(releasableAnswerIds(session));
  const going = request.answerIds.filter((id) => stillFine.has(id));

  return {
    ...session,
    revision: session.revision + 1,
    releaseRequest: null,
    releasedAnswerIds: [...session.releasedAnswerIds, ...going],
  };
}

/** The teacher declines. The request is dropped; nothing is released. */
export function declineRelease(session: Session): Session {
  if (!session.releaseRequest) return session;
  return { ...session, revision: session.revision + 1, releaseRequest: null };
}






\n