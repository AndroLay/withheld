import { type Session } from "../domain/session.ts";

/**
 * The band directly under the bar: the claim in one sentence, and the whole stack in four figures.
 *
 * The claim is here rather than further down because the thing worth noticing on this page is an
 * absence — no tool can send a grade, and no number the page owns is in anything an agent receives.
 * An absence is invisible on arrival. A reader who lands straight in three dense columns reads a
 * marking dashboard and moves on.
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
export function Intro({
  session,
  held,
}: {
  session: Session;
  held: number;
}) {
  const answers = session.answers.length;
  const marked = Object.keys(session.marks).length;
  const staged = session.releaseRequest?.answerIds.length ?? 0;

  const counts: readonly (readonly [number, string])[] = [
    [answers, "answers"],
    [marked, "marked"],
    [held, "held"],
    [staged, "staged"],
  ];

  return (
    <section className="band" aria-label="What this page is, and what it is holding">
      <p className="band__said">The page owns the decision.</p>

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
