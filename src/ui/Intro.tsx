import { type Answer, type HoldReason, type Session } from "../domain/session.ts";
import { type Lens } from "./lens.tsx";

/**
 * The band directly under the bar: the claim in one sentence, the whole class as one strip of cells,
 * and the four figures that strip adds up to.
 *
 * The claim is here rather than further down because the thing worth noticing on this page is an
 * absence — no tool can send a grade, and no number the page owns is in anything an agent receives.
 * An absence is invisible on arrival. A reader who lands straight in three dense columns reads a
 * marking dashboard and moves on.
 *
 * The strip is the overview the queue's pager used to buy: fourteen cells, one per answer, in arrival
 * order, each one outlined, filled or hatched. It is a fourteen-word summary of a page that otherwise
 * takes a scroll to survey, and it is where an agent working through the class becomes visible as
 * motion rather than as a number that went up.
 *
 * None of the four figures is typed. They are the session as it stands, which is why they read
 * `14 / 0 / 0 / 0` on arrival and move together when anything is marked. The target image draws
 * `14 / 0 / 1 / 0` — one answer held with nothing marked — and that state is not reachable here: a
 * hold is derived from a mark, so an unmarked stack holds nothing. The counters are live rather than
 * drawn, and `docs/DECISIONS.md` D-27 records the departure.
 *
 * The live region is always in the DOM and only its contents change; a region added at the same
 * moment as its text is not reliably announced. It is visually hidden because the figures beside it
 * already say the same thing to a reader who can see them.
 */

/** What one cell is. Four states, the same four the queue's rows carry, plus one qualifier. */
type Cell = {
  answer: Answer;
  folio: number;
  kind: "sent" | "ready" | "held" | "quar" | "waiting";
  word: string;
  /** True when the page's reason for holding is one it will not name to an agent. */
  secret: boolean;
};

const CELL_WORD: Record<Cell["kind"], string> = {
  sent: "sent",
  ready: "ready to send",
  held: "held for you",
  quar: "quarantined",
  waiting: "not marked",
};

/** Whose view, as the two buttons name it. "Yours" is the reader's, not the page's. */
const LENS_WORD: Record<Lens, string> = {
  yours: "Your view",
  agent: "Agent's view",
};

function cellsOf(session: Session, heldReason: ReadonlyMap<string, HoldReason>): Cell[] {
  return session.answers.map((answer, index) => {
    const reason = heldReason.get(answer.id) ?? null;
    const kind: Cell["kind"] = session.releasedAnswerIds.includes(answer.id)
      ? "sent"
      : reason === "answer-contains-instructions"
        ? "quar"
        : reason !== null
          ? "held"
          : session.marks[answer.id] !== undefined
            ? "ready"
            : "waiting";

    return {
      answer,
      folio: index + 1,
      kind,
      word: CELL_WORD[kind],
      // The band around the pass mark is the one hold the agent is counted and never named, and this
      // flag marks those cells for the teacher: these are the holds your agent cannot see. It is a
      // teacher-only mark by construction — in the agent's view this function is handed
      // `agentVisibleHolds`, which has no `near-boundary` in it, so the cell arrives here as `ready`
      // and the flag is false. Nothing hides it; there is nothing to hide.
      secret: reason === "near-boundary",
    };
  });
}

