/**
 * The agent's half of the page, for a reader who has no agent.
 *
 * Every other column here shows a teacher what the page knows. This one shows what it says out loud:
 * the whole tool surface by name, and the actual payloads four of those tools return, printed
 * verbatim. The claim this project makes is about an absence — no point value, no pass mark, no
 * distance from it, no tool that sends a mark — and an absence cannot be demonstrated by a screenshot
 * of something working. It has to be readable.
 *
 * The four payloads sit behind disclosures rather than open on arrival. What each one leaves out is
 * stated in words on the closed summary, so the claim is readable at a glance and checkable in one
 * click; open, they were six hundred pixels of pretty-printed JSON standing between a first-time
 * reader and the sentence at the foot of this column, which is the part that matters most.
 *
 * Nothing here is a mock. `toolSurfaceFacts` builds the real registrations and `agentFacingPayloads`
 * calls the same payload builders the tools call, through the same boundary guard, so a field added to
 * a tool result appears on this page whether or not anyone remembered to update it.
 *
 * It is the third column and it owns the whole of it, drawn in reverse so the boundary is legible as a
 * boundary. The `aside` is the grid item and carries the name; the panel inside it is left unnamed so
 * the column is one landmark rather than two.
 */

import { type ReactNode } from "react";

import { holdsFor, type Receipt, type Session } from "../domain/session.ts";
import { agentVisibleHolds, receiptProvenance } from "../domain/views.ts";
import {
  agentFacingPayloads,
  toolSurfaceFacts,
  type Dispatch,
  type Installation,
} from "../tools/webmcp.ts";
import { Icon } from "./Icon.tsx";
import { ACTION_WORDING } from "./wording.ts";

/** What has arrived at the tool surface, and how much of it the list below still holds. */
export type Activity = { total: number; recent: readonly Dispatch[] };

/** What each projection leaves out. One line, in the same words the tool description uses. */
const OMITS: Record<string, string | undefined> = {
  read_rubric: "the four ideas, by id and label — no point value on any of them, and no pass mark",
  list_held_answers: "a count, then the reasons it will name — the gap between them is the holds it will not",
  explain_mark: "which ideas were credited on one answer and which were not seen, with no total",
  preview_unattended_outcome: "how much of the stack still needs a person, as counts and nothing else",
};

/** The five things no tool result can carry, and what stops each one. */
const NEVER_CROSSES: readonly (readonly [string, string])[] = [
  ["a total", "computeMark runs in the page. No tool returns a mark, not even the one that made it."],
  ["the pass mark", "redactRubricForAgent drops it with the point values, and nothing else carries it."],
  ["the distance from it", "so no result can be sorted, differenced or thresholded into one."],
  ["which answers sit on it", "a near-boundary hold is counted for the agent and never named to it."],
  ["a way to send a mark", "the tool surface ends before release. Releasing is a click, in this page, by a person."],
];

/**
 * Whether an agent is here, as a box rather than a line, because it is the first thing a judge
 * looks for and the answer has always been no.
 *
 * Four states, and none of them is an error. "No browser agent connected" is a fact about a
 * browser build, not a fault in the page: nothing below this box waits on it, and every control
 * on the page is worked by hand either way. Where the target drawing puts a "Connect agent"
 * button there is an anchor instead — a button that cannot connect anything would be the one
 * dishonest pixel in the column, so it points at the flag that actually does it.
 */
