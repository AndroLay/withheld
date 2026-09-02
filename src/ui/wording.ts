import {
  type Emphasis,
  type HoldReason,
  type MarkingPolicy,
  type ReceiptAction,
} from "../domain/session.ts";

/**
 * Every hold reason, in three lengths. The short tag rides on a chip next to a name; the long
 * sentence is the explanation on the held entry; the chain is the same explanation as three
 * boxes, for readers who follow a diagram faster than a sentence.
 *
 * The wording is deliberately in a teacher's language rather than the domain's. `HoldReason`
 * is a union of internal codes and it stays that way, because renaming a code to read nicely
 * is how a code stops meaning what the escalation rule tests for.
 */
export const HOLD_TAG: Record<HoldReason, string> = {
  "near-boundary": "on the line",
  "long-answer-no-rubric-idea": "no idea matched",
  "answer-contains-instructions": "addressed the marker",
  "findings-unstable": "marked twice",
};

export const HOLD_WORDING: Record<HoldReason, string> = {
  "near-boundary":
    "sits close enough to the pass mark that a point either way changes the grade",
  "long-answer-no-rubric-idea": "long answer, but it matched none of the rubric ideas",
  "answer-contains-instructions": "the answer addresses the marker instead of the question",
  "findings-unstable": "marked twice, differently — the second pass disagreed with the first",
};

/**
 * Why the page did it, as a chain. Three links: what arrived, what rule it tripped, where it
 * ended up. The last link is the same for three of the four because that is the truth — almost
 * everything the page notices ends in the same place, which is a person.
 */
export const HOLD_CHAIN: Record<HoldReason, readonly [string, string, string]> = {
  "near-boundary": ["the page totalled it", "landed inside the boundary band", "held for you"],
  "long-answer-no-rubric-idea": [
    "a long answer arrived",
    "no rubric idea matched it",
    "held for you",
  ],
  "answer-contains-instructions": [
    "the text addressed the marker",
    "never marked at all",
    "quarantined for you",
  ],
  "findings-unstable": ["marked a second time", "the two passes disagreed", "held for you"],
};

/** The care setting, as a person chooses it rather than as the union spells it. */
export const EMPHASIS_LABEL: Record<Emphasis, string> = {
  standard: "Standard",
  cautious: "Cautious",
  "most-cautious": "Most cautious",
};

/**
 * What each recorded action is called in a teacher's language. Read by the audit ledger in the left
 * column and by the revision timeline in the right, so the two cannot describe the same write in two
 * different sets of words.
 */
export const ACTION_WORDING: Record<ReceiptAction, string> = {
  propose_marks: "marks proposed",
  set_marking_emphasis: "care setting raised",
  request_release: "release staged",
  human_release_confirmed: "release confirmed by human",
  human_release_declined: "release declined by human",
};

/**
 * What a care setting actually does, read off the policy rather than written down beside it.
 * Two numbers in a sentence, and both of them are the page's own — no tool is ever told either.
 */
export function emphasisBlurb(policy: MarkingPolicy): string {
  return `holds anything within ${policy.boundaryBand} marks of the pass mark, and any answer over ${policy.longAnswerCharacters} characters that matched nothing`;
}

/**
 * One quantised position on one axis, in whole steps of five percent.
 *
 * Everything the page draws proportionally — what an answer was credited, and where the pass mark
 * sits — is a length on its own rail in `Audit.tsx`, and both are measured against the same rubric
 * maximum, so the pair can be compared by eye. An earlier version measured the bar against the pass
 * boundary and drew the boundary as a tick above it, which put two different scales in one graphic;
 * two rails and one scale is the version that survived. Both lengths are printed as numbers beside
 * them as well, because a length is not a figure a reader can quote.
 *
 * The number has to leave here as a class name rather than a `style` attribute. The production
 * build is served under `style-src 'self'` with no `'unsafe-inline'`, which blocks the style
 * attribute outright, so a computed width would be dropped by the browser in the one environment
 * that matters. Twenty-one static classes, five percentage points apart, is the honest way to do
 * it — and `tests/styles.test.mts` asserts every one of them exists, because a missing rule draws
 * a bar of zero width and reads as a student who scored nothing.
 */
export function gaugeStop(value: number, max: number): number {
  if (max <= 0) return 0;
  const share = Math.min(1, Math.max(0, value / max));
  return Math.round(share * 20) * 5;
}

/** The rubric's ceiling: what a perfect answer would total. Page-owned, like every other number. */
export function rubricMax(lines: readonly { points: number }[]): number {
  return lines.reduce((running, line) => running + line.points, 0);
}
