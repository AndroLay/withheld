import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSession, type Session } from "../domain/session.ts";
import { DEMO_FINDINGS, SPOON_ANSWERS, SPOON_QUESTION, SPOON_RUBRIC } from "../data/fixtures.ts";
import { installWithheldTools, type Dispatch, type Installation, type SessionPort } from "../tools/webmcp.ts";

/** Enough rows to read a session's history, few enough that a loop cannot grow the page forever. */
const ACTIVITY_KEPT = 40;

/**
 * One session, two callers.
 *
 * The teacher's clicks and the agent's tool calls have to land in the same state, and the
 * agent's calls arrive between renders, so a stale closure would silently mark against an
 * old revision. The ref is the source of truth for reads and every write goes through one
 * mutator, which keeps the two callers honest with each other.
 *
 * Registration is torn down through the abort signal on unmount. That is the only teardown
 * the WebMCP API offers — there is no `unregisterTool` — and it is what makes React's
 * deliberate double mount in StrictMode safe rather than duplicating all nine tools.
 */
export function useMarkingSession() {
  const [session, setSession] = useState(() =>
    createSession(SPOON_RUBRIC, SPOON_ANSWERS, { question: SPOON_QUESTION }),
  );
  const latest = useRef(session);

  const apply = useCallback((next: Session) => {
    latest.current = next;
    setSession(next);
  }, []);

  // Event handlers can run before React has committed the render caused by an external WebMCP
  // write. Expose the same ref-backed read used by the tool port so a manual form can validate its
  // revision against the latest session, not against a stale render closure.
  const readLatest = useCallback(() => latest.current, []);

  /**
   * What has actually arrived at the tool surface.
   *
   * The panel used to be able to say only whether an agent could be found. That is a fact about a
   * browser build; this is a fact about the page. `total` counts every call including the ones
   * trimmed off the front, so the count stays true after the list stops growing, and refusals are
   * kept because a refusal that leaves no trace is exactly the thing a reader should be able to
   * check. Nothing here is derived from an argument: no student text passes through it.
   */
  const [activity, setActivity] = useState<{ total: number; recent: Dispatch[] }>({
    total: 0,
    recent: [],
  });

  const observe = useCallback((dispatch: Dispatch) => {
    setActivity((current) => ({
      total: current.total + 1,
      recent: [...current.recent, dispatch].slice(-ACTIVITY_KEPT),
    }));
  }, []);

  const port = useMemo<SessionPort>(
    () => ({ read: () => latest.current, write: apply, observe }),
    [apply, observe],
  );

  const [installation, setInstallation] = useState<Installation | null>(null);

  const retryInstallation = useCallback(() => {
    const retry = installation?.retry;
    if (!retry) return;
    void retry().then(setInstallation);
  }, [installation]);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    void installWithheldTools(port, { signal: controller.signal }).then((result) => {
      if (live) setInstallation(result);
    });

    return () => {
      live = false;
      controller.abort();
    };
  }, [port]);

  return {
    session,
    apply,
    readLatest,
    installation,
    retryInstallation,
    activity,
    demoFindings: DEMO_FINDINGS,
  };
}