function Connection({
  installation,
  activity,
  onRetry,
}: {
  installation: Installation | null;
  activity: Activity;
  onRetry?: () => void;
}) {
  const box = (
    look: string,
    glyph: "globe" | "chip",
    title: ReactNode,
    gloss: string,
    action?: ReactNode,
  ) => (
    <div className={`conn conn--${look}`}>
      <span className="conn__glyph" aria-hidden="true">
        <Icon name={glyph} size={19} />
      </span>
      <p className="conn__title">{title}</p>
      <p className="conn__gloss">{gloss}</p>
      {action ?? (look === "live" ? null : (
        <a className="conn__act" href="#how-title">
          How to connect one
        </a>
      ))}
    </div>
  );

  if (installation === null) {
    return box(
      "wait",
      "globe",
      "Checking for a browser agent…",
      "The page has not finished looking. It does not wait on the answer.",
    );
  }

  if (!installation.available) {
    return box(
      "none",
      "globe",
      "No browser agent connected",
      "This page is working as an ordinary web app, and nothing on it needs one.",
    );
  }

  // A first registration can fail before any tool lands. Keep that state distinct from "no tool
  // would register": the page must tell a human that the surface is partial and offer the same
  // retry path as it does after a later failure. Failure reasons stay out of the UI; they may come
  // from the browser implementation and are not needed for recovery.
  if (installation.failures.length > 0) {
    return box(
      "none",
      "globe",
      "Tool registration is incomplete",
      `${installation.registered.length} tool(s) registered; ${installation.failures.length} refused. The page still works by hand.`,
      installation.retry && onRetry ? (
        <a
          className="conn__act"
          href="#agent-title"
          onClick={(event) => {
            event.preventDefault();
            onRetry();
          }}
        >
          Retry registration
        </a>
      ) : undefined,
    );
  }

  // An agent is present but nothing registered. Worth its own wording: saying "no agent" here
  // would be the page reporting a state it is not in.
  if (installation.registered.length === 0) {
    return box(
      "none",
      "globe",
      "A browser agent is here, and no tool would register",
      "Everything below still works by hand, in this page, by you.",
    );
  }

  return box(
    "live",
    "chip",
    <>
      <span className="num">{installation.registered.length}</span> tools offered to your agent
      {installation.failures.length > 0 ? (
        <>
          , <span className="num">{installation.failures.length}</span> refused
        </>
      ) : null}
    </>,
    // The count, not the claim. "Offered" is a fact about registration; whether anything has been
    // called is a different fact, and the page should be the one saying which of the two it knows.
    activity.total === 0
      ? "No call has arrived yet. None of them can send a mark to a student."
      : `${activity.total} ${activity.total === 1 ? "call has" : "calls have"} arrived, listed below. None of them could send a mark to a student.`,
    installation.failures.length > 0 && installation.retry && onRetry ? (
      <a
        className="conn__act"
        href="#agent-title"
        onClick={(event) => {
          event.preventDefault();
          onRetry();
        }}
      >
        Retry registration
      </a>
    ) : undefined,
  );
}

/**
 * The whole surface by name, with the read/write role attached to each real registration.
 *
 * The nine are counted rather than written out, and they come from `toolSurfaceFacts()`, so a new
 * registration would appear here on its own and this caption would count it. The human-only gate is
 * described below in plain language; no unavailable operation is presented as an agent tool.
 */
function Tools() {
  const facts = toolSurfaceFacts();

  return (
    <>
      <p className="lab" id="tools-title">
        Tools an agent may call
      </p>

      <ul className="tools" aria-labelledby="tools-title">
        {facts.map((fact) => (
          <li key={fact.name} className={`tool tool--${fact.readOnly ? "read" : "write"}`}>
            <code className="tool__name">{fact.name}</code>
            <span className="tool__role">{fact.readOnly ? "read" : "write"}</span>
          </li>
        ))}
      </ul>

      <p className="tools__note">
        <span className="num">{facts.length}</span> registrations, built on this page from the real
        surface rather than typed out again. Sending a mark is not part of that surface; the
        human-only gate is at the foot of the page.
      </p>
    </>
  );
}

/**
 * Every call that has arrived, in arrival order, whether the page answered it or refused it.
 *
 * The revision timeline below this is the session's own history and only accepted writes are in it.
 * This list is the other half: a read that changed nothing, and a refusal that was recorded nowhere,
 * both still happened, and a reader who wants to know whether the surface is being used cannot learn
 * it from a timeline of things that worked. A refusal leaving no trace in the session is the correct
 * behaviour and a bad way to find out what an agent tried.
 *
 * Three columns and no fourth: the sequence number, the tool, and what the page did. No arguments —
 * an argument may carry student text, and this is a record of the page's side of the exchange. No
 * wall time either, for the same reason the timeline has none.
 */
