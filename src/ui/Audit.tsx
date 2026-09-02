import { type Hold, type Session } from "../domain/session.ts";
import { explainMark } from "../domain/views.ts";
import { Chain } from "./Chain.tsx";
import { Icon } from "./Icon.tsx";
import { HOLD_CHAIN, HOLD_TAG, HOLD_WORDING, gaugeStop, rubricMax } from "./wording.ts";

/**
 * The audit, below the queue: for every answer the page kept back, why.
 *
 * Everything here is the teacher's side of the pair — totals, the pass mark, the distance between
 * them, and which rubric ideas were and were not credited. The agent's view of the same answer
 * carries rubric line ids and nothing that can be totalled, and for an answer held for sitting near
 * the boundary the agent is not even told the answer's name. That asymmetry is in
 * `src/domain/views.ts`, tested, and it is the product.
 *
 * One `<details>` per hold, the first open. The disclosure is the browser's, not a piece of state: a
 * list that remembered which entry was open would be one more thing to disagree with the session.
 */

/**
 * Two measures on one axis: what the page credited, and where the pass mark sits. Both are
 * quantised to whole steps of five percent because the width has to leave here as a class name —
 * `style-src 'self'` blocks the style attribute in the production build.
 */
function Bars({ total, max, passBoundary }: { total: number; max: number; passBoundary: number }) {
  const credited = gaugeStop(total, max);
  const boundary = gaugeStop(passBoundary, max);

  return (
    <div className="bars">
      <div className="bars__row">
        <span className="bars__label">Credited</span>
        <span className="bars__rail" aria-hidden="true">
          <span className={`bars__fill bars__fill--${credited}`} />
        </span>
        <span className="bars__value num">{total}</span>
      </div>
      <div className="bars__row bars__row--mark">
        <span className="bars__label">Pass mark</span>
        <span className="bars__rail" aria-hidden="true">
          <span className={`bars__fill bars__fill--${boundary}`} />
        </span>
        <span className="bars__value num">{passBoundary}</span>
      </div>
    </div>
  );
}

/** One rubric line, credited or not. The uncredited ones show a dash, never a zero. */
function Lines({
  label,
  lines,
  credited,
}: {
  label: string;
  lines: { id: string; label: string; points: number }[];
  credited: boolean;
}) {
  return (
    <>
      <p className="lab">{label}</p>
      <ul className="lines">
        {lines.map((line) => (
          <li
            key={line.id}
            className={credited ? "lines__row lines__row--yes" : "lines__row lines__row--no"}
          >
            <span className="lines__mark" aria-hidden="true">
              {credited ? "✓" : "·"}
            </span>
            <span className="lines__text">{line.label}</span>
            <span className="lines__points num" aria-hidden={credited ? undefined : true}>
              {credited ? line.points : "—"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Entry({
  session,
  hold,
  open,
  max,
}: {
  session: Session;
  hold: Hold;
  open: boolean;
  max: number;
}) {
  const explanation = explainMark(session, hold.answerId);
  const alias =
    explanation?.studentAlias ??
    session.answers.find((candidate) => candidate.id === hold.answerId)?.studentAlias ??
    hold.answerId;

  const gap = explanation?.distanceFromBoundary ?? 0;
  const size = Math.abs(gap);
  const distance =
    gap === 0
      ? "exactly on the pass mark"
      : `${size} ${size === 1 ? "mark" : "marks"} ${gap > 0 ? "above" : "below"} the pass mark`;

  return (
    <li className="entry">
      <details className="entry__box" open={open}>
        <summary className="entry__head">
          <span className="entry__who">{alias}</span>
          <span className="entry__tag">{HOLD_TAG[hold.reason]}</span>
          <span className="entry__caret" aria-hidden="true">
            <Icon name="down" size={13} />
          </span>
        </summary>

        <div className="entry__open">
          <p className="entry__saw">{HOLD_WORDING[hold.reason]}</p>
          <Chain steps={HOLD_CHAIN[hold.reason]} />

          {explanation ? (
            <>
              <Bars total={explanation.total} max={max} passBoundary={explanation.passBoundary} />
              <p className="entry__gap">
                <span className={`delta delta--${gap === 0 ? "on" : gap > 0 ? "over" : "under"}`}>
                  {gap === 0 ? "on the mark" : `${gap > 0 ? "+" : "−"}${size}`}
                </span>
                {distance}
              </p>
              <p className="entry__would">
                Unwatched, this would have gone out as {explanation.passes ? "a pass" : "a fail"}.
              </p>

              {explanation.awarded.length > 0 ? (
                <Lines label="Credited by the page" lines={explanation.awarded} credited />
              ) : (
                <p className="lab">Nothing credited</p>
              )}
              {explanation.missed.length > 0 ? (
                <Lines label="Not credited" lines={explanation.missed} credited={false} />
              ) : null}
            </>
          ) : (
            <p className="entry__would">
              No mark at all. Unwatched, this would have gone out unmarked.
            </p>
          )}
        </div>
      </details>
    </li>
  );
}

/**
 * The mockup this layout follows puts a reflection box here. A box whose contents went nowhere would
 * be a lie in the one section that exists to be honest, so the slot carries the page's own limits
 * instead — the things no amount of marking makes it competent to judge.
 */
function CannotKnow() {
  return (
    <section className="slab" aria-labelledby="limits-title">
      <h2 className="slab__title" id="limits-title">
        What this page cannot know
      </h2>
      <ul className="limits">
        <li className="limits__item">
          Whether an answer is <em>right</em>. It knows only which of your rubric's ideas were named
          back to it, and what you said those were worth.
        </li>
        <li className="limits__item">
          Whether an answer that matched nothing is wrong, or just written in a way your rubric did
          not anticipate. That is why it holds instead of failing it.
        </li>
        <li className="limits__item">
          How carefully an agent read. It records what arrived, not how it was arrived at.
        </li>
        <li className="limits__item">
          Anything about the students. The names here are aliases in a fixture, and there is no
          account, no backend, and no network request behind any of them.
        </li>
      </ul>
    </section>
  );
}

export function Audit({ session, holds }: { session: Session; holds: Hold[] }) {
  const max = rubricMax(session.rubric.lines);

  return (
    <aside className="audit" aria-label="Why the page held answers back">
      <section className="slab slab--audit" aria-labelledby="audit-title">
        <div className="slab__head">
          <span className="slab__glyph" aria-hidden="true">
            <Icon name="shield" size={16} />
          </span>
          <h2 className="slab__title" id="audit-title">
            Why the page held these
          </h2>
          <p className="slab__meta">
            <span className="num">{holds.length}</span> waiting on you, as of revision{" "}
            <span className="num">{session.revision}</span>
          </p>
        </div>

        {holds.length === 0 ? (
          <div className="empty">
            <p className="empty__lead">Nothing is held yet.</p>
            <p>
              Mark a few answers — by hand, or from the worked example — and the page will start
              keeping some back for you, with its reasoning here.
            </p>
          </div>
        ) : (
          <ul className="entries">
            {holds.map((hold, index) => (
              <Entry key={hold.answerId} session={session} hold={hold} open={index === 0} max={max} />
            ))}
          </ul>
        )}
      </section>

      <CannotKnow />
    </aside>
  );
}
