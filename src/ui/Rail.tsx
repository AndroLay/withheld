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
 * Who may do what, as fifteen cells rather than three paragraphs.
 *
 * The empty cells are the argument. Holding belongs to the page alone because it is a rule and not a
 * choice: `holdsFor` derives every held answer from the session, and there is no call — by a tool or
 * by a click — that names one. Sending is the mirror of it, a person and no tool at all, which is why
 * that cell carries a lock rather than a tick.
 *
 * Every column is a code path. Read is the six read tools, and the page drawing the same answers.
 * Propose is `proposeMarks`, reached by `propose_marks` and by the form in each queue row, which is why
 * both callers have it. Score is `computeMark`, which neither caller can reach: the agent hands over
 * rubric line ids and the page does the arithmetic behind them.
 *
 * It replaced three paragraphs saying the same thing at eight times the length. A reader looking for
 * "can an agent send a mark?" was reading prose for it; now they look down a column.
 */
const CAN = ["Read", "Propose", "Hold", "Score", "Send"] as const;

/** What each cell says to a screen reader, which cannot see that a dot is hollow. */
const SAYS = { yes: "yes", no: "no", only: "only you" } as const;

const AUTHORITY = [
  { who: "Agent", cells: ["yes", "yes", "no", "no", "no"] },
  { who: "You", cells: ["yes", "yes", "no", "no", "only"] },
  { who: "Page", cells: ["yes", "no", "yes", "yes", "no"] },
] as const;

/**
 * The four steps, in the order they happen. The fourth is the one no tool can reach.
 *
 * Each step used to carry a sentence of its own, and the four of them said what the matrix above now
 * says in fifteen cells and what the queue to the right demonstrates in fourteen rows. What is left is
 * the order, which is the only part a reader cannot get from either.
 */
const FLOW = [
  { icon: "eye", who: "your agent", title: "It reads the pile" },
  { icon: "tag", who: "your agent", title: "It names ideas, not marks" },
  { icon: "page", who: "this page", title: "The page does the sums" },
  { icon: "person", who: "only you", title: "You send them, or you don't" },
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
 * The four steps, with the reader's place in them marked. `current` is derived from what has
 * arrived, not from anything an agent claimed: the page cannot know that an agent is mid-read, only
 * that marks appeared, that it held something back, or that a release is waiting.
 *
 * It was a disclosure while each step carried a sentence, because left open it pushed the ledger off
 * the first screen. Four lines do not, so it is open again and the reader's place in the run is
 * legible without a click — one fewer thing to open on a first read of the page.
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The authority matrix. A real `<table>`, because it is one: three rows against five columns, and a
 * screen reader walking it needs the row and column headers to say which cell it is in.
 *
 * The dot is decoration and every cell also carries its answer in a word, off screen. A hollow ring
 * and a filled one are the same shape to a reader who cannot see either, and "no" is the half of this
 * table that matters.
 */
function Authority() {
  return (
    <table className="auth">
      <caption className="vh">
        Which of the three may read an answer, propose a mark, hold one back, work out the points, and
        send a mark to a student
      </caption>

      <thead>
        <tr>
          <td className="auth__corner" />
          {CAN.map((can) => (
            <th key={can} scope="col" className="auth__col">
              {can}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {AUTHORITY.map((row) => (
          <tr key={row.who}>
            <th scope="row" className="auth__who">
              {row.who}
            </th>
            {row.cells.map((cell, index) => (
              <td key={CAN[index]} className="auth__cell">
                <span className={`dot dot--${cell}`} aria-hidden="true">
                  {cell === "only" ? <Icon name="lock" size={9} /> : null}
                </span>
                <span className="vh">{SAYS[cell]}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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

      <h2 className="rail__head">Who can do what</h2>
      <Authority />
      <p className="auth__why">
        Fifteen cells, each one a code path rather than a promise. Holding is a rule and not a choice:
        the page names every answer it keeps back, and neither you nor an agent can name one. Sending
        is the mirror of that — a person, and no tool at all.
      </p>

      <Ledger session={session} />

      <Flow current={step} />
    </aside>
  );
}
