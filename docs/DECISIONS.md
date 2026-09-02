# Decision log

Numbered, dated, and written so that a reader can disagree with a specific one instead of with
the whole project. Each entry records what was decided, what it cost, and — where it applies —
what was rejected first.

Dates are the day the decision was made, not the day it was written down. Anything dated before
2026-09-01 is reconstructed from the repository's own commits and documents rather than from a
log kept at the time.

---

## D-01 — The agent reports ideas; the page computes points

**2026-08-31.** A marking agent's obvious API is "here is the mark I gave." That was rejected.
The agent's only vocabulary is the set of canonical rubric line ids the page already holds, and
`computeMark` in `src/domain/marks.ts` turns those ids into a total.

**Consequence.** An injected instruction has nothing to act through: there is no argument
anywhere on the tool surface that carries a number of points, a total, or a pass/fail. The
attack surface for "award me full marks" is not hardened — it does not exist.

**Cost.** The agent cannot express partial credit or a judgement the rubric has no line for.
That is a real loss of expressiveness, accepted on purpose: partial credit is exactly the kind
of judgement this design says a person should make.

---

## D-02 — There is no `confirm_release` tool

**2026-08-31.** Releasing marks to students is a click in the page, performed by a person.
`confirmRelease` is not exported to the tool layer, and `tests/webmcp.test.mts` reads the tool
file as text and asserts it never names the function.

**Consequence.** No sequence of tool calls puts a mark in front of a student. A test drives four
release requests in a row and asserts `releasedAnswerIds` is still empty.

**Cost.** The workflow cannot be fully automated, which is the point. This is the one decision
in the project that is a refusal to build something.

---

## D-03 — Near-boundary holds are omitted from the agent's view, not renamed

**2026-09-01.** The first implementation gave `near-boundary` a vague agent-facing code,
`page-reserved`, so the agent would at least know a hold existed without being told why.

**That was wrong and was removed before it shipped.** The mapping from `page-reserved` back to
`near-boundary` lives in an open-source file, so a 1:1 rename is trivially invertible: an agent
that reads the repository learns that the hold it was just told about means "this answer is
sitting on the pass boundary." A rename hides nothing from anyone who can read.

**Consequence.** Near-boundary holds appear only in `heldCount`. `namedHolds` is shorter than
`heldCount` whenever the page is holding something it will not name, and that gap is the one bit
the agent is intended to learn: *a person is needed, and the page will not say who for.*

**Residual, and stated in `SECURITY.md` rather than hidden.** That bit is a real channel. It is
single-shot per answer, because re-marking an answer differently makes it permanently unstable,
so probing the channel burns it.

---

## D-04 — Revision is the only clock

**2026-09-01.** No wall-clock time anywhere in the session. Receipts identify themselves as
`rcp-<revision>`.

**Consequence.** The tests are deterministic without freezing a clock. But the real reason is
the second one: a timestamp is a number at a path the boundary allowlist does not name, so a
receipt carrying one would fail `assertAgentSafe`. The guard shaped the API instead of merely
policing it, which is the strongest evidence available that it is doing something.

---

## D-05 — The CSP is injected into the production build only

**2026-09-01.** A `<meta http-equiv="Content-Security-Policy">` in the source `index.html` would
also apply in development, where it blocks Vite's HMR websocket. So the policy is added by a
Vite plugin with `apply: "build"`.

**Consequence.** Local development works, and the hosted artefact carries the policy. Verified by
reading the built file: the CSP is at `dist/index.html:4`, the referrer policy at :5, and the
first script tag at :14 — the policy precedes the script it governs.

**Cost.** The policy is not exercised during development, so the first time it is enforced will be
the first time the page is hosted. `style-src 'self'` without `'unsafe-inline'` was checked the
only way available without a browser: by grepping the build for inline styles and the source for
`style={` and `dangerouslySetInnerHTML`, and finding none.

---

## D-06 — Holds are derived on every read, never stored

**2026-09-01.** `holdsFor(session)` recomputes the entire hold set from the current marks and the
current care setting.

**Consequence.** Raising the care setting re-decides every answer already marked, including ones
marked before the setting changed. A hold is a fact about the stack as it stands, not an event in
its history. Storing holds would have made "raise the emphasis" a much weaker action — it would
only affect what came next.

---

## D-07 — The care setting can be raised and never lowered

**2026-09-01.** `set_marking_emphasis` refuses any level at or below the current one with
`emphasis-cannot-be-lowered`.

**Consequence.** There is no setting on this page, reachable by any caller, that makes it release
more than it already would. An agent can make the page more cautious; nothing can make it less.

**Cost.** A teacher who over-corrects has to reload. Accepted: the alternative is a lever an
injected instruction could pull.

---

## D-08 — No refusal message contains a digit

**2026-09-01.** Enforced by a test over every `RefusalCode`.

**Consequence.** A refusal is a channel out of the page like any other. "You are 3 points short"
would be a leak wearing an error's clothes, and the error path is the one developers forget to
audit.

---

## D-09 — Loose schema, strict code

**2026-09-01.** The JSON schemas handed to the model are forgiving; the checks in the tool bodies
are strict and **refuse rather than coerce**.

