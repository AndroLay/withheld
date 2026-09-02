import { useState } from "react";

import { type Answer, type HoldReason, type Session, policyFor } from "../domain/session.ts";
import { explainMark } from "../domain/views.ts";
import { Chain } from "./Chain.tsx";
import { Icon } from "./Icon.tsx";
import { HOLD_CHAIN, HOLD_TAG, rubricMax } from "./wording.ts";

/**
 * The marking queue: one answer opened in full, the rest of the class as a list under it, and the
 * page's own arithmetic on both. Every figure in this column is shown to a person and none of it is
 * reachable from a tool — the agent's view of the same answer carries rubric line ids and nothing
 * that can be totalled.
 *
 * The list stays in arrival order and is never sorted by total. A marking page that ranks a class is
 * a leaderboard, and that is a different product with a different effect on a teacher.
 *
 * Three pieces of local state, none of it in the session: which answer is open in the card, which
 * slice of the list is on screen, and which subset is being looked at. None of them can change a
 * mark, and a reload puts all three back where they started.
 */

type State = "sent" | "held" | "marked" | "waiting";

const STATE_WORD: Record<State, string> = {
  sent: "sent",
  held: "held",
  marked: "ready",
  waiting: "not marked",
};

/** Which subset of the class is on screen. Every answer is reachable under every one of them. */
type View = "all" | "held" | "waiting";

const VIEW_WORD: Record<View, string> = {
  all: "All answers",
  held: "Held for you",
  waiting: "Not marked yet",
};

/** How many rows the list shows at once. The card above it is a fourth answer, opened in full. */
const PAGE = 3;

function stateOf(session: Session, answerId: string, heldReason: HoldReason | null): State {
  if (session.releasedAnswerIds.includes(answerId)) return "sent";
  if (heldReason) return "held";
  if (session.marks[answerId] !== undefined) return "marked";
  return "waiting";
}

/**
 * Marking by hand. The teacher ticks the same rubric ideas an agent would name, and the page does the
 * same arithmetic on them — the only difference is who read the answer.
 *
 * The ticks live in the form rather than in React state on purpose: the page reads them once, on
 * submit, so there is no half-entered mark sitting in state waiting to be committed by something else.
 */
function MarkForm({
  session,
  answerId,
  onSave,
}: {
  session: Session;
  answerId: string;
  onSave: (foundLineIds: string[]) => void;
}) {
  const awarded = new Set(session.marks[answerId]?.awardedLineIds ?? []);

  return (
    <form
      className="tick"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave(data.getAll("line").map(String));
      }}
    >
      <fieldset className="tick__set">
        <legend className="tick__legend">Which of these does the answer say?</legend>
        {session.rubric.lines.map((line) => (
          <label key={line.id} className="tick__line">
            <input
              className="tick__box"
              type="checkbox"
              name="line"
              value={line.id}
              defaultChecked={awarded.has(line.id)}
            />
            <span className="tick__label">{line.label}</span>
            <span className="tick__points num">{line.points}</span>
          </label>
        ))}
      </fieldset>
      <div className="tick__foot">
        <button type="submit" className="btn btn--go">
          Save this mark
        </button>
        <span className="tick__note">
          The points in this form are the page's own. No tool returns them.
        </span>
      </div>
    </form>
  );
}

/**
 * One sentence saying what the page did with this answer and why. Built from the hold rule that fired
 * rather than from the total, because the total is already printed beside it — and for three of the
 * four rules the total is not the reason.
 */
function verdict(
  state: State,
  heldReason: HoldReason | null,
  band: number,
  passBoundary: number,
  max: number,
  passes: boolean,
): string {
  if (state === "sent") return "Already sent. Marking is closed for this one.";
  if (state === "waiting") return "Not marked yet. Nothing has read this one.";

  switch (heldReason) {
    case "near-boundary":
      return `Within ${band} marks of the pass mark (${passBoundary} / ${max}), so the answer is held.`;
    case "long-answer-no-rubric-idea":
      return "A long answer that matched none of the rubric's ideas, so the page holds it rather than failing it.";
    case "answer-contains-instructions":
      return "The text addresses the marker instead of the question. It is quarantined, and carries no mark at all.";
    case "findings-unstable":
      return "Marked twice, differently. The second pass disagreed with the first, so a person decides.";
    default:
      return `${passes ? "Above" : "Below"} the pass mark (${passBoundary} / ${max}), and nothing about it tripped a rule.`;
  }
}

/** One rubric line, with the points the page attaches to it. No tool returns this column. */
function Line({ points, label }: { points: number; label: string }) {
  return (
    <li className="rl">
      <span className="rl__pt num">{points}</span>
      <em className="rl__label">{label}</em>
    </li>
  );
}

