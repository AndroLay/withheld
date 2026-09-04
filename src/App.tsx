import { useEffect, useRef, useState } from "react";

import {
  confirmRelease,
  declineRelease,
  holdsFor,
  proposeMarks,
  releasableAnswerIds,
  requestRelease,
  setMarkingEmphasis,
  type Emphasis,
  type HoldReason,
  type Outcome,
} from "./domain/session.ts";
import { agentVisibleHolds } from "./domain/views.ts";
import { ActionBar } from "./ui/ActionBar.tsx";
import { AgentPanel } from "./ui/AgentPanel.tsx";
import { Audit } from "./ui/Audit.tsx";
import { Compare } from "./ui/Compare.tsx";
import { Intro } from "./ui/Intro.tsx";
import { type Lens } from "./ui/lens.tsx";
import { Rail } from "./ui/Rail.tsx";
import { Stack } from "./ui/Stack.tsx";
import { TopBar } from "./ui/TopBar.tsx";
import { useMarkingSession } from "./ui/useMarkingSession.ts";
import { useOneColumn } from "./ui/useOneColumn.ts";

/**
 * A bar, a band, three columns and a gate.
 *
 * Across the top: what this page is and which revision it is on. Under it, a band with the claim in
 * one sentence and the whole stack in four figures. Left: the policy the page is enforcing and who is
 * allowed to do what, all of it page-owned. Centre: the work — the marking queue, then, below the
 * first screen, every answer the page kept back and why, and what more caution would cost. Right, in
 * black: the agent's whole half of the page, printed. Across the foot: the one action that is only
 * ever a person's.
 *
 * The work column is first in the source and placed into the middle track by CSS, so a phone reads
 * the queue before the policy without `order` telling a sighted reader something a screen reader is
 * not told.
 *
 * Every number in the three columns is shown to a person, and the right-hand column prints the
 * agent's view of the same session so the two can be read against each other. That projection lives
 * in `src/domain/views.ts` and has no total, no pass mark and no distance in it.
 *
 * The band's toggle turns that same projection on the other two columns. In `lens === "agent"` the
 * page is redrawn from what a tool would return: totals, point values, the pass mark and the band are
 * absent rather than covered, and the three answers held for sitting inside the band are not held any
 * more, because the agent is never told they are. The black column does not change under the toggle,
 * and that is the point of it — it was already the agent's view.
 *
 * The page is fully usable with no agent present, which is not a fallback so much as the base case:
 * a model has chosen among these tools, through a bridge written for it rather than through a host
 * that found the page by itself. A teacher can tick rubric lines by hand and get exactly the same holds.
 */
export function App() {
  const { session, apply, readLatest, installation, retryInstallation, activity, demoFindings } =
    useMarkingSession();

  // Layout is the page's business, not the panel's: the contract column folds into a disclosure when
  // there is only one column to put it in. Read here and passed down, so the shape is decided in the
  // one place that knows the grid.
  const oneColumn = useOneColumn();
  const [notice, setNotice] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>("yours");

  const gateHeading = useRef<HTMLHeadingElement | null>(null);
  const wasStaged = useRef(false);

  const holds = holdsFor(session);
  const heldReason = new Map(holds.map((hold) => [hold.answerId, hold.reason]));
  const ready = releasableAnswerIds(session);

  /**
   * The holds as the reader in front of the page is allowed to see them.
   *
   * In the agent's view this is not the same map with a class on it: it is rebuilt from
   * `agentVisibleHolds`, the function `list_held_answers` returns. An answer held for sitting inside
   * the boundary band is not in it at all, so every component downstream — the strip in the band, the
   * row in the queue, the entry in the audit rail — draws that answer as what the agent believes it
   * is: marked, and ready to send. The count above stays whole, because the count is the one thing the
   * agent is told. That gap between five held and two named is the page's argument, and here it is one
   * `Map` rather than a paragraph.
   */
  const shownReason: Map<string, HoldReason> =
    lens === "agent"
      ? new Map(agentVisibleHolds(session).map((hold) => [hold.answerId, hold.reason]))
      : heldReason;

  /**
   * Every write the teacher makes goes through the same refusal path the agent's do. A stale
   * revision is not reachable by clicking, but the branch is here rather than asserted away,
   * because both callers write to one session and only one of them is in this file.
   */
  function commit(result: Outcome): boolean {
    if (!result.ok) {
      setNotice(result.message);
      return false;
    }

    setNotice(null);
    apply(result.session);
    return true;
  }

  const staged = session.releaseRequest?.answerIds ?? [];
  // Compared by contents, not by count: a hold raised on one answer while another was marked
  // would leave the two counts equal and the two sets different.
  const stackMoved =
    session.releaseRequest !== null &&
    (staged.length !== ready.length || staged.some((id) => !ready.includes(id)));

  const isStaged = session.releaseRequest !== null;

  // Guarded on the transition, not on the state: a second request while someone is typing must not
  // pull the focus out from under them.
  useEffect(() => {
    if (isStaged && !wasStaged.current) gateHeading.current?.focus();
    wasStaged.current = isStaged;
  }, [isStaged]);

  return (
    <div className="app" data-view={lens}>
      <TopBar session={session} />

      <Intro
        session={session}
        held={holds.length}
        heldReason={shownReason}
        lens={lens}
        onLens={setLens}
      />

      <div className="app__cols">
        <main className="work">
          {/* The live region is always in the DOM and only its contents change. A region added at
              the same moment as its text is not reliably announced. */}
          <div className="live" role="status" aria-live="polite">
            {notice ? <p className="notice">{notice}</p> : null}
          </div>

          <Stack
            session={session}
            heldReason={shownReason}
            lens={lens}
            onSave={(answerId, foundLineIds, expectedRevision) =>
              // Read from the ref-backed session. A native form submit can arrive between an
              // external tool write and React's next committed render; the expected revision must
              // be checked against the state that the tool port would read at that instant.
              commit(proposeMarks(readLatest(), [{ answerId, foundLineIds }], expectedRevision))
            }
            onMark={() => commit(proposeMarks(session, demoFindings, session.revision))}
          />

          <Audit session={session} holds={holds} lens={lens} />

          <Compare session={session} lens={lens} />

          <footer className="footnote">
            <p>
              Every student here is invented and every answer is a fixture in this page's own
              source. No backend, no account, and no network request of any kind: the production
              build is served under a policy that forbids one.
            </p>
            <p>
              A model has chosen among these tools and written their inputs — through a bridge built
              for it here, not through a host that found this page by itself. The page remains fully
              usable by hand.
            </p>
          </footer>
        </main>

        <Rail
          session={session}
          onEmphasis={(emphasis: Emphasis) =>
            commit(setMarkingEmphasis(session, emphasis, session.revision))
          }
        />

        <AgentPanel
          session={session}
          installation={installation}
          activity={activity}
          oneColumn={oneColumn}
          onRetry={retryInstallation}
        />
      </div>

      <ActionBar
        session={session}
        held={holds.length}
        ready={ready.length}
        stackMoved={stackMoved}
        headingRef={gateHeading}
        onStage={() => commit(requestRelease(session, session.revision))}
        onSend={() => {
          setNotice(null);
          apply(confirmRelease(session));
        }}
        onDecline={() => {
          setNotice(null);
          apply(declineRelease(session));
        }}
      />
    </div>
  );
}