**Consequence.** A coerced argument is a decision made on the model's behalf. `expectedRevision:
"1"` is refused rather than parsed, because a caller that sent a string may have sent it for a
reason nobody here can guess. Nine malformed calls are tested and all nine are refused.

---

## D-10 — Each audience gets its own object, not a filtered one

**2026-09-01.** `explainMark` and `explainMarkForAgent` are two separate constructions.
`unattendedOutcome` and `unattendedOutcomeForAgent` likewise.

**Consequence.** A field added to the teacher's view cannot leak into the agent's by forgetting to
exclude it, because there is no exclusion list to forget — the agent's view is written out field
by field. A filter over a shared object fails in the safe direction only if the filter is
maintained; a separate projection fails safe by construction.

---

## D-11 — A batch refuses whole or lands whole

**2026-09-01.** One unknown answer id, one stale revision, or one already-released answer refuses
the entire `propose_marks` call.

**Consequence.** Nothing lands half-applied, so a caller never has to work out which half of its
report survived. The tool description says so in as many words, because the agent needs to know
that retrying with a smaller batch is the correct response.

---

## D-12 — Teardown is an `AbortSignal`, and a `WeakMap` makes StrictMode safe

**2026-09-01.** WebMCP has no `unregisterTool`. The only teardown the API offers is the abort
signal passed at registration.

**Consequence.** React 19's StrictMode mounts effects twice on purpose. Without a guard that hands
the agent two of every tool, with no way to tell them apart and no way to remove either. A
module-level `WeakMap<object, AbortController>` makes the second install a no-op and reports
`alreadyInstalled: true`. The abort is re-checked inside the registration loop rather than once at
the top, so a teardown part-way through reports what actually landed.

---

## D-13 — Every page-owned number is larger than the answer count

**2026-09-01.** Rubric lines are worth 17, 19, 23 and 29; the boundary is 50; there are 14
answers.

**Consequence.** This is what makes the text canary meaningful. No count, index or character
length can collide with a secret, so a canary hit is a real leak and never a coincidence. Two
tests pin the property, and lowering a fixture point value will fail them.

---

## D-14 — The teacher's manual path is the same write path

**Historical snapshot, 2026-09-01.** Rubric ticks were collected by an uncontrolled `<form>` and submitted through
`proposeMarks` with the current revision, exactly as an agent's report is.

**Consequence.** There is no privileged write, so the escalation rules cannot be bypassed by
clicking. The teacher can also trip a refusal, and the page shows it — the branch exists rather
than being asserted away, because two callers share one session and only one of them is in
`App.tsx`.

**Why uncontrolled.** No half-entered mark sits in React state waiting for something else to
commit it. The page reads the ticks once, on submit.

**Current status.** This decision is superseded by the revision-aware controlled form in
`src/ui/Stack.tsx`. A draft opened before another caller changes the session now enters an explicit
conflict, disables save, and requires `Reload current mark`; this closes the silent-overwrite risk
without changing the shared `proposeMarks` write path.

---

## D-15 — The page works with no agent, as the base case

**2026-09-01.** Every tool has a visible manual equivalent, and the status line says plainly when
no model context was found.

**Consequence.** This is not a graceful fallback. At the time of writing, **no natural-language
model driving these tools has been observed here** — the local CDP harness is a transport check,
not a model replay. The no-agent path is still the only ordinary page path that has run, and it had
better be the honest one. A teacher can tick rubric lines by hand and get exactly
the same holds, the same counterfactual, and the same two release buttons.

---

## D-16 — A receipt echoes only what the agent named

**2026-09-01.** `committedPayload` takes the ids to echo as an argument, and only `propose_marks`
passes any. A receipt written for a set the *page* chose comes back to the agent as a count.

**Why.** `request_release` used to return the receipt verbatim, and that receipt lists every
releasable answer. Releasable means marked-and-not-held, so the agent could subtract that list
from the marked answers in `describe_stack`, drop the holds it is allowed to see, and be left with
the answers sitting on the pass boundary — by id, in one call. Both boundary checks passed, because
an id is not a number. `docs/GATE-W1.md` has the derivation and
`tests/boundary-inference.test.mts` the regression.

**Consequence.** The rule is now about provenance rather than about content: what the agent told
the page may come back to it, so it can tell a landed batch from a refused one; what the page
worked out stays with the page. `releasableCount` still says how many answers a release would
cover, which is what the agent actually needs.

**What this does not fix.** The same complement is derivable after a person confirms a release,
because `describe_stack` then reports those answers as `released` and the rest as `marked`. That
one is kept on purpose: an agent that cannot see `released` cannot avoid the `already-released`
refusal, which fails a whole batch. It is a bounded inference, arriving after the decision it
describes, traded against a surface an agent can use correctly.

---

## D-17 — The agent's view is printed on the page, and it is the tool output

**Historical design, 2026-09-01 (superseded 2026-09-02).** The page showed what an agent was handed:
all nine tool names, an absent tenth, and four redacted payloads as JSON. Two alternatives were
rejected. A screenshot of a browser agent
mid-session is not available — none has ever driven these tools. A hand-written illustration of the
payloads was rejected for a worse reason: it would drift from the tools silently, and the drift would
always be in the flattering direction.

So `toolSurfaceFacts()` builds the real registrations and `agentFacingPayloads()` calls the same four
payload builders the read tools call, through the same `assertAgentSafe`. Four tests in
`tests/webmcp.test.mts` hold the two together, one of them asserting each printed payload is
`deepEqual` to what its tool returns.

**Historical consequence.** The central claim stopped being a sentence in a README. A reader saw the
totals and the five held answers in the stack, and the JSON directly beneath it that contained neither.
A tenth tool would appear on that page without anyone editing the page.

**Why the old absent row was hand-written.** A list built from the registrations could not name a
tool that was never built, so the old design typed it out once in `AgentPanel.tsx`, struck through and
dashed. That row was removed on 2026-09-02 because the acceptance boundary is stronger when the agent
UI exposes only callable tools. The browser registry negative probe remains the evidence for absence.

**Cost.** The teacher's page now displays the agent's view, which means one more surface to keep
honest: if the panel ever showed a total it would be contradicting the page's own claim on screen. A
test asserts the printed payloads pass the same two boundary checks the tool results do.

**Current decision, 2026-09-02.** The panel lists exactly the nine registered tools and describes the
human-only release gate in prose. It does not print an unavailable operation name. The native browser
negative probe still attempts that name outside the page and records `Tool not found`.

---

## D-18 — The renders are a test, not a script I ran once

**2026-09-01.** Every claim in `docs/PROGRESS.md` about what the page renders was produced by a
throwaway script: create a Vite server, load each component through the SSR module loader, render it
to static markup, count things, print, delete the script. That made the strongest claims in the
package rest on the weakest evidence available — true on the day they were written, unenforced every
day after, and impossible for a reader to re-run.

`tests/render.test.mts` is that script, kept. Twelve renders on every `pnpm test`: the top bar, the
rail in two states, the stack, the contract column in three (no agent, an agent connected, nothing
marked), the comparison, the audit rail, the bar idle and staged, and `App` whole.

**Why Vite is in a test file.** Node's `--experimental-strip-types` erases types and cannot transform
JSX, so the components cannot be imported by the test runner directly. The server is created in
middleware mode, never listens on a port, and is closed in `after`. The alternative — installing a
DOM library and a second toolchain to compile JSX for tests — is a heavier dependency for a weaker
result, because it would still not be a browser.

**Every count is derived.** Fourteen rows because `SPOON_ANSWERS` has fourteen entries; fifty-six
checkboxes because fourteen answers carry four rubric lines each; five audit entries because
`holdsFor` returns five; one projection per entry `agentFacingPayloads` returns. A snapshot would
freeze the fixtures; this moves with them.

**Consequence.** Two silent failure modes are now loud. A component that reaches for
`session.marks[id].total` on an unmarked answer is a blank page and nothing else in the suite would
notice, because nothing else builds an element. And a class name with no rule behind it renders a
zero-width bar — a student who scored nothing, drawn from a mark that was fine — which no amount of
looking would catch, because a genuine zero looks the same.

**Cost.** `pnpm test` now starts a Vite server, which is most of its runtime. The renders still prove
nothing about layout, focus order, contrast or a screen reader, and `renderToStaticMarkup` runs no
effect, so the registration and the focus move remain unexercised. This narrows the gap to a browser;
it does not close it.

---

## D-19 — `img-src` narrowed to `'self'`, and the policy is held to its shape by a test

**2026-09-01.** The hosted policy carried `img-src 'self' data:`. `SECURITY.md` had already named it
the one directive wider than the app needs; this closes that. There is no `<img>` element in `src/`,
no `url()` in the stylesheet, no `data:` URL in the source and no favicon link in `index.html` —
every glyph is inline SVG in `src/ui/Icon.tsx`, and inline SVG is not an image load. The scheme was
permission the page never exercised.

It stays at `'self'` rather than `'none'` so a browser's implicit `/favicon.ico` request is an
ordinary 404 instead of a policy violation in the console.

**The test matters more than the narrowing.** `tests/styles.test.mts` now reads `vite.config.ts` as
text and fails if any of the nine directives goes missing or if `'unsafe-inline'` appears anywhere in
the policy. Every proportional bar on this page is a quantised class because `style-src 'self'`
forbids an inline width; the cheapest way out of that constraint is to widen the directive, and doing
so would work, ship, and quietly retire the reason those classes exist.

**Cost.** None to the page. The test reads a config as a string, which is a blunt instrument for the
same reason the `confirmRelease` source-text test is: the claim being defended is about what is *not*
there.

---

## D-20 — The page is driven in a real browser, by a script with no dependencies

**2026-09-01.** Every visual and behavioural claim in this package was a claim about the source.
Static renders prove the trees do not throw; they cannot say whether the grid lays out,
whether the policy is enforced, where focus goes, or whether a bar has any width on screen. That
gap was the largest one in the package, and it was closed by a program rather than by a session
someone remembers having: `scripts/browser-session.mjs`, run with `pnpm browser`, **HISTORICAL_LOCAL:
37 checks** as of
2026-09-01, exits
non-zero if any fails, writes `docs/evidence/browser-session.json` and four screenshots.

**No browser driver was added.** Node has had a global `WebSocket` since 22, so the script speaks
the DevTools Protocol directly — `Page.navigate`, `Runtime.evaluate`, `Log.entryAdded`,
`Network.requestWillBeSent`, `Emulation.setDeviceMetricsOverride`, `Input.dispatchKeyEvent`. The
alternative was Playwright or Puppeteer, either of which rewrites a workspace lockfile that belongs
to other work in this repository. A few hundred lines of protocol calls is the cheaper cost.

**It serves `dist/`, not the dev server.** The CSP is injected by a build-only plugin, so the dev
server is a more permissive page than the hosted one and testing the policy there would test
nothing.

**It runs Chromium with the WebMCP flags but without `--disable-web-security`.** Turning the
policy off to make the run easier would have discarded the only check that matters most here.

**What the run bought.** The policy is enforced and not merely present: an injected inline
`<script>` did not run, an injected `style` attribute did not apply, and the browser logged exactly
those two violations while the page raised none. Focus moves to the bar's heading when a release is
staged, which is an effect and was therefore untestable before. Nothing spills sideways at 1440px or
420px, no request left `127.0.0.1`, the console is clean, and `document.modelContext` exists on a
flagged build with all nine tools registered.

**What it does not buy, and the script's own header says so.** It reads the WebMCP registry; it is
not an agent. A green run makes no claim about a model choosing a tool and calling it, so "no
browser agent has driven these tools" survives every run of it. Nor does it judge contrast, wording
or screen-reader output — it measures.

**It found a defect on its second run, which is the whole argument.** The four "look at" lines in
the left rail were rendering one word per line. `.flow__step` is
`grid-template-columns: 26px minmax(0, 1fr)`, `.flow__badge` spans three rows in column one, and
`.flow__look` is the fourth in-flow child — so auto-placement put it in column one of row four, a
26px track. Fixed with `grid-column: 2`. No test in the suite could have caught it: the markup was
correct and the class names all had rules. Reading the source did not catch it either, twice. The
regression guard is deliberately generic rather than aimed at that one class — the narrowest
paragraph on the page must be at least 80px wide, and it is currently 200px of 42.

**A first-run failure is also worth recording, because the check was wrong and the page was right.**
The bar check demanded a non-zero width from every bar, and a bar can belong to an answer credited
with nothing. A bar at stop 0 is the correct rendering of a zero, and a blocked inline width would
have collapsed *all* of them — so the check now reads the quantised stop out of the class name,
requires width only above stop 0, counts the bars at stop 0 rather than failing them, and asserts
separately that the stops resolve to more than one length. Distinguishing an empty
bar from a broken one is the only version of that check worth having.

## D-21 — The page was rebuilt to the target images, and departs from them in three places

**Superseded by D-27, and kept as a dated record rather than corrected.** Everything below describes the
two-hue mockups of 2026-09-01 and the page built to them: 256/776/336px tracks, an amber and grey text
pair, one bar with the pass mark ticked. A monochrome mockup replaced both drawings the next day —
An earlier monochrome visual target was 1487×1058, and the two blue-and-amber SVGs this entry was written
against are no longer retained as public design references. The current palette, the current tracks and the current
count of departures are D-27's, not this entry's. The three
departures named here still hold in substance — contrast beat fidelity, the tool names stayed whole, and
the top bar's release control is still an anchor to the gate rather than a second button that could send —
but their figures are the old drawing's.

**2026-09-01.** Two deterministic visual mockups — 1440×900 and 390×844 — guided the interface, and
the page was rebuilt to them: a bar across the top, three columns, a sticky foot. The layout is now
measured rather than asserted: 256px of policy, 776px of work, 336px of contract at 1440px, and one
column at 420px, both recorded in `docs/evidence/browser-session.json`.

**What moved.** The agent's view was a card under the stack and is now the whole third column, so the
two halves of the boundary can be read side by side instead of scrolled between. The audit account
moved the other way, from the third column into the work column, directly under the stack it
comments on. The identity, the revision and the held count left the columns for the top bar, because
they are true of the whole page and were being repeated. Every count now has exactly one home.

**Three departures from the mockup, each for a reason that outranks fidelity.**

*Text keeps darker hues.* The mockup sets small text in `#b36b12` amber and `#8a959f` grey, which
compute to 3.93:1 and 3.05:1 against their backgrounds. Text is `--held: #a2560b` (5.10:1) and
`--muted: #5e6c79` (5.32:1 on white) instead; the mockup's hues survive on bars, rules and borders,
where 3:1 is the applicable ratio. These figures are computed from the tokens, not measured by a
tool, and no one but the author has looked at the result.

