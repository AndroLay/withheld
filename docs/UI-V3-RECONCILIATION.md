# UI V3 target — reconciliation against the frozen build

**Snapshot:** 2026-09-04
**Subject:** `target.md` §5, "Withheld UI V3 target — minimal, explicit, interaction-led"
**Release this is measured against:** source `b924a27a…`, build `84eee099…`,
`https://androlay.github.io/withheld/`
**Scope:** Withheld only. No file under `src/` or `scripts/` was changed to write this.

`target.md` §5 describes a UI. This file records, requirement by requirement, whether the
build that is already published satisfies it, satisfies it by another mechanism, or does not
satisfy it — and what closing each remaining item would cost. Verdicts use §10's vocabulary:
`PASS` means a current traceable artifact or source line supports it, `HOLD` means a useful
signal exists but the requirement is not fully met, `UNKNOWN` means the question is
unanswered. Where closing an item needs an application source change, that is marked
**(source)**, because §10's freeze rule then governs it rather than this file.

## Freeze verdict: §5 is not implemented now

§10 allows source to reopen for exactly four reasons. Each was tested against the current
package, and none holds:

1. *A hard official gate cannot pass without it.* The open official gates are the video,
   the Devpost text paste, and eligibility. None needs a UI change.
2. *The hosted page serves the wrong application.* It does not. `docs/evidence/manifest.json`
   records `liveUrlParity.state` as "no lag" and `hostedBuildIdentity.result` as "all three
   identical" — the three served files were fetched unauthenticated and hashed against
   `dist/` at 2026-09-03 19:25:19 UTC.
3. *A demonstrated security or authority defect invalidates the thesis.* None is
   demonstrated. The known boundary limits are disclosed, not open: see `docs/DEEP-AUDIT.md`
   M-22 for the absence of an escalation tool and `SECURITY.md` for the bounded injection
   claim.
4. *A deterministic mechanic is false and the copy cannot be corrected honestly.* No such
   finding exists; the arithmetic is page-owned and covered by the assertion suite.

The cost of ignoring that rule is concrete rather than procedural. Editing one file under
`src/` moves `sourceSha256`, rebuilds `dist/` under new hashed asset names, invalidates all
27 paths in `docs/evidence/checksums.txt`, and strands both hosted reports — 43/43 at
18:59:34 UTC and 19/19 at 19:06:44 UTC — on a build the live URL would no longer serve.
§5 is therefore recorded here as a post-freeze design target, and the sections below say
honestly which parts of it the shipped page already delivers.

## Layout

| §5 requirement | Verdict | Where |
| --- | --- | --- |
| Top bar: wordmark, session/revision | `PASS` | `src/ui/TopBar.tsx:19-31`. The revision is the page's only clock; there is no wall time anywhere on it |
| Top bar: agent status | `HOLD` | Installation state is read and rendered, but in the contract column rather than the bar — `src/ui/AgentPanel.tsx:106` |
| Top bar: compact "How it works" trigger | `HOLD` **(source)** | Two direct links to the audit and the gate exist instead — `src/ui/TopBar.tsx:34-38`. There is no stepper popover |
| Left policy and boundary rail | `PASS` | `src/ui/Rail.tsx` |
| Centre queue with one selected answer row | `PASS` | `src/ui/Stack.tsx`; each row is a `details`/`summary` disclosure with four tabs |
| Right agent contract and event record | `PASS` | `src/ui/AgentPanel.tsx`; the receipt ledger is `src/ui/Rail.tsx:129-163` |
| Bottom human gate: staged count and human-only wording | `PASS` | `src/ui/ActionBar.tsx:69-95` — "Only a person can release marks. Nothing leaves this page until you confirm." |
| Confirm disabled until a person has reviewed | `HOLD`, deliberate divergence | `src/ui/ActionBar.tsx:38-39` records the opposite decision: the padlock is not a disabled state waiting for an agent's permission. Focus moves to the heading, never the send button, so a staging agent cannot place focus on send — `src/ui/ActionBar.tsx:44-47` |

The first viewport shows the claim, the whole class as one strip of fourteen cells, and the
four live figures the strip adds up to, before the reader reaches any column
(`src/ui/Intro.tsx:111-113`). That band exists for the reason §5 gives for the answer row:
a page that opens in three dense columns reads as a marking dashboard, and the thing worth
noticing here is an absence.

## Event surface: a ledger, not popovers

§5 asks for a dismissible popover per WebMCP event plus a persistent compact chip. The
shipped page has the persistent half and not the transient half.

- `PASS` — every accepted call writes a receipt, and the ledger renders them in order with
  the action in plain language, the number of answers it touched, and the receipt id:
  `src/ui/Rail.tsx:155-163`.
