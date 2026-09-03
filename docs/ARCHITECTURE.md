# Architecture

Withheld is one sentence enforced in code: **the agent brings language, the page keeps the
arithmetic and the authority.** Everything below is a consequence of refusing to let those
two mix.

An agent may read the stack, recognise which canonical rubric ideas an answer expresses, and
report them back by id. It may ask for the finished marks to go out. It cannot decide what an
idea is worth, cannot learn where the pass boundary sits, and cannot be the thing that sends
a mark to a student. Those are not permissions that were withheld from a capable tool — there
is no tool that does them.

## Layers

Dependencies point one way only. Nothing below reaches back up.

```
src/data/fixtures.ts          the stack: synthetic answers, rubric, worked example
        │
src/domain/marks.ts           arithmetic. pure functions, no state
src/domain/session.ts         authority. the only writer of state
src/domain/views.ts           projections. one per audience, built separately
        │
src/tools/agent-boundary.ts   the fail-closed guard on the boundary
src/tools/webmcp.ts           the nine tools, registration, and the two facts the page prints
        │
src/ui/useMarkingSession.ts   one session, two callers
src/ui/useOneColumn.ts        whether the browser is in one column, so the contract can fold
src/ui/wording.ts             teacher-facing wording, and the quantised bar stop
src/ui/Icon.tsx               every glyph on the page, drawn as inline SVG
src/ui/Chain.tsx              why an answer was held, as three links. drawn in the queue and the audit
src/ui/TopBar.tsx             the bar across the top: the name, the revision, and two anchors
src/ui/Intro.tsx              the band under it: the claim, and the four counted figures
src/ui/Rail.tsx               the care setting, who can do what, the receipt ledger, the four steps
src/ui/Stack.tsx              the class, three rows at a time, with a mark form in each
src/ui/AgentPanel.tsx         the third column: the tool surface and four payloads, as the agent gets them
src/ui/Compare.tsx            the same stack under all three care settings
src/ui/Audit.tsx              what the page kept back, why, and what it cannot know
src/ui/ActionBar.tsx          the sticky foot: stage, and the confirm no tool can reach
src/App.tsx                   the shell: a bar, a band, three columns and the gate
```

`src/domain/` knows nothing about tools. `src/tools/` knows nothing about React. That is what makes
103 of the 129 tests possible without React entering the process at all — and the other twenty-six render
every component to static markup, with no DOM anywhere. It is also why the domain can be re-read as a
plain state machine by anyone auditing the claims in `SECURITY.md`.

## Why the cuts are where they are

**`marks.ts` is pure.** `computeMark(rubric, finding)` takes a rubric and a set of claimed
line ids and returns a total. It cannot see the session, so no amount of session state can
change what an idea is worth. An id that is not in the rubric earns nothing; an id claimed
twice is paid once. Both are tested.

**`session.ts` is the only writer.** Every mutation is a function
`(session, …args, expectedRevision, operationId?) → Commit | Refusal`. There is no setter, no mutable
object, and no path that changes state without producing a receipt. A caller working from a
stale read is refused rather than allowed to overwrite a decision it never saw.

**`views.ts` builds each audience its own object.** The teacher's `explainMark` and the
agent's `explainMarkForAgent` are two separate constructions, not one object with a filter
over it. This is deliberate: a field added to the teacher's view cannot appear in the agent's
by forgetting to exclude it, because there is nothing to forget — the agent's view is written
out by hand, field by field.

**`agent-boundary.ts` sits between the two.** It is the last thing that runs before anything
is serialised for an agent, and it throws rather than sanitising. See "The information
boundary" below.

## The state model

`Session` is one immutable record. Its fields, and why each exists:

| field | why |
| --- | --- |
| `revision` | monotonic counter, and the session's only clock |
| `question`, `rubric`, `answers` | the stack. `rubric.passBoundary` is page-owned |
| `emphasis`, `basePolicy` | how careful the page is being; raise-only |
| `marks` | the page's own arithmetic, keyed by answer id |
| `fingerprints` | last accepted set of line ids per answer, sorted and joined |
| `quarantined` | answers that addressed the marker. never marked |
| `unstable` | answers marked twice, differently |
| `receipts` | one per accepted state-changing action, identified by string and exact revision |
| `releaseRequest` | a request to release. holds no power of its own |
| `releasedAnswerIds` | what has actually gone to students |

**There is no wall-clock time anywhere in the session.** Revision is the clock. Two reasons,
and the second one is the interesting one: an epoch number in a receipt would make the tests
non-deterministic, *and* it would trip the boundary guard, because a timestamp is a number at
a path the allowlist does not name. The guard shaped the API rather than merely policing it.

## Two callers, one session

The teacher clicks and the agent calls tools. Both write to the same session, and the agent's
calls arrive between React renders — so a closure captured at render time would read a session
that has already moved.

`useMarkingSession` solves this with a ref, not with state:

```
latest: useRef(session)     ← the truth for reads
apply(next)                 ← the single mutator: writes the ref, then setState
port = { read: () => latest.current, write: apply }
readLatest()                ← manual handlers read the same ref before committing
```

Every tool reads through `port.read()` and writes through `port.write()`. The React state
exists only so the page re-renders; it is never the thing a tool reads. That is the whole
reason `SessionPort` exists as a type: the tool layer is handed two functions and never learns
that React is involved.

The manual form keeps the same revision discipline. Its checkboxes are controlled by React,
and the form records the revision and answer it opened. If a tool or another form changes the
session first, the open form enters an explicit conflict state, disables saving, and asks the
teacher to reload the current mark. On submit it passes its opened revision to `readLatest()` and
the same pure revision guard, so a submit that races React's next render is refused as stale rather
than applying a render-closure snapshot. A stale draft is never silently submitted against a newer
session.

## The write path, identical for both callers

1. Read the current `revision` (`describe_stack` for an agent; the render for the teacher).
2. Build a finding: an answer id and the rubric line ids recognised in it.
3. Call `proposeMarks(session, findings, expectedRevision, operationId)` for an agent write. The
   manual page path omits the optional key because it has no transport retry boundary.
4. The session checks: is the revision current, do the answers exist, has anything already
   been released? Any failure refuses **the whole batch** — partial acceptance would leave the
   caller guessing which half landed.
5. Quarantine is checked before marking. An answer that addresses the marker is escalated and
   any mark it had is deleted. The injection costs the attacker their mark rather than earning
   them one.
6. The page computes the total itself, writes a receipt (including the opaque operation id for an
   agent write), and bumps the revision. Reusing an accepted operation id is refused before any
   revision or state change.
7. Holds are recomputed from scratch on the next read.

The teacher's rubric ticks enter at step 2 and follow the same path, refusals included. There
is no privileged write.

## Holds are derived, never stored

`holdsFor(session)` recomputes every hold on every call, in priority order:

1. **`answer-contains-instructions`** — quarantined. Wins over everything, and the answer has
   no mark at all.
2. *no mark yet* — skipped. Pending is not the same as held.
3. **`findings-unstable`** — the same answer was marked twice with different results.
4. **`long-answer-no-rubric-idea`** — long enough to be a real attempt, matched nothing.
5. **`near-boundary`** — the total sits within the band where one point changes the grade.

Deriving rather than storing has a consequence worth stating: raising the care setting
re-decides every answer already marked, including ones marked before the setting changed. A
hold is a fact about the current stack, not an event in its history.

`policyFor(emphasis)` widens the boundary band and lowers the long-answer threshold as the
setting rises. An agent may raise it. Nothing — agent or teacher — can lower it, because a
setting that releases *more* than the page already would is not a setting this page offers.

`findings-unstable` has an incidental property that is load-bearing for the threat model: an
answer re-marked differently is held permanently. So the one-bit "was this held?" channel is
single-shot per answer — probing it burns it.

## The information boundary

`assertAgentSafe(payload)` runs in exactly one place: `reply()` in `src/tools/webmcp.ts`. Every
tool result goes through it, including refusals, so no error path is a way around it.

It is **fail-closed in two directions**:

- **By path.** A number may appear only at a path in `AGENT_SAFE_NUMERIC_PATHS` — eight
  entries, all counts and the revision. A new numeric field in a tool result fails the test
  suite rather than shipping.
- **By text.** `forbiddenNumbersInText` scans generated strings for the page's live point values
  and pass boundary, so arithmetic cannot escape by being spelled out in a sentence. The one
  deliberate exception is `read_answer.answer.body`: that is raw student content the agent must
  read, and it is explicitly labelled untrusted rather than treated as page-generated prose. If
  a generated field does contain an owned value, the tool wrapper fails closed and returns only a
  generic recovery envelope.

The guard runs on the payload, not on the transport envelope. The envelope nests the payload
one level down, which would shift every allowlisted path and make the allowlist harder to read
than the thing it protects.

The text canary only means something because of a property of the fixtures: **every page-owned
number is larger than the answer count.** Rubric lines are worth 17, 19, 23 and 29, and the
boundary is 50, against 14 answers. So no count, index or character length can collide with a
secret and make the canary fire on a coincidence. Two tests pin that property in place, and
changing a fixture point value to something small will fail them.

## What the agent can and cannot see

| the page knows | the agent is told |
| --- | --- |
| point value of each rubric line | the line's id and label, nothing else |
| the pass boundary | nothing |
| each answer's total | which line ids were credited |
| distance from the boundary | nothing, and no ordering that implies it |
| every hold and its reason | three of the four reasons, by answer |
| — | `heldCount`, which counts all four |

The fourth reason, `near-boundary`, is **omitted rather than renamed**. An earlier version gave
it a vague code; that was a fig leaf, because the mapping lives in an open-source file and a
1:1 rename is trivially invertible. So the agent sees `namedHolds` shorter than `heldCount` and
learns exactly one bit: *a person is needed and the page will not say who for.*