*The tool chips carry full names.* The mockup pairs them two across as `PREVIEW_OUTCOME`. The list is
the surface an agent is offered and this column exists to be checked against it, so an abbreviated
tool name here would be a small lie. It costs the second column: the chips stack.

*The top bar's green "stage a release" button is an anchor.* Reproducing it would put a second
release control on a page whose argument is that exactly one control releases a mark and it is at
the foot of the page. Both top-bar controls are anchors, and a test asserts the bar contains no
`<button>` at all. The contract column's foot does the same thing: it names the human-only action
and links to the gate rather than repeating it.

**One thing the redesign simplified rather than restyled.** Each row drew two bars, credited and not
credited, which is one fact drawn twice — the track a fill does not cover *is* the remainder. There
is one bar now, with the pass mark ticked on the same axis, and the percentages a sighted reader gets
from the tick's position are spelled out for a screen reader beside it.

**The omission this entry used to record is now done.** The design brief asks that on a
phone the contract column become a panel that can be opened rather than small text that is always
there. It is one: below 62rem the whole third column is a `<details class="fold">` that arrives closed,
with the column's own `h2` as its summary, and above that width it is a plain region with no summary at
all. Two shells rather than one styled twice, because a summary that stays on a desktop is a control
that hides what it does. The element is chosen in JavaScript — `useOneColumn()` over
`window.matchMedia`, with `useSyncExternalStore` so the first paint gets the real width and a resize is
live — and CSS alone genuinely cannot do it, which is why the earlier version of this entry recorded the
omission instead. The breakpoint is exported as one string and `tests/styles.test.mts` asserts the sheet
switches `.app__cols` at exactly that width, since two copies of a breakpoint drift silently into a
folded desktop column or a phone with a column off the side of the screen. Measured at both widths in
the browser: absent at 1440px; at 420px the closed panel showed 0 of 9 tool rows and the opened panel
showed all 9, shut again on the next press. That check failed on its first run for a reason
worth keeping — a closed `<details>` is `content-visibility: hidden`, which skips paint but keeps
layout, so every row still reported a box; it asks `checkVisibility()` now and the evidence keeps both
figures. **What is still not true: nobody has read this page on a phone.** 420px in a headless browser
is a width, not a hand.