/**
 * The answer the queue is holding open: the student's text, what the page credited and did not, the
 * evidence the decision rests on, and its own account of the outcome.
 *
 * The target image labels the right-hand half "agent explanation" and "agent rationale". There is no
 * agent prose anywhere in this project — `propose_marks` accepts rubric line ids and nothing else, and
 * no model has ever called it — so the slot carries the page's own account instead. Printing invented
 * agent sentences on the one page whose argument is that a claim should be no wider than its evidence
 * is the single departure from the target that is not open to compromise. `docs/DECISIONS.md` D-27.
 */
function Focus({
  session,
  answer,
  folio,
  heldReason,
  max,
  band,
  onSave,
}: {
  session: Session;
  answer: Answer;
  folio: number;
  heldReason: HoldReason | null;
  max: number;
  band: number;
  onSave: (foundLineIds: string[]) => void;
}) {
  const state = stateOf(session, answer.id, heldReason);
  const explanation = explainMark(session, answer.id);
  const said = verdict(
    state,
    heldReason,
    band,
    session.rubric.passBoundary,
    max,
    explanation?.passes ?? false,
  );

  const credited = explanation?.awarded ?? [];
  const missed = explanation?.missed ?? [];
  const unattended =
    explanation === null
      ? "would have gone out with no mark on it at all"
      : `would have gone out as ${explanation.passes ? "a pass" : "a fail"}`;

  return (
    <article className="focus" aria-labelledby="focus-who">
      <div className="focus__head">
        <span className="focus__folio num">{String(folio).padStart(2, "0")}</span>
        <h2 className="focus__who" id="focus-who">
          {answer.studentAlias}
        </h2>
        <span className={`tagline tagline--${state}`}>{STATE_WORD[state]}</span>

        <p className="focus__label">Credited</p>
        <p className="focus__score">
          {explanation ? (
            <>
              <span className="focus__big num">{explanation.total}</span>
              <span className="focus__max num"> / {max}</span>
            </>
          ) : (
            <>
              <span className="focus__big focus__big--none" aria-hidden="true">
                —
              </span>
              <span className="vh">nothing credited yet</span>
            </>
          )}
        </p>

        <p className="focus__verdict">{said}</p>
      </div>

      <div className="focus__text">
        <p className="lab">Answer text</p>
        <blockquote className="focus__body">{answer.body}</blockquote>
        <p className="focus__hand">
          In the student's hand. This page did not write it, and it is handed to an agent flagged as
          untrusted.
        </p>
      </div>

      <FocusSplit
        alias={answer.studentAlias}
        credited={credited}
        missed={missed}
        heldReason={heldReason}
        state={state}
        unattended={unattended}
      />

      <details className="byhand">
        <summary className="byhand__head">
          <span className="byhand__label">Mark this answer by hand</span>
          <span className="byhand__caret" aria-hidden="true">
            <Icon name="down" size={13} />
          </span>
        </summary>
        {state === "sent" ? (
          <p className="byhand__shut">Already sent. Marking is closed for this one.</p>
        ) : (
          <MarkForm session={session} answerId={answer.id} onSave={onSave} />
        )}
      </details>
    </article>
  );
}

/**
 * The two halves under the answer: what the rubric paid for on the left with the evidence the
 * decision rests on, and what it did not pay for on the right with the page's account of the outcome.
 *
 * The three evidence rows name the three tools a reader could check this against — `read_answer`,
 * `read_rubric`, `preview_unattended_outcome` — so the claim in this card can be read against the
 * payloads printed in the black column to its right.
 */
