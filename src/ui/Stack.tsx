import { useEffect, useRef, useState } from "react";

import { type Answer, type HoldReason, type Session, policyFor } from "../domain/session.ts";
import { explainMark, markProvenance, type MarkProvenance } from "../domain/views.ts";
import { Chain } from "./Chain.tsx";
import { Icon } from "./Icon.tsx";
import { Redacted, type Lens } from "./lens.tsx";
import { HOLD_CHAIN, HOLD_TAG, rubricMax } from "./wording.ts";

/**
 * The marking queue: every answer in the class as one line, and any one of them opened onto four
 * tabs. Every figure in this column is shown to a person and none of it is reachable from a tool —
 * the agent's view of the same answer carries rubric line ids and nothing that can be totalled.
 *
 * It used to open one answer in a full card above a paged list of three. That bought a detailed first
 * card at the price of hiding eleven students behind a *Next 3* control, and it meant the same answer
 * was on screen twice. Fourteen rows and a strip in the band say more in less height, and an agent
 * working through the class is now visible as fourteen rows filling rather than as a figure that went
 * up. `docs/DECISIONS.md` D-31 records the change.
 *
 * The list stays in arrival order and is never sorted by total. A marking page that ranks a class is
 * a leaderboard, and that is a different product with a different effect on a teacher.
 *
 * One piece of local state, and it is not a mark: which subset of the class is being looked at.
 * Whether a row is open belongs to `details`, and which tab is showing belongs to a radio group the
 * cascade reads — so nothing here can disagree with what the page holds, and a reload puts the view
 * back where it started.
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

/** The four panels behind an opened row, in the order the tabs sit in. */
const TABS = ["answer", "rubric", "decision", "hand"] as const;

type Tab = (typeof TABS)[number];

const TAB_WORD: Record<Tab, string> = {
  answer: "Answer",
  rubric: "Rubric",
  decision: "Decision",
  hand: "By hand",
};

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
 * The ticks live in form-local React state so the visible draft follows the controlled inputs. The
 * opened revision lives beside that draft, and a successful save advances it.
 *
 * What another caller's write does to this form depends on whether there is anything here to lose.
 * A closed `<details>` still keeps its children in the document, so all fourteen of these forms are
 * mounted from the first paint: if every revision change were a conflict, one tool call would leave
 * fourteen untouched forms demanding to be reloaded, and the guard would read as noise rather than
 * as protection. So an untouched form follows the page — it adopts the new mark, which is the mark it
 * would have shown had the teacher opened the row a second later. A form with ticks in it refuses,
 * and says so. The rule the page is defending is that nobody's work is overwritten without being
 * told; a draft nobody made is not work.
 */
function MarkForm({
  session,
  answerId,
  lens,
  onSave,
}: {
  session: Session;
  answerId: string;
  lens: Lens;
  onSave: (foundLineIds: string[], expectedRevision: number) => boolean | void;
}) {
  const awarded = new Set(session.marks[answerId]?.awardedLineIds ?? []);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(awarded));
  const [touched, setTouched] = useState(false);
  const openedRevision = useRef(session.revision);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (session.revision === openedRevision.current) return;
    if (touched) {
      setConflict(true);
      return;
    }
    openedRevision.current = session.revision;
    setSelected(new Set(session.marks[answerId]?.awardedLineIds ?? []));
  }, [session.revision]);

  function reloadCurrentMark() {
    openedRevision.current = session.revision;
    setSelected(new Set(session.marks[answerId]?.awardedLineIds ?? []));
    setTouched(false);
    setConflict(false);
  }

  return (
    <form
      className="tick"
      onSubmit={(event) => {
        event.preventDefault();
        if (conflict || session.revision !== openedRevision.current) {
          setConflict(true);
          return;
        }
        const expectedRevision = openedRevision.current;
        const saved = onSave([...selected], expectedRevision);
        if (saved === true) {
          openedRevision.current = expectedRevision + 1;
          setTouched(false);
        }
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
              checked={selected.has(line.id)}
              disabled={conflict}
              onChange={(event) => {
                setTouched(true);
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (event.target.checked) next.add(line.id);
                  else next.delete(line.id);
                  return next;
                });
              }}
            />
            <span className="tick__label">{line.label}</span>
            <span className="tick__points num">{lens === "agent" ? <Redacted /> : line.points}</span>
          </label>
        ))}
      </fieldset>
      {conflict ? (
        <div className="tick__conflict" role="alert">
          <p>This answer changed while you were marking. Saving is blocked until you reload it.</p>
          <button type="button" className="btn btn--quiet" onClick={reloadCurrentMark}>
            Reload current mark
          </button>
        </div>
      ) : null}
      <div className="tick__foot">
        {/* Outlined, not filled. On a page with no colour, a filled black button is the loudest
            thing there is, and it is reserved for the one path that lets a mark leave: the pointer
            to the gate, staging, and the send itself. Saving a mark writes to this page and nothing
            else, so it is lettered like the work it is part of. */}
        <button type="submit" className="btn btn--quiet" disabled={conflict}>
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
 * rather than from the total, because the total is already printed in the row above — and for three of
 * the four rules the total is not the reason.
 *
 * Three of its branches name a number the page owns, and those three ask the lens. The other three
 * are the same sentence in both views, which is not a coincidence: a rule that fired on the shape of
 * an answer rather than on its total is a rule the page can explain to an agent in full.
 */