export function Intro({
  session,
  held,
  heldReason,
  lens,
  onLens,
}: {
  session: Session;
  held: number;
  heldReason: ReadonlyMap<string, HoldReason>;
  lens: Lens;
  onLens: (lens: Lens) => void;
}) {
  const answers = session.answers.length;
  const marked = Object.keys(session.marks).length;
  const staged = session.releaseRequest?.answerIds.length ?? 0;
  const cells = cellsOf(session, heldReason);

  // In the agent's view the map it was handed is `agentVisibleHolds`, so its size is how many holds
  // the agent can name and the difference is how many it is only counted. In yours the two are equal
  // and the difference is zero, which is why this needs no branch on the lens.
  const unnamed = held - heldReason.size;

  const counts: readonly (readonly [number, string])[] = [
    [answers, "answers"],
    [marked, "marked"],
    [held, "held"],
    [staged, "staged"],
  ];

  return (
    <section className="band" aria-label="What this page is, and what it is holding">
      <p className="band__said">The page owns the decision.</p>

      {/*
        Two buttons rather than one that flips, because the state a reader is not in is the one worth
        naming: a single control reading "Agent's view" cannot say whether that is where you are or
        where you would go. `aria-pressed` carries the same fact to a screen reader.

        Sentence case, like the queue's own controls: capitals on this page mean a control that acts on
        the marking, and this one only changes what is drawn. `docs/DECISIONS.md` D-33.
      */}
      <div className="lens" role="group" aria-label="Whose view of this session">
        {(["yours", "agent"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`lens__btn${option === lens ? " lens__btn--on" : ""}`}
            aria-pressed={option === lens}
            onClick={() => onLens(option)}
          >
            {LENS_WORD[option]}
          </button>
        ))}
      </div>

      {lens === "agent" ? (
        <p className="lens__said">
          The same session with every page-owned value gone: no total, no point value, no pass mark,
          no band.{" "}
          {unnamed > 0 ? (
            <>
              <span className="num">{unnamed}</span> of the <span className="num">{held}</span>{" "}
              answers this page is holding are not named to your agent, so they are drawn here as what
              the agent believes them to be.
            </>
          ) : (
            "Nothing is being held for sitting inside the band, so every hold in the strip is one your agent can see."
          )}
        </p>
      ) : null}

      {/*
        Anchors rather than buttons, for the same reason the bar above uses them: this strip moves a
        reader down the page and performs nothing. Every row it points at is rendered, so the jump
        lands whatever is open.

        The alias rides in a data attribute and is drawn by the stylesheet's `content: attr(...)`
        rather than by a hidden span. Both would look the same; a span would put fourteen aliases and
        fourteen state words into `innerText`, which is the figure the density measurements in
        `docs/design/README.md` are taken from. The accessible name comes off `aria-label` either way.
      */}
      <ol className="cells" aria-label={`All ${answers} answers, in arrival order`}>
        {cells.map((cell) => (
          <li key={cell.answer.id} className="cells__slot">
            <a
              className={`cell cell--${cell.kind}${cell.secret ? " cell--secret" : ""}`}
              href={`#line-${cell.answer.id}`}
              aria-label={`${cell.answer.studentAlias}, ${cell.word}`}
              data-who={`${cell.answer.studentAlias} · ${cell.word}`}
            >
              <span className="cell__folio num" aria-hidden="true">
                {String(cell.folio).padStart(2, "0")}
              </span>
            </a>
          </li>
        ))}
      </ol>

      {/*
        What the shading means, in words, because the strip's own state words live in `data-who` and
        `aria-label` — a pointer or a screen reader reaches them and a still image does not. Anyone
        reading a screenshot of this page had four shades and no key.

        It shares its row with the four counters rather than taking one of its own, so the band pays
        no extra height for it. Two clauses are conditional: the heavy edge is drawn only when such a
        cell exists, which in the agent's view is never — that view is built from `agentVisibleHolds`
        and has no unnamed hold to mark — and the overlap note waits until something is marked,
        because `14 / 0 / 0 / 0` cannot be misread as four parts of a whole. Neither clause carries a
        digit, so the agent's view carries this line unchanged.
      */}
      <p className="band__key">
        Outlined is not marked, grey is ready to send, hatched is held for you, and black has gone to
        a student.
        {cells.some((cell) => cell.secret)
          ? " A heavy bottom edge means held for a reason your agent is not told."
          : ""}
        {marked > 0
          ? " Marked, held and staged are each counted out of the whole class, not four parts of it."
          : ""}
      </p>

      <div className="band__counts">
        {counts.map(([value, label]) => (
          <p key={label} className="count">
            <span className="count__num num">{value}</span>
            <span className="count__of">{label}</span>
          </p>
        ))}
      </div>

      <p className="vh" role="status">
        {marked > 0
          ? `${marked} of ${answers} answers marked. ${held} held back for you, and the audit rail says why.`
          : ""}
      </p>
    </section>
  );
}