**What the mockups do not prove, and this entry does not claim.** They are drawings. They say nothing
about fairness, about whether the problem is real to anyone but the author, about CSP enforcement,
about native agent invocation, or about hosted behaviour. The browser session is what establishes the
layout; the mockups only said what to aim at.

## D-22 — The tools are invoked by the browser, in a script of their own

**Decision.** A second browser script, `scripts/webmcp-invoke.mjs` (`node --run webmcp`), drives the
nine tools through Chromium's `WebMCP` DevTools domain — `WebMCP.enable` to read the registry,
`WebMCP.invokeTool` to dispatch one by name into the frame that registered it, `WebMCP.toolResponded`
to collect what the handler returned — and then reads the rendered page to see what moved. It writes
`docs/evidence/webmcp-invocation.json` and it is **not** part of `pnpm browser`.

**Why a second script rather than more checks in the first.** Two reasons, and the second is the real
one.

The mechanical reason: the session script measures a page in a settled state, and these checks need a
*fresh* one. The strongest of them sends the prompt injection as a tool call — every rubric line
claimed for the answer whose text asks the marker to ignore the rubric — against an unmarked stack, so
that the quarantine is the page's answer to the call rather than something the worked-example fixture
had already done. Folding that into a run that clicks the worked example first would have made the
check meaningless while leaving it green, which is the worst kind of check.