- `PASS` — actor attribution exists and distinguishes all three actors. `callerOf` returns
  "by a tool call" or "by hand", and `null` for a human release, which is neither:
  `src/ui/AgentPanel.tsx:293-297`.
- `PASS` — the eight event types §5 lists are all page states today: read, propose, hold,
  refuse, stage, human-only, and commit-with-receipt. They are shown as state in the queue
  row, the rail and the gate rather than as timed cards.
- `HOLD` **(source)** — no popover or toast component exists.
- `HOLD` **(source)** — the human view prints the receipt id, not the operation id. The
  single-use `operationId` is required on every agent write and is recorded on the accepted
  receipt (`src/styles.css:1238`), so the fact is in the state; it is the human rendering
  that omits it.
- `PASS` by construction — §5's rule that no "agent is thinking" animation may appear
  without a received event cannot be broken here: the stylesheet declares no `transition`,
  no `animation` and no `@keyframes` at all.

## How-it-works and the counterfactual

§5 asks for a four-step stepper with a miniature example and a one-sentence counterfactual.

- `HOLD` **(source)** — there is no stepper popover.
- `PASS` — the one-sentence claim is the first line under the bar: "The page owns the
  decision." (`src/ui/Intro.tsx:113`).
- `PASS`, exceeded — the counterfactual is not a sentence but a panel, closed on arrival:
  `src/ui/Compare.tsx:21` is "a table of counterfactuals", and `src/domain/views.ts:130`
  names it "the panel that makes the cost concrete". `src/domain/views.ts:166` is the same
  counterfactual as the agent is told it, which is a narrower thing than the teacher sees.
- `PASS`, exceeded — §5's underlying ask, that a reader see what the agent cannot, is a
  first-class control rather than prose. The `Yours` / `Agent's view` toggle carries
  `aria-pressed` (`src/ui/Intro.tsx:47-51`), and holds the agent is counted but never named
  are flagged for the teacher only (`src/ui/Intro.tsx:71-77`). In the agent's view that flag
  is false because the map handed in has no `near-boundary` in it — nothing is hidden,
  because there is nothing to hide.

## Refusal and recovery

This is the weakest match in §5, and the gap is real rather than a difference of mechanism.

- `PASS` at the boundary — the refusals themselves exist, are deterministic, and are proven:
  `stale-revision` and `duplicate-operation` are returned by the tool layer, and
  `docs/evidence/failure-recovery.json` walks invalid → refused → valid alternative in 27 of
  27 checks. `confirm_release` is refused by not existing, which check 8 of the dispatch
  harness demonstrates.
- `PASS` for the page's own quarantine — an answer that addresses the marker is quarantined
  and named as such to the reader (`src/ui/wording.ts:47`), and further writes against it are
  refused from that point on (`src/ui/Stack.tsx:490`).
- `HOLD` **(source)** — there is no focused modal, and the four headings §5 asks for
  ("What arrived", "Why the page refused it", "What stayed unchanged", "How to recover") are
  not written anywhere in the human view. The refusal is legible to the agent that caused it
  and provable from the artifacts; it is not narrated to the marker.
- `PASS` — §5's constraint on that modal is already unbreakable: no page-owned number can
  reach an agent view, because `assertAgentSafe` throws on any number outside
  `AGENT_SAFE_NUMERIC_PATHS` (`src/tools/agent-boundary.ts`), measured at 17 of 17 in
  `docs/evidence/agent-view-sweep.json`.

## Agent contract panel

| §5 requirement | Verdict | Where |
| --- | --- | --- |
| Data that never crosses the boundary | `PASS` | `NEVER_CROSSES` at `src/ui/AgentPanel.tsx:49`, rendered at `:423` |
| Data that may be read | `PASS` | The registry rows carry read/write per tool — `src/ui/AgentPanel.tsx:206-208` |
| Unavailable by design | `PASS` | Rendered in plain language, and no unavailable operation is presented as a tool (`src/ui/AgentPanel.tsx:193`). The four enforced absences are set out in `README.md` |
| Available now / available after staging | `HOLD` **(source)** | The panel is not phase-aware. The phase ordering was delivered in `README.md` instead, which is possible because `docs/` is in neither tree hash — `docs/DECISIONS.md` D-40 |
| Disclosure sections for full payloads | `PASS` | The panel, the queue rows, the comparison table and the ledger are all `details`/`summary`; the payloads print in the agent column |

## One column

- `PASS` — the fold is one measured query, `MANY_COLUMNS = "(min-width: 78rem)"`
  (`src/ui/useOneColumn.ts:18`). The comment records that 78rem is where the work fits, not
  where the columns fit, and a test holds the two copies of the threshold together.
- `PASS` — the selected answer stays above the fold, because the queue row is a disclosure
  that opens in place rather than a panel that pushes.