function verdict(
  state: State,
  heldReason: HoldReason | null,
  band: number,
  passBoundary: number,
  max: number,
  passes: boolean,
  lens: Lens,
): string {
  if (state === "sent") return "Already sent. Marking is closed for this one.";

  // The row above already reads NOT MARKED, so repeating it here would spend the sentence on
  // something the reader can see. It spends it on the number this answer will be judged against
  // instead — the page's own, and the one figure the whole submission is about keeping off the
  // agent's side of the boundary. Which is why the agent's view of this row cannot print it.
  if (state === "waiting") {
    return lens === "agent"
      ? "Nothing named on it yet. Your agent can read the answer and name rubric lines; the mark it would be judged against is in no tool result."
      : `Nothing named on it yet. It will be judged against ${passBoundary} / ${max} — a number no tool is told.`;
  }

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
      return lens === "agent"
        ? "Rubric lines are named on it, and no rule your agent can see fired. Whether it clears the pass mark is the page's to know."
        : `${passes ? "Above" : "Below"} the pass mark (${passBoundary} / ${max}), and nothing about it tripped a rule.`;
  }
}

/**
 * One rubric line, with the points the page attaches to it. No tool returns this column, and in the
 * agent's view `points` arrives as null — the label is what `read_rubric` hands over, and the figure
 * beside it is the part that stays here.
 */
function Line({ points, label }: { points: number | null; label: string }) {
  return (
    <li className="rl">
      <span className="rl__pt num">{points === null ? <Redacted /> : points}</span>
      <em className="rl__label">{label}</em>
    </li>
  );
}

/**
 * Who named the lines on this answer. An unclassed empty span when nothing has: the row head is a
 * seven-column grid, so the column has to be filled to keep the cells after it in place, and an empty
 * `.prov` would draw a bordered chip with nothing in it.
 *
 * Page-owned in the strict sense. It is read back out of the receipt trail, no tool result carries it,
 * and an agent therefore cannot see its own tag — or see a teacher overrule it. Which is why the
 * agent's view of a marked row is handed `null` here and draws the same empty span: not a chip with the
 * word taken out, but the state of a row that never had one.
 */
function Prov({ provenance }: { provenance: MarkProvenance | null }) {
  if (provenance === null) return <span />;

  return (
    <span className={`prov prov--${provenance}`}>
      <span className="vh">named by </span>
      {provenance}
    </span>
  );
}

/**
 * One answer, as a line that opens onto four panels.
 *
 * `details` rather than state-driven, and the four panels are a radio group the stylesheet switches,
 * so nothing here can disagree with what the page holds: a half-finished tick survives a tool write
 * landing in another row, and a reload puts every row back closed.
 *
 * The head names the rule rather than the word "held", because which rule fired is the part a teacher
 * acts on. The preview of the answer is truncated by the stylesheet and not by this file: a reader who
 * cannot see the truncation is read the whole body instead of an abbreviation.
 */