The real reason: **the evidence classes have to stay apart on disk, not only in prose.** There are five
of them and they are routinely collapsed into one sentence by people summarising work like this —
including by me, which is why the separation is now structural:

| class | what it establishes | where it lives | state |
| --- | --- | --- | --- |
| the source | the functions do what they say, and no tree throws | **HISTORICAL_LOCAL:** 110 tests, twenty-three renders; **VERIFIED_RUN:** current writable run is 125 tests | green for the current run |
| the artefact in a browser | layout, CSP **enforced**, focus, contrast, the AX tree, clean console | **HISTORICAL_LOCAL:** `pnpm browser`, 37 checks; **VERIFIED_RUN:** current 44 checks | green for the current run |
| the browser's registry | the API exists and nine tools registered | both scripts | green |
| dispatch through that registry | a call from outside reaches the handler, and the page moves | **HISTORICAL_LOCAL:** `pnpm webmcp`, 18 checks; **VERIFIED_RUN:** current 19 checks | green for the current run |
| failure and recovery | one refusal/retry/release journey remains consistent across native dispatch and page UI | **VERIFIED_RUN:** `failure-recovery.mjs`, 27 checks | green locally; hosted/model open |
| a model | it finds the page, picks a tool, writes the input | nothing | **absent** |

The fourth is new and it is the one this entry adds. It closes the part of the agent story that was
missing — a call the page did not make, arriving the way a browser agent's host would send it, and the
rendered page changing afterwards: the care setting moves, the revision increments, the held count
rises, and a replay at the spent revision is refused `stale-revision` while the page stays put. It
also does something no test could: `WebMCP.invokeTool` on `confirm_release` fails with *Tool not
found*, so the absence at the centre of this design is now measured by the browser rather than asserted
by the page.

**What it deliberately does not claim.** The fifth row stays empty. This script chose the tools, wrote
the arguments and knew the revision to quote; a model did none of that. The script's own header says
so, the evidence file carries a `notClaimed` field, and `docs/PROGRESS.md` keeps the row. A green run
here is not a replay, and describing it as one would be the single easiest way to make everything else
in this package unbelievable.

**Cost.** One more script to keep working, and a second run to remember before a submission. The
alternative — one green number covering five different claims — is what this whole package argues
against.

## D-23 — What can be taken back, and what cannot

**Decision.** There is no undo after a confirmed release, and the page does not pretend otherwise.
Four things are recoverable and one is not, and the four are worth naming because "no undo" on its own
sounds like an unfinished feature:

| what | how it comes back |
| --- | --- |
| a proposal | it is only a proposal until a release is staged; raising the care setting re-decides every answer already marked |
| a staged release | decline it; the request is dropped and nothing has left the page |
| what was decided, and why | every write leaves a receipt, and the audit rail carries the reason, the before-and-after and the causal chain for each held answer |
| a mark | re-enter it by hand in the row, at any time, at any care setting |

What does not come back is a release a person has confirmed. **That is a product decision.** The
argument of this page is that exactly one control sends a mark to a student and a person owns it; a
page that also offered to unsend it would be teaching its user that the confirmation does not
really matter, which is the habit the design exists to prevent. An undo would also be a lie about the
world it models: once marks are with students, the page cannot reach them.

**What that costs, said plainly.** A confirmed mistake has to be fixed the way it would be fixed
without this page — by a person, out of band, with the receipt as the record of what was sent. If
this were a product with a real delivery step, the right shape is probably a delay before delivery
rather than an undo after it, because a delay keeps the confirmation meaningful and still leaves room
for a second thought. That is a design for a system that has somewhere to deliver to; this one does
not, and inventing it to satisfy a generic "is it reversible?" checklist would add an unverifiable
claim to a package whose whole argument is that claims are separated by how well they are backed.

**Why this is written down at all.** "Recoverable" is the kind of word that widens on its own between
one document and the next. The table above is the whole of what this page can take back, and anything
in the repository that says more than it is wrong.

## D-24 — The judge's entry point is a band on the same page, not a second route

**2026-09-01.** The page opened straight into three dense columns, and the first thing a reader met
was a marking dashboard. Read that way it looks like a grading tool with a chat feature bolted on,
which is the opposite of the claim: the point is what the agent is *not* given, and an absence is
invisible on arrival. `src/ui/Intro.tsx` is a band between the top bar and `.app__cols` that states the
claim in one sentence — *the page owns the decision* — and prints the whole stack in four figures, and then
leaves the columns underneath to be checked against it.

**Why not a landing page.** A second route was the obvious alternative and it was rejected for
reasons specific to this submission, not out of taste:

- **The form takes one live URL.** A judge who lands on a marketing page has to click again to reach
  the thing being judged, and every extra click is a place to lose them. The workspace *is* the
  argument, so the argument has to be on it.
- **A hub already exists and is not mine.** The repository's deploy workflow copies
  `.github/pages-index.html` to `site/index.html` and this package to `site/withheld/`. A second
  landing page inside the package would be a third page nobody asked for, in a file owned by other
  work.
- **Two documents drift.** A separate page repeats the counts, the tool names and the claim, and the
  copy on it is not reachable by any test. Every figure in the band is derived from the session the
  page runs on: the answers it was given, the marks that exist, the holds `holdsFor()` computes, and
  the size of the staged request. None of the four can be typed, so a change in the fixture or in the
  policy moves the band, and `render.test.mts` reads all four.
- **A tour that lies is worse than no tour.** The worked example the queue applies goes through the
  same write path a teacher's ticks take, and the sentence under the rows says it is a
  fixture and that no model has ever driven these tools. Nothing on the band is a recording.

**What it must not become.** It holds no control at all — no button and no anchor. The one
control that sends a mark is at the foot of the page; a second control up here that looked like it
released anything would undo the argument the band exists to make, which is why the render test counts
the buttons and the browser session counts them again on the built page.

**Cost.** 74px above the fold at 1440px, four figures on one row, so the stack starts barely lower
than it did — measured, not
guessed, and asserted as a ceiling by `pnpm browser`. The band carries no heading of its own: it is a
labelled region, and the page's one `h1`
stays on the work in `Stack`, because an introduction that took it would be a claim about which of
the two matters.

## D-25 — Contrast and the accessibility tree are instruments, not a review

**2026-09-01.** `docs/PROGRESS.md` said for weeks that contrast on this page was unexamined and that
nothing had been judged by eye or by ear. The first half of that sentence was the kind that stays true
for ever, because nothing was ever going to measure it by looking. Two instruments now do, and the
decision is where each one is pointed.

**Arithmetic guards the palette; the browser guards the page.** `tests/contrast.test.mts` takes the
tokens the sheet declares and computes WCAG 2.1 relative luminance over every pair the sheet actually
pairs: each of the four inks on each of the three grounds, the two reverse inks on the two dark grounds of
the agent's column, the control that cannot be pressed and must still say why, the filled controls' own
labels, the shapes that carry information at 3:1, and the focus ring against everything it can land on.
Two further tests guard the claim rather than a pair — that no token is more than ten steps off grey and no
rule outside `:root` names a colour at all, and that every token in `:root` parses, since a palette
rewritten in `rgb()` would leave every sweep above silently measuring a smaller one.

What arithmetic cannot know is composition — which pair meets which pixel after the cascade has run —
so the browser session walks every rendered text node instead, reads the background it resolves to, and
picks the threshold from the computed size and weight. 423 pairs, none failing, the thinnest at 4.8:1 on
the note in the contract column. The two instruments are complements and neither replaces the other: a
palette can be sound and still be composed into an unreadable page, and a page can measure clean today
and regress the moment a token moves.

