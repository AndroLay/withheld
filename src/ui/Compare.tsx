import { type Session } from "../domain/session.ts";
import { comparePolicies, unattendedOutcome, type PolicyProjection } from "../domain/views.ts";
import { Icon } from "./Icon.tsx";
import { type Lens } from "./lens.tsx";
import { EMPHASIS_LABEL } from "./wording.ts";

/**
 * The same stack under all three care settings, side by side.
 *
 * This is the only place the cost of caution is legible, and it runs the wrong way from intuition:
 * more care means more held, which means fewer marks reaching students today. A page that only ever
 * showed the current setting would be hiding that trade-off behind a radio button.
 *
 * Every figure comes from `comparePolicies`, which asks the real hold rules about a session that
 * differs only in its emphasis. Nothing here is committed and nothing is written — a comparison
 * built by re-implementing the rules would drift away from the rules that actually run.
 *
 * A real `<table>`, because it is one: three settings across, five measures down. The two indented
 * rows are a split of the row above them, which is why they read as fragments.
 *
 * Closed on arrival. It is a table of counterfactuals — the most interesting thing on the page to a
 * reader who has already understood the current setting, and 700 pixels of arithmetic to one who has
 * not. The summary keeps the question and the sample size visible either way.
 *
 * Nothing in this section survives the band's toggle, and that is the honest answer rather than a
 * gap: no tool compares two care settings, so the agent's view of a table of comparisons is a
 * paragraph saying it cannot ask. It is the one section the lens replaces rather than redacts.
 */

type Measure = {
  label: string;
  gloss: string;
  read: (row: PolicyProjection) => number;
  /** A split of the measure above it, not a measure of its own. */
  sub?: boolean;
};

const MEASURES: readonly Measure[] = [
  {
    label: "Held for you",
    gloss: "kept back for a person to read first",
    read: (row) => row.held,
  },
  {
    label: "Ready to send",
    gloss: "marked, and nothing about them tripped a rule",
    read: (row) => row.releasable,
  },
  {
    label: "of those, would pass",
    gloss: "at or above the pass mark",
    read: (row) => row.wouldPass,
    sub: true,
  },
  {
    label: "of those, would fail",
    gloss: "below it",
    read: (row) => row.wouldFail,
    sub: true,
  },
  {
    label: "Held with no mark at all",
    gloss: "quarantined before marking, so there is no mark to send",
    read: (row) => row.wouldGoUnmarked,
  },
];

/**
 * What would have left the page unwatched, counted. Deliberately not a claim that any of these
 * outcomes is wrong — nobody knows that yet, which is the whole reason a person is being asked.
 */
function IfNobody({ session }: { session: Session }) {
  const outcome = unattendedOutcome(session);
  const nothingHeld = outcome.rows.length === 0;

  return (
    <div className="ifnobody">
      <h3 className="ifnobody__title">If nobody had looked</h3>
      {nothingHeld ? (
        <p className="ifnobody__empty">
          Nothing is being held back right now, so this setting is costing you nothing.
        </p>
      ) : (
        <ul className="ifnobody__list">
          <li className="ifnobody__item">
            <span className="num">{outcome.wouldHavePassed}</span> would have gone out as a pass
          </li>
          <li className="ifnobody__item">
            <span className="num">{outcome.wouldHaveFailed}</span> as a fail
          </li>
          <li className="ifnobody__item">
            <span className="num">{outcome.wouldHaveGoneUnmarked}</span> with no mark on it at all
          </li>
        </ul>
      )}
      <p className="ifnobody__note">
        The page is not saying any of those is wrong. Nobody knows that yet — that is what your
        review is for.
      </p>
    </div>
  );
}

/** The comparison itself. Its own component so the agent's view can render in its place. */
function PolicyGrid({ rows }: { rows: PolicyProjection[] }) {
  return (
    <table className="grid">
      <caption className="grid__cap">
        Read across a row to see what more care costs. Changing the setting is the radio group in the
        left column — and it can only ever go up.
      </caption>
      <thead>
        <tr>
          <th className="grid__corner" scope="col">
            Measure
          </th>
          {rows.map((row) => (
            <th
              key={row.emphasis}
              scope="col"
              className={`grid__col${row.selected ? " grid__col--on" : ""}${
                row.locked ? " grid__col--locked" : ""
              }`}
            >
              <span className="grid__name">{EMPHASIS_LABEL[row.emphasis]}</span>
              {row.selected ? <span className="tagpill">Selected</span> : null}
              {row.locked ? <span className="grid__lock">no longer available</span> : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MEASURES.map((measure) => (
          <tr key={measure.label} className={measure.sub ? "grid__row grid__row--sub" : "grid__row"}>
            <th scope="row" className="grid__what">
              <span className="grid__label">{measure.label}</span>
              <span className="grid__gloss">{measure.gloss}</span>
            </th>
            {rows.map((row) => (
              <td
                key={row.emphasis}
                className={row.selected ? "grid__cell grid__cell--on" : "grid__cell"}
              >
                <span className="num">{measure.read(row)}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Compare({ session, lens }: { session: Session; lens: Lens }) {
  const rows = comparePolicies(session);

  return (
    <section className="slab slab--shut" aria-labelledby="compare-title">
      <details className="slab__box">
        <summary className="slab__head">
          <h2 className="slab__title" id="compare-title">
            What if the page were more careful?
          </h2>
          <span className="slab__meta">
            {lens === "agent" ? (
              "in no tool result"
            ) : (
              <>
                the same <span className="num">{session.answers.length}</span> answers, under each
                setting
              </>
            )}
          </span>
          <span className="slab__caret" aria-hidden="true">
            <Icon name="down" size={13} />
          </span>
        </summary>

        {lens === "agent" ? (
          <div className="empty">
            <p className="empty__lead">Your agent cannot ask this question.</p>
            <p>
              None of the nine tools compares one care setting with another.{" "}
              <span className="gloss__tool">preview_unattended_outcome</span> answers for the setting
              the page is on, and answers in counts: how many answers, how many are held, how many
              could be released, and whether a person is needed. Not who would pass, not who would
              fail, and not what another setting would have done.{" "}
              <span className="gloss__tool">set_marking_emphasis</span> can raise the care setting and
              is refused if it tries to lower one — so an agent can spend this page's caution without
              ever reading the price of it.
            </p>
          </div>
        ) : (
          <>
            <PolicyGrid rows={rows} />
            <IfNobody session={session} />
          </>
        )}
      </details>
    </section>
  );
}