function Row({
  session,
  answer,
  folio,
  heldReason,
  max,
  band,
  lens,
  onSave,
}: {
  session: Session;
  answer: Answer;
  folio: number;
  heldReason: HoldReason | null;
  max: number;
  band: number;
  lens: Lens;
  onSave: (foundLineIds: string[], expectedRevision: number) => boolean | void;
}) {
  const state = stateOf(session, answer.id, heldReason);
  const mark = session.marks[answer.id];
  const explanation = explainMark(session, answer.id);
  const said = verdict(
    state,
    heldReason,
    band,
    session.rubric.passBoundary,
    max,
    explanation?.passes ?? false,
    lens,
  );

  const credited = explanation?.awarded ?? [];
  const missed = explanation?.missed ?? [];
  const first = credited[0];
  const chain = heldReason ? HOLD_CHAIN[heldReason] : null;
  const unattended =
    explanation === null
      ? "would have gone out with no mark on it at all"
      : lens === "agent"
        ? // An answer with no mark is a fact the agent has: `explain_mark` returns nothing for it. A
          // pass or a fail is arithmetic, and this is the sentence where the difference shows.
          "would have gone out, and no tool would say whether as a pass or a fail"
        : `would have gone out as ${explanation.passes ? "a pass" : "a fail"}`;

  return (
    <li id={`line-${answer.id}`} className={`line line--${state}`}>
      <details className="line__box">
        <summary className="line__head">
          <span className="line__folio num">{String(folio).padStart(2, "0")}</span>
          <span className="line__who">{answer.studentAlias}</span>
          <span className="line__peek">{answer.body}</span>

          <Prov provenance={lens === "agent" ? null : markProvenance(session, answer.id)} />

          <span className="line__score">
            {mark && lens === "agent" ? (
              <Redacted />
            ) : mark ? (
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
          {/*
            Four radios, four labels, four panels, flat siblings in that order — `:checked ~` only
            reaches forward. No `role="tablist"`: a radio group already arrows between its options in
            every browser, and a hand-rolled one would be this page's to test. Each label names its
            input, so the group needs no name of its own.
          */}
          <div className="tabs">
            {TABS.map((tab) => (
              <input
                key={tab}
                className="tabs__pick"
                type="radio"
                id={`tab-${answer.id}-${tab}`}
                name={`tab-${answer.id}`}
                defaultChecked={tab === "answer"}
              />
            ))}

            {TABS.map((tab) => (
              <label key={tab} className="tabs__tab" htmlFor={`tab-${answer.id}-${tab}`}>
                {TAB_WORD[tab]}
              </label>
            ))}

            <section className="tabs__panel" aria-label={`${answer.studentAlias}: the answer`}>
              <p className="said">{said}</p>
              <figure className="hand">
                <blockquote className="hand__body">{answer.body}</blockquote>
                <figcaption className="hand__cap">
                  In the student's hand. This page did not write it, and it is handed to an agent
                  flagged as untrusted.
                </figcaption>
              </figure>
            </section>

            <section className="tabs__panel" aria-label={`${answer.studentAlias}: the rubric`}>
              <div className="split">
                <div className="split__half">
                  <p className="lab">Rubric lines credited</p>
                  {credited.length > 0 ? (
                    <ul className="rl__list">
                      {credited.map((line) => (
                        <Line
                          key={line.id}
                          points={lens === "agent" ? null : line.points}
                          label={line.label}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="none">
                      Nothing credited. The page shows an absence rather than a score of zero.
                    </p>
                  )}

                  <div className="hr" />

                  {/* The three tools a reader could check this against, so the claim in this panel
                      can be read against the payloads printed in the black column. */}
                  <p className="lab">Evidence</p>
                  <ul className="ev">
                    <li className="ev__item">
                      <span className="ev__pill">answer text</span>
                      <span className="ev__what">{answer.studentAlias}'s own words, above</span>
                    </li>
                    <li className="ev__item">
                      <span className="ev__pill">rubric line</span>
                      <span className="ev__what">
                        {first ? (
                          <>
                            {lens === "agent" ? <Redacted /> : <span className="num">{first.points}</span>} ·{" "}
                            {first.label}
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

                <div className="split__half split__half--right">
                  <p className="lab">Not credited</p>
                  {missed.length > 0 ? (
                    <ul className="rl__list">
                      {missed.map((line) => (
                        <Line
                          key={line.id}
                          points={lens === "agent" ? null : line.points}
                          label={line.label}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="none">
                      {state === "waiting"
                        ? "Nothing has been read yet, so nothing has been ruled out."
                        : "Every idea in the rubric was credited."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="tabs__panel" aria-label={`${answer.studentAlias}: the decision`}>
              <p className="lab">What the page decided</p>
              {chain ? (
                <Chain steps={chain} />
              ) : state === "waiting" ? (
                <p className="gloss">
                  Nothing has named a line on this one yet.{" "}
                  <span className="gloss__tool">propose_marks</span> is the tool that would, and{" "}
                  <a className="gloss__at" href="#worked">
                    the worked example
                  </a>{" "}
                  does the same thing without an agent.
                </p>
              ) : (
                <p className="gloss">
                  No rule fired on this one. It sits in the queue until a person stages a release.
                </p>
              )}

              {state === "sent" ? (
                <p className="gloss">
                  This one has already left the page, and a person confirmed it. Every tool that
                  writes refuses it from here on.
                </p>
              ) : (
                <p className="gloss">
                  If nobody had looked, this {unattended}. The page is not saying that would be wrong
                  — nobody knows that yet, which is what your review is for.
                </p>
              )}

              <a className="btn btn--quiet" href="#audit-title">
                View full explanation
              </a>
            </section>

            <section className="tabs__panel" aria-label={`${answer.studentAlias}: mark by hand`}>
              {state === "sent" ? (
                <p className="line__shut">Already sent. Marking is closed for this one.</p>
              ) : (
                <MarkForm session={session} answerId={answer.id} lens={lens} onSave={onSave} />
              )}
            </section>
          </div>
        </div>
      </details>
    </li>
  );
}

/**
 * The whole class, in arrival order, under one filter.
 *
 * No pager and no focused card. Fourteen rows are shorter than one card above three rows, every
 * student is on screen, and an agent working through the class is visible as rows filling rather than
 * as a count that went up.
 */
export function Stack({
  session,
  heldReason,
  lens,
  onSave,
  onMark,
}: {
  session: Session;
  heldReason: Map<string, HoldReason>;
  lens: Lens;
  onSave: (answerId: string, foundLineIds: string[], expectedRevision: number) => boolean | void;
  onMark: () => void;
}) {
  const [view, setView] = useState<View>("all");

  const max = rubricMax(session.rubric.lines);
  const band = policyFor(session.emphasis, session.basePolicy).boundaryBand;

  // The folio is a position in the whole class, not in the current view, so an answer keeps the same
  // number whichever subset is on screen — and the strip in the band points at the same one.
  const folio = new Map(session.answers.map((answer, index) => [answer.id, index + 1]));

  const shown = session.answers.filter((answer) => {
    if (view === "held") return heldReason.has(answer.id);
    if (view === "waiting") return session.marks[answer.id] === undefined;
    return true;
  });

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
            onChange={(event) => setView(event.currentTarget.value as View)}
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
      </div>

      {/* The question the class was set. It was in the session model from the start and reachable
          through `read_rubric`, but it was never on the screen — so a reader arriving at fourteen
          rows had no idea what was being marked, and the four rubric lines below read as arbitrary.
          It sits above the rows rather than inside each one because it is the same question for all
          fourteen. Safe in either view: it is the teacher's own text, and it carries no page-owned
          figure. `docs/DECISIONS.md` D-37. */}
      {session.question ? (
        <p className="queue__ask">
          <span className="queue__ask-tag">The question</span>
          {session.question}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="queue__empty">
          <p className="queue__lead">Nothing in this view.</p>
          <p>
            {session.answers.length === 0
              ? "There are no answers in this class at all."
              : view === "held"
                ? "The page is not holding anything back. Mark a few answers and it will start."
                : "Every answer in the class has a mark on it."}
          </p>
        </div>
      ) : (
        <ul className="list">
          {shown.map((answer) => (
            <Row
              key={answer.id}
              session={session}
              answer={answer}
              folio={folio.get(answer.id) ?? 0}
              heldReason={heldReason.get(answer.id) ?? null}
              max={max}
              band={band}
              lens={lens}
              onSave={(foundLineIds, expectedRevision) =>
                onSave(answer.id, foundLineIds, expectedRevision)
              }
            />
          ))}
        </ul>
      )}

      {/* The anchor a waiting row points at, so "the worked example" in a panel lands on the control
          that runs it rather than on the section that contains it. */}
      <div className="queue__foot" id="worked">
        <button type="button" className="btn btn--quiet" onClick={onMark}>
          <Icon name="chip" size={14} />
          Mark all from the worked example
        </button>
      </div>

      <p className="queue__note">
        The worked example is a fixture in this page's own source, so the holds are reproducible
        without an agent. It is not a recording of one.
      </p>
    </section>
  );
}