**It found a real defect, which is the argument for it.** Ten pairs at 1.43:1 on the first run — a
rubric-line mark drawn in a tone that had only ever been used against white and was now sitting on the
row's own grey. Nothing in the suite could have caught it, and reading the sheet had not.

**The accessibility tree is read, and that is not listening.** `Accessibility.getFullAXTree` answers
questions no render can: 1001 nodes, 32 named regions and controls, none unnamed, and the landmarks
the page means to expose — one `banner`, one `main`, three `complementary`, one live `status`. Two
things it does not answer. It does not report reading order, so the heading outline is read from
`document.querySelectorAll` and checked for a skipped level separately. And it says nothing about what
a screen reader announces, or whether the announcement makes sense; **no assistive technology has been
run against this page**, and `docs/PREFLIGHT.md` still carries that as outstanding.

**No `contentinfo`, on purpose.** The page's foot is a note about the work rather than a footer for the
document, and it sits inside `main`, where HTML-AAM does not expose it as a landmark. The check asserts
the absence rather than tolerating it, so a later `<footer>` moved out to the body would fail here and
have to be argued for.

## D-26 — The stylesheet is swept in both directions

**2026-09-01.** The suite asked one question about the sheet: does every class the page renders have a
rule behind it? That direction is the one that breaks the page — under `style-src 'self'` a missing rule
draws a bar of zero width, which reads as a student who scored nothing. The other direction cannot break
anything, which is exactly why it went unchecked: a rule for a state the page can no longer reach is a
claim about the page that quietly stops being true.

**It is a test now, and it found fourteen.** Twelve were not dead CSS at all but live states nothing
rendered — an answer already sent to a student, a care row locked below a raised setting, a browser with
no WebMCP in it, an action bar with the stack scrolled out from under it. The fix was six more renders
rather than six deletions, which is the outcome that says the check was worth writing: the sheet was
describing more of the page than the tests were exercising.

**Two are excused in writing, and one of the excuses is itself a test.** The quantised bar stops are
proved reachable by `styles.test.mts`, which walks every total against six rubric ceilings, so
re-proving them here would be duplicate work. `delta--on` is the state of an answer landing exactly on
the pass mark, and this rubric's four point values cannot sum to it — so the excuse builds all sixteen
subset totals and asserts the boundary is not among them. Change one point value and the excuse becomes
a failure again, which is the only kind of excuse worth leaving in a test file.

**Cost, and the reason it is acceptable.** Six extra renders on every run, and a rule for a genuinely
new state now fails the suite until something renders it. That is the intended pressure: it makes the
sheet and the page argue with each other automatically instead of at whatever point someone reads both.

## D-27 — The page was rebuilt to a monochrome mockup, and departs from it in eleven places

**2026-09-01.** A third monochrome visual target arrived at 1487×1058 and grey end to end. The page
was rebuilt to it, and this entry is the list of what did not come across,
because a redesign that records only its successes is a redesign nobody can check.

**What the mockup settled.** The greyscale is now the whole palette, not a restraint on top of one —
sixteen tokens, every one of them within ten steps of grey, asserted per token in
`tests/contrast.test.mts` along with the absence of any hex, `rgb()` or `color-mix()` outside `:root`.
Nothing on this page is said in hue, so nothing on it is said only to readers who can separate hues. The
column widths are the mockup's: 322px of policy, 357px of contract, the rest to the work, measured in
`docs/evidence/browser-session.json` and not asserted here.

**And it settled the case system — though not in the form the rule was first written down.** The mockup
letters the page's own small print, and the page now does the same: the wordmark, the strap beside it, both
top-bar anchors, every section head, the label above each block, the tag on a held entry, the badge on the
focused answer, and the face of every button — `SAVE THIS MARK`, `MARK ALL FROM THE WORKED EXAMPLE`, `VIEW
FULL EXPLANATION`, `STAGE RELEASE`, `CONFIRM RELEASE — HUMAN ONLY`, `HOW TO CONNECT ONE`. All of it is
letterspaced, and apart from the 19px wordmark none of it is set larger than thirteen pixels. The rule was
first written down as *capitals are for things a person can press*, and that is not what the sheet does:
`WITHHELD` is a `<span>` and so is `POLICY`, while the three care levels, the rubric lines
a teacher ticks, the alias on each held entry and `.pager` are every one of them pressable and every one of
them sentence case. Case marks scale here, not authority — a control is told from a label by its box.

**The half of the rule that holds is the half worth having: no status word wears a control's case.** Every
state word in a queue row is lower case, and `src/styles.css:1013-1026` says why — a status word must not
dress up as a control. So are `read` and `write` beside a tool, `revision 00`, the four counters
in the band, and `no longer available` under a locked column in the comparison. One heading opts back in
halfway: `HUMAN AUTHORITY` is lettered as a standing label while the part that changes, `— a release is
waiting`, drops to a sentence, because a caps-lock alarm would contradict the page's own claim that a held
mark is not an emergency. And one badge breaks the rule outright — the state on the focused answer is
lettered although every row says that same word in lower case — an exception the sheet notes beside
`.line__state` and does not defend. The row is where a reader scans, and the row keeps the rule.

**Comparing the two needs a frame that exists.** `docs/evidence/browser-fold-1487.png` is the first screen
at the mockup's own dimensions, clipped to the viewport — `captureBeyondViewport: false`, unlike the three
full-page shots beside it, because a full-page capture of a page with a sticky foot paints that foot across
the middle of the document and anyone laying the two images side by side would be comparing an artefact.

