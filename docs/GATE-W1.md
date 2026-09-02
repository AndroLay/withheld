# GATE-W1 — the information gate

**The gate.** Prove that an agent cannot derive a rubric line's point value or the pass
boundary from any tool output. If either leaks, the escalation decision becomes predictable
to the agent, and Withheld's claim — that the page keeps the authority — falls with it.
The gate is defined by this package's agent-boundary contract and regression tests. It is
the cheap same-origin equivalent of a cross-origin leak test; the historical research
register is not an active submission dependency.

**Run on 2026-09-01, on Node 26, against the source in this package.** The gate is driven by
tests and by reading the tool surface; **no browser agent was involved**, here or anywhere in
this workspace, so everything below is a statement about what the tool surface can emit and
not a recording of an agent failing to extract it.

**Verdict: pass on the stated claim, with one defect found and fixed in the course of running
it, and two residual channels named rather than closed.** The residuals are inference
channels, not leaks: neither yields a point value or the boundary, and both are described in
full below so that a reader can disagree with the judgement rather than take it.

## What crosses to the agent at all

| tool | numbers in the result | names in the result |
| --- | --- | --- |
| `describe_stack` | `revision`, five `*Count`s, `answers[].characters` | every answer id, alias and state |
| `read_rubric` | `revision`, `rubricLineCount` | line ids and labels, **no points** |
| `read_answer` | `revision` | one answer, body included |
| `list_held_answers` | `revision`, `heldCount` | the holds it is allowed to name |
| `explain_mark` | `revision` | credited and missed line ids |
| `preview_unattended_outcome` | `revision`, three `*Count`s | the holds it is allowed to name |
| `propose_marks` | `revision`, `heldCount`, `releasableCount` | the ids the agent itself sent |
| `set_marking_emphasis` | the same three | none |
| `request_release` | the same three | none |

`AGENT_SAFE_NUMERIC_PATHS` (`src/tools/agent-boundary.ts:32`) is that middle column, and
`assertAgentSafe` (:80) throws on anything else. The right column has no such guard, which is
where this gate earned its keep.

## Claim 1 — no result contains a point value or the boundary

Enforced structurally rather than reviewed. `reply()` (`src/tools/webmcp.ts:73`) is the only
constructor of a tool result and calls `assertAgentSafe` on every payload; `replyRefused` (:82)
delegates to it, so refusal paths are guarded on the same code path as successes.

- `tests/agent-boundary.test.mts` — 9 tests on the guard: the allowlist, nested and array
  paths, and that adding a number anywhere else throws.
- `tests/webmcp.test.mts` — twelve tool calls in sequence, the stack marked part-way through
  so later results are computed from real marks and real holds, asserting after every one that
  neither the structural check nor `forbiddenNumbersInText` (`agent-boundary.ts:99`) fires.
- `tests/views.test.mts` — the three agent-facing projections built from a session, each
  checked against both. The fourth, the rubric redaction itself, is checked in
  `tests/marks.test.mts` and again in `tests/agent-boundary.test.mts`.

## Claim 2 — no result names an answer held for sitting near the boundary

`agentHoldReason` (`src/domain/session.ts:99`) returns `null` for `near-boundary`, so
`agentVisibleHolds` (`src/domain/views.ts:106`) omits the answer rather than renaming it, and
`stateOf` (`src/tools/webmcp.ts:144`) reports such an answer as `marked` like any other. The
agent learns that *something* is held, from `heldCount`, and never which.

- `tests/views.test.mts` — the named list is strictly shorter than `heldCount`, and
  `explainMarkForAgent` returns `heldReason: null` for the answer the page holds at the cliff.

## Claim 3 — the side of the boundary is never recoverable

The hold test is `|total − boundary| ≤ band`, which is symmetric. Even an agent that has
inferred *that* an answer is held cannot infer whether it sits above or below — and the side
is the half that would tell it where to push.

- `tests/boundary-inference.test.mts` — the fixture holds `ans-03` (a pass) and `ans-04` (a
  fail) at the same band; the page knows the split, and every agent-facing projection of the
  two is the same: `heldReason: null`, absent from the named holds, state `marked`.

## Claim 4 — no ordering encodes a distance

A list sorted by closeness to the boundary would rebuild the distance the totals were removed
to hide.

- `tests/boundary-inference.test.mts` — the named-hold list is identical whether the worked
  example is proposed forwards or reversed, and follows the stack's own order.