`explain_mark` returns no total, and also no ordering by closeness to the boundary and no word
like "nearly", because either would rebuild the distance that removing the totals was meant to
hide.

`AgentAnswerState` collapses "marked cleanly" and "marked but held near the boundary" into one
value, `marked`, for the same reason: splitting them would hand the agent the list of answers
sitting on the cliff.

## The release path

Staging and sending are two different acts, and only one of them is available to software.

```
request_release (agent)  ─┐
                          ├─→ releaseRequest recorded, nothing sent
"Stage release" (page)   ─┘
                                      │
                          confirmRelease() ← a click, in the page, by a person
                                      │
                              releasedAnswerIds
```

`confirmRelease` is not exported to the tool layer, and `tests/webmcp.test.mts` reads
`src/tools/webmcp.ts` as text and asserts the file never so much as names it. It also
recomputes what is releasable at the moment of the click, so a hold raised between the request
and the confirmation still wins.

There is no `confirm_release` tool and there is not meant to be. That absence is the one design
decision in Withheld that is a refusal to build something. Both the confirm and decline clicks are
still state-changing actions: they write a receipt with an exact revision and appear in the
teacher's timeline, but those human-only receipts are never exposed as a tool capability.

## Refusals are results, not exceptions

Every write can fail, and a failure comes back as an ordinary tool result with a code the agent
can act on:

| code | when |
| --- | --- |
| `stale-revision` | the caller read an older revision than the current one |
| `unknown-answer` | an answer id that is not in the stack |
| `already-released` | the answer has gone to a student; marking is closed |
| `emphasis-cannot-be-lowered` | any attempt to make the page less careful |
| `no-change` | the requested emphasis is already active |
| `duplicate-operation` | an accepted operation id is submitted again |
| `release-already-staged` | a second release request arrives before the first is confirmed or declined |
| `nothing-to-release` | a release was staged with nothing releasable |
| `invalid-argument` | arguments failed the checks in the tool layer |
| `internal-error` | an unexpected tool-side failure is converted to a generic retry envelope |

**No refusal message contains a digit**, and a test enforces it. A refusal is a channel out of
the page like any other, and "you are 3 points short" would be a leak wearing an error's
clothes.

Arguments are validated in code, not trusted from the schema. The JSON schemas are closed and
bounded, and the checks in `readAnswerId`, `readFindings`,
`readExpectedRevision`, `readOperationId` and `readEmphasis` are strict and **refuse rather than coerce**, because
a coerced argument is a decision made on the model's behalf.

## Registration against the browser

`findModelContext()` checks `document.modelContext`, then the `navigator.modelContext` that
Chromium deprecated, so a judge on an older build still sees the tools. When neither exists the
page carries on as an ordinary web app — which is the only state this project has ever actually
observed.

Teardown is an `AbortSignal`, because the API has no `unregisterTool`. That is also what makes
React StrictMode's deliberate double mount safe: a module-level
`WeakMap<object, AbortController>` makes the second install a no-op instead of handing the agent
two of every tool with no way to tell them apart. The abort is re-checked *inside* the
registration loop rather than once at the top, so a teardown part-way through reports what
actually landed rather than claiming the whole set either way.

If a registration provider refuses any tool, the installer aborts the partial set and returns the
failed names plus a retry callback. `AgentPanel` reports that the surface is incomplete without
printing provider error detail and exposes `Retry registration`, including when zero tools landed;
the render suite covers that first-tool failure state. This keeps a browser/provider failure
actionable without presenting a partial registry as a complete capability surface.

## What this architecture does not do

No persistence — a refresh is a new session. No accounts, no multi-user, no network request of
any kind. The fixtures are synthetic and alias-only; there is no real student data anywhere in the
repository.

**No undo, and the word for that has to be used carefully.** Four things can be taken back: a
proposal is only a proposal until a release is staged, a staged release can be declined, every write
leaves a receipt so the history of what was decided is readable, and any mark can be re-entered by
hand at any time. One thing cannot: a release a person has confirmed. That is a decision rather than
a missing feature — a page whose argument is that exactly one control sends a mark to a student
cannot also offer to unsend it, because "it can be undone" is how a confirmation stops being read.
See `docs/DECISIONS.md` D-23.

And the honest limit, narrower than it was: the page has been rendered in a browser and measured —
layout, policy enforcement, focus, console — and the nine tools have been invoked through Chromium's
own `WebMCP` domain, with the page moving in response. **What no run shows is a model choosing a
tool.** Statements here about how the interface reads, as opposed to how it lays out or how it
answers a call, remain statements about the source, checked by reading it and by test. See
`docs/PROGRESS.md` for the ledger of what is verified and what is not, and
`docs/evidence/browser-session.json`, `docs/evidence/native-registry.json`,
`docs/evidence/webmcp-invocation.json`, and `docs/evidence/failure-recovery.json` for what the
local browser reported. The hosted, model-selected, screen-reader, performance, and non-builder
evidence files remain explicitly blocked or not-run.