- `HOLD` **(source)** — the contract does not become a bottom sheet and the gate is not
  sticky; `position: sticky` appears nowhere in the stylesheet. At one column the gate is
  reached by the link in the bar (`src/ui/TopBar.tsx:38`) rather than by always being on
  screen.
- `UNKNOWN` — no-horizontal-scroll is asserted by the render tests and by the 420px
  screenshot, but no real handset has opened this page. `docs/evidence/accessibility-manual-not-run.json`
  keeps that gap as `ENVIRONMENT_BLOCKED`.

## Accessibility and performance acceptance

| §5 acceptance item | Verdict | Evidence |
| --- | --- | --- |
| Focus moves into a modal and returns to the trigger | not applicable | No modal exists. Focus is managed where authority changes hands: `App` moves it to the gate's heading, deliberately not to the send button (`src/ui/ActionBar.tsx:44-47`) |
| Status events use an `aria-live` region | `PASS` | `src/App.tsx`; the region is always in the DOM and only its contents change, because a region added at the same moment as its text is not reliably announced (`src/ui/Intro.tsx:24-26`) |
| Keyboard can read, stage, decline, confirm | `PASS` at source level | Real `button` elements throughout — three in the gate (`src/ui/ActionBar.tsx`), three in the queue, one per lens; disclosure is native `details`/`summary`. Not confirmed with a screen reader — see the blocked artifact |
| Reduced motion disables transitions | `PASS` by absence | `src/styles.css` declares no `transition`, no `animation` and no `@keyframes`; its only `@media` rule is the 78rem fold. There is no motion to disable |
| No new third-party runtime or network request | `PASS` | Runtime dependencies are `react` and `react-dom` at exact pinned versions and nothing else; `src/` contains no `fetch`, `XMLHttpRequest`, `WebSocket` or dynamic `import()` |
| Popover open/close does not block the queue | not applicable | No popovers |
| Judge path readable with the contract collapsed | `INFERENCE` | The claim, the strip, the queue row, the held reason and the gate all sit outside the contract column. Not tested on a non-builder: `docs/evidence/gate-p2-not-run.json` is `NOT_RUN` with zero participants |

## The ten acceptance checks

| # | §5 check | Verdict | Evidence |
| --- | --- | ---: | --- |
| 1 | Cold reader identifies the problem in 10 seconds | `UNKNOWN` | The instrument for this was GATE-P2, which never ran and was withdrawn on 2026-09-04. The first-screen claim and the strip exist (`src/ui/Intro.tsx:111-113`); whether they land in ten seconds is unmeasured, and no document may assert it — `docs/GATE-P2-SIMULATION.md` explicitly cannot measure it, because a simulated reader has already read everything |
| 2 | A model READ event changes the row and the event rail | `HOLD` | Dispatched reads do change both, 19 of 19 in `docs/evidence/hosted-webmcp-invocation.json`. No **model** has read: `manifest.modelClient` is "none" |
| 3 | A PROPOSED event shows rubric ideas and no point value | `PASS` | The queue row prints rubric lines with no point value, and the mark the answer will be judged against is stated to be "in no tool result" (`src/ui/Stack.tsx:210-211`). Enforced by `assertAgentSafe`, 17 of 17 |
| 4 | An injection REFUSED event leaves arithmetic unchanged | `PASS` | `docs/evidence/failure-recovery.json`, 27 of 27, includes the quarantine path; the fixture is the one shipped answer that addresses the marker |
| 5 | A stale write shows recovery instructions and preserves state | `HOLD` | The refusal and the preserved state are proven; the *instructions* are not written in the human view. This is the one item where §5 asks for something the page does not have |
| 6 | STAGED does not release anything | `PASS` | `request_release` stages only; the gate reports "A release is staged. Nothing has left yet." (`src/ui/ActionBar.tsx:95`) |
| 7 | Confirm is disabled until human review and changes the revision once | `HOLD`, deliberate | Release is human-only and single, but confirm is not a disabled control awaiting agent permission — `src/ui/ActionBar.tsx:38-39` |
| 8 | Reload shows a clean session and an honest persistence limitation | `PASS` | No persistence exists; the limitation is disclosed in `README.md` and `docs/evidence/manifest.json` |
| 9 | Every event is backed by a real event, operation ID and revision | `HOLD` | Every agent write must carry `expectedRevision` and a single-use `operationId`, and receipts record them; the human ledger prints the receipt id rather than the operation id (`src/ui/Rail.tsx:163`) |
| 10 | The same behaviour appears in hosted evidence and the final video | `HOLD` | The hosted half is done — 43/43 at 18:59:34 UTC, 19/19 at 19:06:44 UTC, same build. No recording exists; the video is the one open link in `whatPointsAtThisRelease` |

## Genuine gaps, in the order they would be worth closing

Five items in §5 are not in the build and would each need an application source change. They
are listed smallest-first, because if a window opens it will be small.