function Activity({ activity }: { activity: Activity }) {
  const trimmed = activity.total - activity.recent.length;

  return (
    <>
      <p className="lab" id="act-title">
        Calls that have arrived
      </p>

      <ol className="act" aria-labelledby="act-title">
        {activity.recent.map((dispatch, index) => {
          const seq = trimmed + index + 1;
          const refused = dispatch.code !== null;

          return (
            <li
              key={`${seq}-${dispatch.tool}`}
              className={`act__row act__row--${refused ? "refused" : dispatch.moved ? "wrote" : "read"}`}
            >
              <span className="act__seq num">{String(seq).padStart(2, "0")}</span>
              <code className="act__tool">{dispatch.tool}</code>
              <span className="act__what">
                {refused ? (
                  <>refused · {dispatch.code}</>
                ) : dispatch.moved ? (
                  <>
                    revision <span className="num">{String(dispatch.revision).padStart(2, "0")}</span>
                  </>
                ) : (
                  "read, nothing moved"
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="act__note">
        {trimmed > 0 ? (
          <>
            The most recent <span className="num">{activity.recent.length}</span> of{" "}
            <span className="num">{activity.total}</span>.{" "}
          </>
        ) : null}
        A refusal changes nothing in the session, so this list is the only place one is kept.
      </p>
    </>
  );
}

/**
 * Which caller a receipt is asking about.
 *
 * Only the three agent-callable actions. A teacher can mark by hand, raise the care level and stage a
 * release, so for those three "who did this?" has two possible answers and the page should say which.
 * The two human release actions have exactly one possible answer and their wording already gives it —
 * a tag reading "by hand" under "release confirmed by human" would be the page repeating itself.
 */
function callerOf(receipt: Receipt): string | null {
  if (receipt.action === "human_release_confirmed") return null;
  if (receipt.action === "human_release_declined") return null;

  return receiptProvenance(receipt) === "tool" ? "by a tool call" : "by hand";
}

/**
 * Every accepted state-changing action, in the order it happened, numbered by the exact revision
 * stored on its receipt. Human confirmation and decline are deliberately visible here as page-owned
 * audit events, even though neither action exists on the agent's tool surface.
 *
 * There is no wall time in it — not "20 min ago", not a timestamp. `Receipt` carries an id, an
 * action and the answers it touched, and nothing else: a wall-clock reading is not needed, and the
 * exact revision is already the session's deterministic order. Revision 00 is the page opening,
 * which is why the first receipt is revision 02 in the underlying session.
 */
function Timeline({ session }: { session: Session }) {
  return (
    <>
      <p className="lab" id="tl-title">
        Revision timeline
      </p>

      <ol className="tl" aria-labelledby="tl-title">
        <li className="tl__item tl__item--first">
          <span className="tl__dot" aria-hidden="true" />
          <p className="tl__rev">
            revision <span className="num">00</span>
          </p>
          <p className="tl__what">the page opened</p>
        </li>

        {session.receipts.map((receipt) => (
          <li key={receipt.id} className="tl__item">
            <span className="tl__dot" aria-hidden="true" />
            <p className="tl__rev">
              revision <span className="num">{String(receipt.revision).padStart(2, "0")}</span>
              {callerOf(receipt) ? <span className="tl__who">{callerOf(receipt)}</span> : null}
            </p>
            <p className="tl__what">
              {ACTION_WORDING[receipt.action]}
              {receipt.answerIds.length > 0 ? (
                <>
                  {" · "}
                  <span className="num">{receipt.answerIds.length}</span> answers
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ol>

      <p className="tl__note">
        Every write names the revision it expects. One that names a stale number is refused and
        recorded nowhere, so two callers cannot mark the same pile at once.
      </p>
    </>
  );
}

export function AgentPanel({
  session,
  installation,
  activity = { total: 0, recent: [] },
  oneColumn = false,
  onRetry,
}: {
  session: Session;
  installation: Installation | null;
  /** Optional so a render test can draw the column without inventing a call history. */
  activity?: Activity;
  oneColumn?: boolean;
  onRetry?: () => void;
}) {
  // `explain_mark` needs an answer that has a mark. The first one in stack order is the one the
  // teacher's eye is already on; when nothing is marked the projection is omitted rather than
  // invented, and the empty state below says so.
  const firstMarked = session.answers.find((answer) => session.marks[answer.id] !== undefined);
  const shown = agentFacingPayloads(session, firstMarked?.id ?? null);
  const explained = shown.some((entry) => entry.tool === "explain_mark");

  // The one gap worth pointing at, in the teacher's own numbers. `holdsFor` is honest about how
  // many answers are being kept back; `agentVisibleHolds` is shorter whenever some of them are
  // held for a reason the agent is not told, and that reason is always the pass boundary.
  const held = holdsFor(session).length;
  const named = agentVisibleHolds(session).length;
  const unnamed = held - named;

  // Everything below the column's own title, held once and placed by whichever shell is in use. Two
  // shells, one body: a phone gets a panel it opens, a wide screen gets a region that is simply there.
  const body = (
    <>
      <Connection installation={installation} activity={activity} onRetry={onRetry} />

      <Tools />

      {/* Only when there is something to list. A heading over an empty list would be a section
          explaining that nothing has happened, on a page that is already long enough; the box
          above says it in one clause. */}
      {activity.total > 0 ? (
        <>
          <div className="contract__rule" />
          <Activity activity={activity} />
        </>
      ) : null}

      <div className="contract__rule" />

      <Timeline session={session} />

      <div className="contract__rule" />

      {unnamed > 0 ? (
        <p className="gapline">
          <Icon name="lock" size={13} />
          <span>
            <span className="num">{held}</span> answers are held and{" "}
            <span className="num">{named}</span> of them are named in the payloads below. The other{" "}
            <span className="num">{unnamed}</span> are the ones sitting on the pass mark: the agent
            is told how many, and never which.
          </span>
        </p>
      ) : null}

      <p className="lab" id="crosses-title">
        What no result can carry
      </p>

      <ul className="crosses" aria-labelledby="crosses-title">
        {NEVER_CROSSES.map(([what, why]) => (
          <li key={what} className="crosses__item">
            <span className="crosses__what">{what}</span>
            <span className="crosses__why">{why}</span>
          </li>
        ))}
      </ul>

      <p className="lab">What a tool actually returns</p>

      <p className="proj__why">
        Four of the nine, verbatim. Each one opens on the object the tool hands over — the interesting
        part of every one of them is what is not in it.
      </p>

      <div className="proj">
        {shown.map((entry) => (
          <details key={entry.tool} className="proj__box">
            <summary className="proj__head">
              <code className="proj__tool">{entry.tool}</code>
              <span className="proj__what">{OMITS[entry.tool] ?? "a redacted projection"}</span>
              <span className="proj__caret" aria-hidden="true">
                <Icon name="down" size={13} />
              </span>
            </summary>
            {/* Pretty-printed with two spaces because a reader is meant to check it, not parse it.
                The agent receives the same object serialised on one line. */}
            <pre className="proj__json">{JSON.stringify(entry.payload, null, 2)}</pre>
          </details>
        ))}
      </div>

      {explained ? null : (
        <div className="empty">
          <p className="empty__lead">explain_mark is not in the list above.</p>
          <p>
            Nothing is marked yet, so there is no explanation to project. Mark one answer — by hand,
            or from the worked example — and it appears here with the rest.
          </p>
        </div>
      )}

      {/* The foot of the agent's own column is the thing the agent cannot do. It points at the
          control rather than repeating it: a second send button, even a disabled one, would make
          the page's whole argument harder to believe than one button in one place. */}
      <div className="only">
        <p className="only__soft">A release can be staged by a tool.</p>
        <p className="only__hard">Only a person can send it.</p>
        <a className="only__link" href="#gate-title">
          <Icon name="person" size={13} />
          The gate is at the foot of the page
        </a>
      </div>

      <p className="lab" id="how-title">
        How to connect one
      </p>

      <p className="how">
        A browser agent reaches this page through <code className="how__code">document.modelContext</code>,
        which today is behind <code className="how__code">chrome://flags/#enable-webmcp-testing</code> in
        Chrome Canary. Turn it on, reload, and the box at the top of this column counts the
        registrations. No natural-language model has been watched reading these payloads — the local
        CDP harness exercises the transport, while this page remains usable by hand and by test.
      </p>
    </>
  );

  /**
   * The same column in two shapes.
   *
   * On a wide screen it is a region, always open, sitting beside the work it comments on. In one
   * column it is a `<details>` — because there it is no longer beside anything, it is a thousand
   * words between the stack and the gate, and a reader on a phone should be able to get past it. The
   * disclosure is the browser's, with no state of our own: the element is created when the layout
   * narrows and it starts closed, which is the shape a phone reader should meet first.
   *
   * Two shells rather than one shell styled twice, because a summary that is clickable on a desktop
   * and looks like a heading would be a control that hides what it does, and CSS cannot make an
   * element stop being a `<summary>`. The title's `id` is in both, so the column keeps its name.
   */
  return (
    <aside className="contract" aria-labelledby="agent-title">
      {oneColumn ? (
        <details className="fold">
          <summary className="fold__head">
            <h2 className="contract__title" id="agent-title">
              Agent contract
            </h2>
            <span className="contract__lede">Language in. Arithmetic stays here.</span>
            {/* Both labels are in the markup and CSS shows one, so the summary's accessible name is
                the right one in either state — a `display: none` branch is not in the name. */}
            <span className="fold__more fold__more--shut">
              Open it: the tool list, the payloads, the one thing no tool can do
            </span>
            <span className="fold__more fold__more--open">Close it</span>
            <span className="fold__caret" aria-hidden="true">
              <Icon name="down" size={14} />
            </span>
          </summary>
          {body}
        </details>
      ) : (
        <>
          <h2 className="contract__title" id="agent-title">
            Agent contract
          </h2>
          <p className="contract__lede">Language in. Arithmetic stays here.</p>
          {body}
        </>
      )}
    </aside>
  );
}