## The defect this gate found, and the fix

`committedPayload` returned `receipt.answerIds` verbatim. For `propose_marks` that is an echo
of the agent's own input and carries nothing. For `request_release` the receipt lists every
**releasable** answer, and releasable means marked-and-not-held. So:

1. `describe_stack` gives the agent every marked answer id.
2. `request_release` gave it every releasable id.
3. The difference is the held set; removing the holds it is allowed to see
   (`list_held_answers`) leaves exactly the answers sitting on the pass boundary, **by id, in
   one call, at no cost.**

That is the fact `AgentHoldReason`'s omission and `stateOf`'s collapse exist to prevent, and
neither existing check could see it: an id is not a number, so the structural guard has nothing
to test, and the ids are not the fixture's secret values, so the text canary does not fire.
The twelve-call sweep passed with the leak in place.

Fixed at `src/tools/webmcp.ts:181` — `committedPayload` now takes the ids to echo as an
argument, and only `propose_marks` passes any: what the agent named may come back to it, what
the page chose may not. `releasableCount` still says how many answers the request covers, which
is the part the agent needs. Regression test: the first test in
`tests/boundary-inference.test.mts` asserts that **no** answer id from the stack appears
anywhere in a `request_release` result.

## Residual channel 1 — the band oracle

An agent that controls the marking can still probe. Mark one answer with a chosen subset of
rubric lines, watch `heldCount`, and it learns one bit: whether that subset's total lies within
the band of the boundary. `policyFor` is open source, so the band widths are known — 4, 10 and
16 — and raising the emphasis re-decides every answer at once, so one call re-reads every
earlier probe at a wider band.

What the bits are worth, on this fixture: four lines give 16 distinct subsets, and of those, 3
fall in the band at `standard`, 6 at `cautious`, 8 at `most-cautious`. A full table would place
each subset's total in one of four shells around the boundary — and **without a sign**, because
the test is symmetric. Differences of nested subsets then bound a single line's value to about
the width of a shell. That is an inequality system, not the arithmetic.

What it costs the attacker, and why the table cannot be filled:

- One clean bit per answer. A second, differing report on the same answer makes it
  `findings-unstable`, which outranks `near-boundary` in `holdsFor`, so the probe destroys its
  own channel — and `findings-unstable` **is** named to the agent and to the teacher's ledger,
  so the probe announces itself.
- 16 subsets against at most 13 usable answers — 14 minus the one the fixture quarantines — so
  the standard-band table cannot be completed in a session at all.
- Every probe is a write: a receipt, a revision bump, and a visible row in the ledger.
- Raising the emphasis is the only amplifier available, and it holds *more* answers back. The
  attack's own side effect is that fewer marks reach students.

Both bounds are asserted in `tests/boundary-inference.test.mts`.

## Residual channel 2 — the complement, after a human release

Once a person confirms a release, `describe_stack` reports those answers as `released` and the
rest as `marked`. The complement of the released set within the marked set is the held set, and
removing the named holds leaves the cliff answers by id — the same derivation the fix above
closed, arriving through a different door.

It is not closed, and the reason is a trade-off rather than an oversight. The agent must be able
to tell that an answer is settled: `propose_marks` refuses a whole batch that touches a released
answer, so an agent that cannot see `released` would be unable to avoid the refusal. Collapsing
`released` into `marked` would trade a bounded inference for a tool surface an agent cannot use
correctly. What limits the channel instead is timing: the information exists only *after* the
teacher has acted, so it cannot influence the decision it describes, and the answers it points
at are the ones already on the teacher's screen.

## What would falsify this record

- A tool result constructed anywhere but `reply()`.
- A tenth tool, or any new field carrying a page-derived list of ids.
- `near-boundary` named to the agent, in any form, including a renamed code.
- A real agent session. Everything in this record is derived from source and tests. Part of what it
  assumed has since been checked in a browser: `node --run webmcp` invokes the tools through
  Chromium's own `WebMCP` domain, and on that path no point value crosses, the held answers are
  counted without three of them being named, a staged release carries no answer id, and
  `confirm_release` cannot be dispatched at all — `docs/evidence/webmcp-invocation.json`. What is
  still untested is the assumption underneath the whole gate: that a *model's* behaviour is bounded by
  the shape of the surface. That needs a model, and none has run.