1. **Recovery text in the human view.** Four short strings on a refused write: what arrived,
   why it was refused, what did not change, how to recover. This is check 5, and it is the
   only place where §5 names something the page lacks and the marker would use.
2. **Operation id in the ledger.** One field, already on the receipt, not printed. Closes
   check 9 without adding state.
3. **A phase-aware contract.** Splitting the registry into available now and available after
   staging. Already queued in `docs/DECISIONS.md` D-40 behind owner approval, with the phase
   order delivered in `README.md` in the meantime.
4. **A sticky gate at one column**, so "only a human can release" stays on screen on a phone.
5. **A how-it-works stepper** in the bar, with the four steps and the counterfactual. Lowest
   priority: the counterfactual already exists as a panel, which is stronger than a sentence.

Each of them costs the same fixed price, and it is not the edit. It is a new `sourceSha256`,
newly hashed `dist/` asset names, 27 invalidated checksum paths, a republish, a re-run of the
hosted browser and dispatch checks, four re-taken screenshots, a regenerated manifest — and a
re-recorded video if one exists by then. That is why §12's order of operations puts the video
last and forbids changing source after it.

## The V3 proposal already in this package

§5 is not the first V3 target this package has had, and the earlier one is more concrete: it is a
clickable page. `docs/design/proposal-v3.html` is 769 lines, self-contained, and opens with no server
and no build, next to seven renders at 1440px and 420px. `docs/design/README.md` states that it is not
part of the submission. Anyone acting on §5 should read it first, because the two documents overlap
heavily and the mockup carries measurements §5 does not.

Four things it proposed have since shipped, and the decisions record why:

- the fourteen-cell strip above the fold, and hover-to-name, click-to-jump;
- one answer as one row, opening on four tabs instead of four stacked sections;
- all fourteen answers listed at once, dropping the three-answer window — `docs/DECISIONS.md` D-31;
- **Agent's view**, redacting every page-owned value — D-33, which records that the built page achieves
  it by omission rather than by stylesheet, and why that difference matters.

Five it proposed are still unbuilt, and three of them are §5's items under other names:

| Proposal | §5's name for it | State |
| --- | --- | --- |
| An activity list, one row per dispatch, carrying the revision it produced or the refusal code it returned | the event rail plus the REFUSED popover | Unbuilt. `docs/design/README.md:50-52` notes refusals mutate nothing, so this list is the only place a refused call could leave a trace |
| A provenance tag per row, `tool` or `hand` | the popover's actor field | Partly shipped — `callerOf` derives it (`src/ui/AgentPanel.tsx:293-297`), but per-row tagging is not there |
| A call count instead of a connection claim: "no tool has been called yet" → "33 tool calls · revision 15", never "agent connected" | agent status in the top bar | Unbuilt, and the honest framing is the proposal's, not §5's: registration happens at page load whether an agent is present or not |
| A gate that reacts — "staged by a tool call — it reached the edge and stopped" | the STAGED event | Unbuilt |
| One call per answer, so fourteen writes land as fourteen revisions and the strip fills a cell at a time | not in §5 | Unbuilt; a batched `propose_marks` really does land in one revision |

Two cautions for whoever picks this up.

**Do not read payloads from the mockup.** `docs/design/README.md:5-8` records that its samples predate the
shipped tool surface: its `preview_unattended_outcome` invents the keys `wouldReachStudents` and
`wouldStay`, which no tool returns. The real payloads are in `README.md`'s tool table and in
`src/tools/webmcp.ts`.

**There is a live disagreement about the confirm button.** The mockup keeps it disabled either way
(`docs/design/README.md:63-64`), and §5 asks for it to be disabled until a person has reviewed. The
shipped gate deliberately refuses that framing: the padlock is not a disabled state waiting for an
agent's permission (`src/ui/ActionBar.tsx:38-39`). Whoever closes this item has to choose one reading and
record it as a decision rather than change the control quietly.

The mockup also supplies the one measured argument for doing any of this: at 1440px it halves the page,
1304 words on arrival against 892, and 2495px of height against 1216px. That is a legibility claim with
a number behind it, which is more than §5's "not a busier dashboard" gives on its own.

## What this file does and does not license

It is a reconciliation, not a change. Nothing here may be read as saying the V3 interface was
built, and no score may move because this document exists. The safe statement is that the
published build already satisfies most of §5's intent through progressive disclosure, a
two-lens view, a receipt ledger and a human-only gate, and that five named items — one of
them useful to a marker — remain unbuilt behind the source freeze.

The claim budget in §14 is unchanged by this file: a synthetic prototype demonstrating
page-owned arithmetic, bounded agent proposals, quarantine and refusal, and human-only
release. Not a model replay, not measured comprehension, not solved prompt injection.
