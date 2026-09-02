import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSession, type Session } from "../domain/session.ts";
import { DEMO_FINDINGS, SPOON_ANSWERS, SPOON_QUESTION, SPOON_RUBRIC } from "../data/fixtures.ts";
import { installWithheldTools, type Installation, type SessionPort } from "../tools/webmcp.ts";

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

  const port = useMemo<SessionPort>(
    () => ({ read: () => latest.current, write: apply }),
    [apply],
  );

  const [installation, setInstallation] = useState<Installation | null>(null);

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

  return { session, apply, installation, demoFindings: DEMO_FINDINGS };
}