function FocusSplit({
  alias,
  credited,
  missed,
  heldReason,
  state,
  unattended,
}: {
  alias: string;
  credited: readonly { id: string; label: string; points: number }[];
  missed: readonly { id: string; label: string; points: number }[];
  heldReason: HoldReason | null;
  state: State;
  unattended: string;
}) {
  const first = credited[0];
  const chain = heldReason ? HOLD_CHAIN[heldReason] : null;

  return (
    <div className="focus__split">
      <div className="focus__half">
        <p className="lab">Rubric lines credited</p>
        {credited.length > 0 ? (
          <ul className="rl__list">
            {credited.map((line) => (
              <Line key={line.id} points={line.points} label={line.label} />
            ))}
          </ul>
        ) : (
          <p className="focus__none">
            Nothing credited. The page shows an absence rather than a score of zero.
          </p>
        )}

        <div className="focus__rule" />

        <p className="lab">Evidence</p>
        <ul className="ev">
          <li className="ev__item">
            <span className="ev__pill">answer text</span>
            <span className="ev__what">{alias}'s own words, above</span>
          </li>
          <li className="ev__item">
            <span className="ev__pill">rubric line</span>
            <span className="ev__what">
              {first ? (
                <>
                  <span className="num">{first.points}</span> · {first.label}
                </>
              ) : (
                "no line matched"
              )}
            </span>
          </li>
          <li className="ev__item">
            <span className="ev__pill">unattended preview</span>
            <span className="ev__what">{unattended}</span>
          </li>
        </ul>
      </div>

      <div className="focus__half focus__half--right">
        <p className="lab">Not credited</p>
        {missed.length > 0 ? (
          <ul className="rl__list">
            {missed.map((line) => (
              <Line key={line.id} points={line.points} label={line.label} />
            ))}
          </ul>
        ) : (
          <p className="focus__none">
            {state === "waiting"
              ? "Nothing has been read yet, so nothing has been ruled out."
              : "Every idea in the rubric was credited."}
          </p>
        )}

        <div className="focus__rule" />

        <p className="lab">What the page decided</p>
        {chain ? (
          <Chain steps={chain} />
        ) : (
          <p className="focus__gloss">
            No rule fired on this one. It sits in the queue until a person stages a release.
          </p>
        )}
        <p className="focus__gloss">
          If nobody had looked, this {unattended}. The page is not saying that would be wrong — nobody
          knows that yet, which is what your review is for.
        </p>

        <a className="btn btn--quiet" href="#audit-title">
          View full explanation
        </a>
      </div>
    </div>
  );
}

/**
 * One answer as a row. `details` rather than a state-driven panel: the disclosure is the browser's
 * job, and one less piece of state is one less way for a teacher's half-finished mark to disagree with
 * what the page thinks it holds.
 *
 * The row's state cell names the rule rather than the word "held", because which rule fired is the
 * part a teacher acts on. The preview of the answer is truncated by the stylesheet and not by this
 * file: a reader who cannot see the truncation is read the whole body instead of an abbreviation.
 */
function Row({
  session,
  answer,
  folio,
  heldReason,
  max,
  focused,
  onSave,
}: {
  session: Session;
  answer: Answer;
  folio: number;
  heldReason: HoldReason | null;
  max: number;
  focused: boolean;
  onSave: (foundLineIds: string[]) => void;
}) {
  const state = stateOf(session, answer.id, heldReason);
  const mark = session.marks[answer.id];

  return (
    <li className={`line line--${state}${focused ? " line--on" : ""}`}>
      <details className="line__box">
        <summary className="line__head">
          <span className="line__folio num">{String(folio).padStart(2, "0")}</span>
          <span className="line__who">{answer.studentAlias}</span>
          <span className="line__peek">{answer.body}</span>

          <span className="line__score">
            {mark ? (
              <>
                <span className="vh">credited </span>
                <span className="line__total num">{mark.total}</span>
                <span className="line__max num"> / {max}</span>
              </>
            ) : (
              <>
                <span className="vh">nothing credited</span>
                <span className="line__nomark" aria-hidden="true">
                  —
                </span>
              </>
            )}
          </span>

          <span className={`line__state line__state--${state}`}>
            {heldReason ? HOLD_TAG[heldReason] : STATE_WORD[state]}
          </span>

          <span className="line__more" aria-hidden="true">
            <Icon name="dots" size={15} />
          </span>
        </summary>

        <div className="line__open">
          <figure className="hand">
            <blockquote className="hand__body">{answer.body}</blockquote>
            <figcaption className="hand__cap">
              In the student's hand. This page did not write it, and it is handed to an agent flagged
              as untrusted.
            </figcaption>
          </figure>
          {state === "sent" ? (
            <p className="line__shut">Already sent. Marking is closed for this one.</p>
          ) : (
            <MarkForm session={session} answerId={answer.id} onSave={onSave} />
          )}
        </div>
      </details>
    </li>
  );
}

