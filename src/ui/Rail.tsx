import {
  EMPHASIS_ORDER,
  holdsFor,
  policyFor,
  type Emphasis,
  type Session,
} from "../domain/session.ts";
import { Icon } from "./Icon.tsx";
import { ACTION_WORDING, EMPHASIS_LABEL, emphasisBlurb } from "./wording.ts";

/**
 * The left column: the policy this page is enforcing, who is allowed to do what, and what has
 * actually been written to the session. Every word in it is the page's own side — nothing here is
 * reported by an agent and nothing here is handed to one.
 *
 * It holds no figures about the stack. Everything is a control, a statement of the boundary, or a
 * count of what the page itself recorded, so the marks all live in the column to its right and there
 * is only ever one place to read one.
 */

/**
 * Who may do what, in three rows. The middle row is the only one with an absence in it, and the
 * absence is the product: there is no tool a page could offer that would let something else confirm.
 */
const ACTORS = [
  {
    icon: "robot",
    who: "Agent",
    what: "May read answers and the rubric, explain a mark, and propose one. It is never told what an idea is worth.",
  },
  {
    icon: "person",
    who: "Human",
    what: "May hold answers and release marks. Only a person can confirm, and there is no tool that could.",
  },
  {
    icon: "shield",
    who: "Page",
    what: "Owns the points, the pass mark, which answers are held back, and the final decision.",
  },
] as const;

/** The four steps, in the order they happen. The fourth is the one no tool can reach. */
const FLOW = [
  {
    icon: "eye",
    who: "your agent",
    title: "It reads the pile",
    body: "It may open any answer. Every body is handed over flagged as untrusted, because a student can write anything in it.",
  },
  {
    icon: "tag",
    who: "your agent",
    title: "It names ideas, not marks",
    body: "It reports which of your rubric's ideas it recognised. It is never told what one is worth, or where the pass mark sits.",
  },
  {
    icon: "page",
    who: "this page",
    title: "The page does the sums",
    body: "It turns those ideas into points, totals them itself, and keeps back every answer a person ought to see first.",
  },
  {
    icon: "person",
    who: "only you",
    title: "You send them, or you don't",
    body: "A mark reaches a student only when you press the control at the foot of this page. There is no tool for it.",
  },
] as const;

/**
 * The care setting, as a segmented control. `setMarkingEmphasis` refuses to lower it, so the settings
 * below the current one are disabled rather than hidden: a control that vanishes looks like a bug,
 * and the reason it cannot be pressed is the interesting part.
 *
 * The radios are real radios, moved off screen rather than replaced. The segment is a `<label>`, so a
 * click anywhere on it reaches the input, the arrow keys still walk the group, and the ring shows on
 * the segment because the input inside it has focus.
 */
function Care({
  session,
  onEmphasis,
}: {
  session: Session;
  onEmphasis: (emphasis: Emphasis) => void;
}) {
  const current = EMPHASIS_ORDER.indexOf(session.emphasis);
  const blurb = emphasisBlurb(policyFor(session.emphasis, session.basePolicy));

  return (
    <fieldset className="care">
      <legend className="care__legend">Care level</legend>

      <div className="care__seg">
        {EMPHASIS_ORDER.map((emphasis, index) => {
          const on = emphasis === session.emphasis;
          const locked = index < current;

          return (
            <label
              key={emphasis}
              className={`care__opt${on ? " care__opt--on" : ""}${locked ? " care__opt--locked" : ""}`}
            >
              <input
                className="care__radio"
                type="radio"
                name="emphasis"
                value={emphasis}
                checked={on}
                disabled={locked}
                onChange={() => onEmphasis(emphasis)}
              />
              <span className="care__word">{EMPHASIS_LABEL[emphasis]}</span>
            </label>
          );
        })}
      </div>

      {/* Read off the policy rather than written beside it. Both numbers in the sentence are the
          page's own, and no tool is ever told either. */}
      <p className="care__says">{`${blurb.charAt(0).toUpperCase()}${blurb.slice(1)}.`}</p>
      <p className="care__note">
        It can be raised and never lowered — by you or by an agent. A guard that can be turned down is
        how a held answer quietly stops being held.
      </p>
    </fieldset>
  );
}