**Eleven departures. None is a shortcut; each is a thing the mockup could draw and the page cannot say.**

*The figures are the fixture's, not the drawing's.* The mockup shows Maya at 58 of 88 against a pass mark
of 54, one answer held on arrival, and no answer marked. Those numbers are consistent with nothing: the
page's own arithmetic runs on its own rubric, so the frame shows Theo at 52 of 88 against 50, and it is
captured after the worked example rather than on arrival, because on arrival there is no mark to compare
and a card reading `—` compares nothing.

*The third care setting is "Most cautious", not "Boundary".* The control raises how much caution the page
applies. "Boundary" names a *reason* an answer is held — it is already the wording on a held row — and
using it for a level would put one word on two jobs.

*The card shows what the page decided, not what an agent said.* The mockup fills half the card with
`AGENT EXPLANATION` and `AGENT RATIONALE`. Before an agent speaks there is no such prose, and printing
its absence as an empty heading would be a page advertising a dependency it does not have. That half
carries the lines the page did not credit and the chain it followed instead — both of which are true of
every answer, agent or no agent.

*"Connect agent" is an anchor.* It is drawn as the mockup's outlined button, in capitals like every other
action, and it goes to the section that explains how. A button by that name would claim the page can
install an agent into a browser, which it cannot.

*Nothing on the page carries a clock.* The mockup's timeline reads `20 min ago`. Revisions are numbered
here and never timed, because a receipt that says when is a receipt someone will read as an audit trail,
and a page that cannot be trusted to keep one should not draw one.

*Nine tool rows, not seven.* The names come from `toolSurfaceFacts()` — the same surface the page
registers, so the list cannot drift from what an agent is actually offered. The human-only release
boundary is stated below the list, while the browser negative probe verifies that no release tool is
registered.

*The rail carries a fourth block.* The mockup's policy column ends at the audit ledger; the page follows
it with "How a mark gets made", which is the only place the page walks a reader through the sequence it
runs. Dropping it to match a drawing would cost the explanation.

*The list keeps the answer that is open above it.* The mockup shows 02, 04, 05 while 03 is the card; the
page shows 01, 02, 03 with 03 ringed. The pile is a pile, and losing your place in it to save one row is
the wrong trade.

*Row states stay lower case.* The mockup capitalises `Not marked`. One word list feeds both the row and
the badge on the card, and the badge is capitalised by `.tagline` rather than in the data, so a capital
initial in the row would have to be a second copy of the same four words.

*The card keeps "Mark this answer by hand".* The mockup has no such control. The page's argument is that a
person can always do the whole job without an agent, and a page making that argument has to carry the
control that proves it.

*The student's words keep their left rule.* The mockup sets the answer as plain text. The rule is the only
visual mark that the text below it was written by someone else and is handed to an agent flagged untrusted;
the sentence under it says so in words as well, and both stay.

**What this entry does not claim.** The mockup is a drawing. It says nothing about whether the marking is
fair, whether the problem is real to anyone but the author, whether a hosted copy behaves, or whether an
agent has ever driven this page in words. The browser session establishes the layout; the mockup only ever
said what to aim at.

## D-28 — State changes need their own receipts, and retries need a bounded contract

**2026-09-02.** The audit exposed two places where a state transition could look more complete
than it was: human confirm/decline advanced the revision without entering the timeline, and a
repeated write could consume a revision without changing the state. The session now routes
human confirm and decline through the same receipt constructor as agent writes, with explicit
`human_release_confirmed` and `human_release_declined` actions and the exact resulting revision.

The write contract stays small and deterministic. A proposal that produces the same marks,
fingerprints, quarantine, and instability state is refused as `no-change`; an emphasis already
active and a second pending release request are refused as well. Each write also carries a bounded,
single-use operation ID, so a transport retry cannot apply the same accepted operation twice. The
fixture has no persistence or network retry layer, but the local contract protects the retry boundary
without enlarging the agent
surface before a real client demonstrates that need.

Two boundary rules follow from the same decision. WebMCP schemas are closed and bounded, with
runtime validation repeated before arithmetic, and the manual form captures its opened revision
and blocks stale saves. The text canary checks generated tool prose at runtime but deliberately
skips the raw answer body, because untrusted student text must remain readable. A generic
recovery envelope handles unexpected tool errors without exposing implementation details.

## D-29 — Agent writes carry bounded, session-local operation ids

**2026-09-02.** The later reliability pass revises the retry choice above for the WebMCP boundary.
Every agent write must carry a bounded opaque `operationId`. The session stores it only on the
accepted receipt; reusing it, even with the current revision or through another write tool, returns
`duplicate-operation` without changing state, advancing the revision, or adding a receipt. This is
at-most-once protection for the in-memory fixture, not durable idempotency: a refresh or restart
intentionally clears the session and its receipt history because Withheld has no persistence layer.

The key is not part of the agent-facing receipt payload. It is a caller correlation value, not a
new fact the page needs to disclose, and keeping it out preserves the existing numeric and answer-id
boundaries. Manual page writes omit it because they do not cross a retrying transport boundary.