export function Stack({
  session,
  heldReason,
  onSave,
  onMark,
}: {
  session: Session;
  heldReason: Map<string, HoldReason>;
  onSave: (answerId: string, foundLineIds: string[]) => void;
  onMark: () => void;
}) {
  const [view, setView] = useState<View>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const max = rubricMax(session.rubric.lines);
  const band = policyFor(session.emphasis, session.basePolicy).boundaryBand;

  // The folio is a position in the whole class, not in the current view, so an answer keeps the same
  // number whichever subset is on screen.
  const folio = new Map(session.answers.map((answer, index) => [answer.id, index + 1]));

  const shown = session.answers.filter((answer) => {
    if (view === "held") return heldReason.has(answer.id);
    if (view === "waiting") return session.marks[answer.id] === undefined;
    return true;
  });

  /**
   * Which answer the card holds open. An explicit choice wins; failing that the first answer the page
   * is holding back, which is the whole product — and failing that the top of the view.
   */
  const chosen = shown.findIndex((answer) => answer.id === selected);
  const firstHeld = shown.findIndex((answer) => heldReason.has(answer.id));
  const cursor = chosen >= 0 ? chosen : firstHeld >= 0 ? firstHeld : 0;
  const focus = shown[cursor] ?? null;

  // Clamped on read rather than corrected in state: changing the view must not have to write twice.
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const here = Math.min(page, pages - 1);
  const from = here * PAGE;
  const rows = shown.slice(from, from + PAGE);

  const nextFrom = ((here + 1) % pages) * PAGE;
  const nextCount = Math.min(PAGE, shown.length - nextFrom);

  /** Walk the card through the view one answer at a time, bringing the list along with it. */
  function move(delta: number) {
    const next = shown[cursor + delta];
    if (!next) return;
    setSelected(next.id);
    setPage(Math.floor((cursor + delta) / PAGE));
  }

  return (
    <section className="queue" aria-labelledby="stack-title">
      <div className="queue__head">
        {/* The page's one `h1`, and it is the work rather than the product name: the name is in the
            bar above, where it belongs to the whole page instead of to this column. */}
        <h1 className="queue__title" id="stack-title">
          Marking queue
        </h1>

        <label className="pick">
          <span className="vh">Which answers to show</span>
          <select
            className="pick__box"
            value={view}
            onChange={(event) => {
              setView(event.currentTarget.value as View);
              setPage(0);
            }}
          >
            {(["all", "held", "waiting"] as const).map((option) => (
              <option key={option} value={option}>
                {VIEW_WORD[option]}
              </option>
            ))}
          </select>
          <span className="pick__caret" aria-hidden="true">
            <Icon name="down" size={13} />
          </span>
        </label>

        <p className="queue__of">
          <span className="num">{shown.length}</span> of{" "}
          <span className="num">{session.answers.length}</span>
        </p>

        <div className="queue__walk">
          <button
            type="button"
            className="sq"
            disabled={cursor <= 0 || shown.length === 0}
            onClick={() => move(-1)}
          >
            <Icon name="up" size={15} />
            <span className="vh">Open the answer above</span>
          </button>
          <button
            type="button"
            className="sq"
            disabled={cursor >= shown.length - 1 || shown.length === 0}
            onClick={() => move(1)}
          >
            <Icon name="down" size={15} />
            <span className="vh">Open the answer below</span>
          </button>
        </div>
      </div>

      {focus === null ? (
        <div className="queue__empty">
          <p className="queue__lead">Nothing in this view.</p>
          <p>
            {view === "held"
              ? "The page is not holding anything back. Mark a few answers and it will start."
              : "Every answer in the class has a mark on it."}
          </p>
        </div>
      ) : (
        <Focus
          session={session}
          answer={focus}
          folio={folio.get(focus.id) ?? 0}
          heldReason={heldReason.get(focus.id) ?? null}
          max={max}
          band={band}
          onSave={(foundLineIds) => onSave(focus.id, foundLineIds)}
        />
      )}

      <ul className="list">
        {rows.map((answer) => (
          <Row
            key={answer.id}
            session={session}
            answer={answer}
            folio={folio.get(answer.id) ?? 0}
            heldReason={heldReason.get(answer.id) ?? null}
            max={max}
            focused={focus !== null && answer.id === focus.id}
            onSave={(foundLineIds) => onSave(answer.id, foundLineIds)}
          />
        ))}
      </ul>

      <div className="queue__foot">
        <button type="button" className="btn btn--quiet" onClick={onMark}>
          <Icon name="chip" size={14} />
          Mark all from the worked example
        </button>

        <p className="queue__showing">
          {rows.length === 0 ? (
            "Nothing to show"
          ) : (
            <>
              Showing <span className="num">{from + 1}</span>–
              <span className="num">{from + rows.length}</span> of{" "}
              <span className="num">{shown.length}</span>
            </>
          )}
        </p>

        <button
          type="button"
          className="pager"
          disabled={pages < 2}
          onClick={() => setPage((here + 1) % pages)}
        >
          Next <span className="num">{nextCount}</span>
          <Icon name="down" size={13} />
        </button>
      </div>

      <p className="queue__note">
        The worked example is a fixture in this page's own source, so the holds are reproducible
        without an agent. It is not a recording of one.
      </p>
    </section>
  );
}

\n