/**
 * The receipt ledger. Every accepted state-changing action is in here whichever caller made it,
 * which is the point: a teacher can read back what an agent or a human did without asking the agent.
 *
 * Two shapes, because an empty ledger has nothing to disclose. With no receipts it is a plain box — the
 * state the target image draws — and a disclosure marker on it would promise something to open.
 */
function Ledger({ session }: { session: Session }) {
  const count = session.receipts.length;

  if (count === 0) {
    return (
      <div className="ledger">
        <p className="ledger__label">Audit ledger</p>
        <p className="ledger__count">
          <span className="num">0</span> actions recorded
        </p>
      </div>
    );
  }

  return (
    <details className="ledger ledger--some">
      <summary className="ledger__head">
        <span className="ledger__label">Audit ledger</span>
        <span className="ledger__count">
          <span className="num">{count}</span> {count === 1 ? "action" : "actions"} recorded
        </span>
        <span className="ledger__caret" aria-hidden="true">
          <Icon name="down" size={13} />
        </span>
      </summary>

      <ol className="ledger__list">
        {session.receipts.map((receipt) => (
          <li key={receipt.id} className="ledger__row">
            <span className="ledger__action">{ACTION_WORDING[receipt.action]}</span>
            {receipt.answerIds.length > 0 ? (
              <span className="ledger__scope">
                <span className="num">{receipt.answerIds.length}</span> answers
              </span>
            ) : null}
            <span className="ledger__id num">{receipt.id}</span>
          </li>
        ))}
      </ol>

      <p className="ledger__note">
        Written by the page, never by the caller. The revision is this session's only clock — there is
        no wall time anywhere in it.
      </p>
    </details>
  );
}

/**
 * The four steps, below the first screen, with the reader's place in them marked. `current` is
 * derived from what has arrived, not from anything an agent claimed: the page cannot know that an
 * agent is mid-read, only that marks appeared, that it held something back, or that a release is
 * waiting.
 */
function Flow({ current }: { current: number }) {
  return (
    <section className="flow" aria-labelledby="flow-title">
      <h2 className="rail__head" id="flow-title">
        How a mark gets made
      </h2>
      <ol className="flow__list">
        {FLOW.map((entry, index) => {
          const no = index + 1;
          const state = no === current ? "now" : no < current ? "done" : "ahead";

          return (
            <li
              key={entry.title}
              className={`step step--${state}`}
              aria-current={no === current ? "step" : undefined}
            >
              <span className="step__badge" aria-hidden="true">
                <Icon name={entry.icon} size={14} />
              </span>
              <span className="step__who">
                {entry.who}
                {no === current ? <span className="step__here"> · you are here</span> : null}
              </span>
              <h3 className="step__act">{entry.title}</h3>
              <p className="step__gloss">{entry.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Rail({
  session,
  onEmphasis,
}: {
  session: Session;
  onEmphasis: (emphasis: Emphasis) => void;
}) {
  const holds = holdsFor(session);

  /**
   * Which of the four steps the reader is standing in, derived here rather than passed in, because
   * every term of it is a fact about the session this column already holds.
   */
  const step =
    session.releaseRequest !== null
      ? 4
      : Object.keys(session.marks).length === 0
        ? 1
        : holds.length > 0
          ? 3
          : 2;

  return (
    <aside className="rail" aria-label="The policy this page is enforcing, and who may do what">
      <h2 className="rail__head rail__head--first">Policy</h2>

      <Care session={session} onEmphasis={onEmphasis} />

      <div className="rail__rule" />

      <h2 className="rail__head" id="actors-title">
        Who can do what
      </h2>
      <ul className="actors" aria-labelledby="actors-title">
        {ACTORS.map((actor) => (
          <li key={actor.who} className="actor">
            <span className="actor__badge" aria-hidden="true">
              <Icon name={actor.icon} size={17} />
            </span>
            <h3 className="actor__who">{actor.who}</h3>
            <p className="actor__what">{actor.what}</p>
          </li>
        ))}
      </ul>

      <Ledger session={session} />

      <Flow current={step} />
    </aside>
  );
}
