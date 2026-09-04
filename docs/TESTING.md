# Testing

136 tests, all passing, without a browser. `pnpm test` runs them through the Node test runner with
`--experimental-strip-types`. Four separate programs cover what only a browser can answer: `pnpm browser`
for layout, policy and focus, `pnpm agent-view` for what the agent's view leaves in the DOM, `pnpm webmcp`
for dispatch through Chromium's own WebMCP domain, and `scripts/failure-recovery.mjs` for the
refusal-and-recovery journey. All four are described at the foot of this file.

```
tests/marks.test.mts            8   arithmetic, fixture invariants and property-style cases
tests/agent-boundary.test.mts  10   the fail-closed guard, including the text-canary boundary
tests/session.test.mts         25   authority: holds, refusals, release, human receipts and idempotency
tests/views.test.mts           12   paired projections, and the policy comparison
tests/webmcp.test.mts          30   the nine tools, registration, schemas, limits, idempotency and recovery
tests/boundary-inference.test.mts  6   GATE-W1: what the agent could derive
tests/styles.test.mts           8   the stylesheet, the policy and the breakpoint that shaped it
tests/contrast.test.mts         7   the palette, by arithmetic, including that it is grey
tests/render.test.mts          30   every part of the page, both views, and the error fallback
```

## What each file is for

**`marks.test.mts`** — the arithmetic is a pure function, so it is tested as one. A rubric line
id that does not exist earns nothing. A line claimed twice is paid once. `redactRubricForAgent`
output carries no point value and no boundary.

**`agent-boundary.test.mts`** — the guard, tested against synthetic payloads. A number at an
unlisted path is caught; a page-owned number spelled into a string is caught by the canary; the
guard throws rather than returning a flag, so there is no way to ignore it by accident.

**`session.test.mts`** — the largest of the domain suites, because authority is where the design
lives. It pins
the exact expected hold list for the worked example, checks monotonicity across all three care
settings, asserts quarantine beats marking, and asserts that no refusal message contains a
digit.

**`views.test.mts`** — that the agent-facing projection of each view is missing what it must be
missing: no total, no boundary, no distance, no pass/fail split, and no near-boundary hold. It
also covers the two projections the page keeps for itself — the release outcome, and the policy
comparison, where raising the care setting may never hold fewer answers than the setting below it
and asking the question may not change the session it was asked about.

**`webmcp.test.mts`** — the surface itself: exactly nine tools in a stable order, the read/write
split, the annotations, Chrome's description and name budgets, argument validation, and
registration behaviour including StrictMode, teardown, re-install and partial failure. The contract
also requires bounded, single-use operation ids for writes and refuses a duplicate without changing
the session. Four of the thirty are about the panel that shows all this to a reader with no agent:
that `toolSurfaceFacts()`
lists the same nine the registration does, that building the surface reads no session at all, that
each payload the page prints is `deepEqual` to what the matching tool returns, and that those
printed payloads pass the same two boundary checks. A panel that drifted from the tools would be a
drawing of the boundary rather than the boundary, and it would drift silently.

Three more are about the dispatch record the panel's activity list is built from. Every call is
reported exactly once — reads and refusals included, in arrival order, carrying the revision the
session stands at afterwards — a record holds four fields and none of them is copied out of an
argument, and an observer that throws cannot fail the tool call it was watching. The last of those is
the one worth keeping: the list is a display, and a display must not be able to break a boundary.

**`boundary-inference.test.mts`** — the other files ask whether a tool result *contains* a
page-owned number. This one asks whether an agent could *derive* one, or the fact the redactions
exist to hide: which answer sits on the grade cliff. It covers the four channels that carry no
number at all — a receipt naming a set the page chose, two answers on opposite sides of the
boundary, a repeated probe, and an ordering. It exists because it found a real leak: the release
receipt used to hand back every releasable answer id, which is the held set by subtraction.
`docs/GATE-W1.md` is the record, including the two channels these tests do not close.

**`styles.test.mts`** — the stylesheet, treated as a contract rather than as decoration. Under
`style-src 'self'` a proportional bar cannot be sized with `style={{ width }}`, so `gaugeStop()`
quantises the ratio to a 5% grid and the sheet supplies the width. A missing rule is silent and it
lies: the bar renders at zero and reads as a student who scored nothing. The test walks every total
from 0 to 200 against six different rubric ceilings, collects every stop the helper can emit, and
asserts all twenty-one `bars__fill--N` rules exist — then asks the same of the two figures the audit
actually draws, the credited row and the pass-mark row, which ride identical rails so that the pair
can be compared by eye, and neither of which may ask for more rail than there is. Then the class
families no one types by hand (row and avatar and state tones, gap badges, flow steps, agent-status
dots), that the sheet references no remote asset, and that all three hold-wording tables still cover
the same reasons with a three-link chain that ends on a person. One test reads
`vite.config.ts` as text and holds the hosted policy to the shape the rest of the file assumes: all
nine directives present, and no `'unsafe-inline'` anywhere. Blocking an inline width is only a design
constraint while the policy that blocks it stays where it is, and widening it is the cheapest way out
of the constraint. Another holds the breakpoint: `useOneColumn()` exports the media query it
listens to as a string, and the test asserts the sheet switches `.app__cols` to more than one track at
that same width. Two copies of a breakpoint drift silently, and the failure would be a contract column
folded away on a desktop, or a phone with a third column off the side of the screen.

**`contrast.test.mts`** — the palette, settled by arithmetic before any browser is involved. WCAG
2.1's relative luminance, 4.5:1 for body text and 3:1 for shapes that carry meaning: every ink on
every ground the sheet declares, the same sweep in reverse for the agent's column, the label on a
control that cannot be pressed — WCAG exempts it and this page declines the exemption — the two
filled buttons that commit something, the audit's two bars against their rail, and the focus ring
against every surface the keyboard can reach. Two of the seven are about the palette rather than any
pair in it: that no token is more than ten steps off grey, so nothing on this page is said in a
channel some readers cannot receive, and that no rule outside `:root` names a colour of its own,
which is what makes the other five sweeps exhaustive rather than illustrative. What arithmetic cannot
settle is composition — which pair actually meets which pixel after the cascade — so the browser
session measures that separately. This file guards the palette; the probe guards the page.

**`render.test.mts`** — every component, rendered to static markup, thirty-three renders in all. It
exists because these renders used to be a script run by hand and deleted afterwards, which made the
strongest claims in `docs/PROGRESS.md` rest on the weakest evidence: true on the day, unenforced
after it. Vite is the loader, because Node's type stripping erases types and cannot transform JSX;
the server runs in middleware mode and never listens on a port. Every count it asserts is derived
from the fixtures and the domain rather than typed in — fourteen rows and "14 of 14" in the head
because the queue lists the whole class, fourteen radio tabs checked out of fifty-six because each row
arrives showing its answer panel, fifty-six checkboxes because every row carries a by-hand form over
the rubric's four lines, five audit entries because `holdsFor` returns five — so changing a fixture
moves the expectation with the page. It also sweeps the stylesheet in both directions: every class the
page asks for must have a rule, and every rule the sheet defines must be reached by one of the
thirty-three renders. The reverse direction is the reason the renders of states nobody looks at exist,
and it is what forced six more when the view toggle arrived, then one more for the activity list: a rule
only the agent's view uses is an orphan until something renders that view, and so is a row that only
exists once a call has arrived.

Two renders are read for provenance rather than for shape. The same marks are applied twice — once
the way the form applies them, once the way the tool port does — and the only difference between the
two sessions is the operation key, so the "by a tool call" and "by hand" tags on the timeline are
asserted against sessions that differ in nothing else. The tags are read out of the `tl__who` span
and not searched for in the document, because "by hand" is also panel prose, where it means the page
works without an agent.

## The tests worth reading first

**The boundary sweep.** Twelve tool calls in sequence — read, mark the stack, then read again so
the later results are computed from real marks and real holds — asserting after every one that
neither `forbiddenNumericPaths` nor `forbiddenNumbersInText` fires anywhere on the surface.
The runtime `reply()` path also runs this canary with the current page-owned point values and
pass boundary; the raw `read_answer.answer.body` path is explicitly excluded because student
text is untrusted content. Adding a numeric field to any tool result fails here rather than
shipping.

**The release receipt.** No answer id from the stack may appear anywhere in a `request_release`
result. The agent named nothing in that call, so any id in the reply is a set the page chose, and
the set it would choose is the releasable one — which is the held set inverted. This is the test
that caught the one leak the numeric guard could not see, because an id is not a number.

**The source-text test.** It reads `src/tools/webmcp.ts` as a string and asserts the file never
contains `confirmRelease`, and that no tool name matches `confirm|release_now|send_to_student`.
An assertion about a file's text is a blunt instrument, and it is the right one: the claim being
defended is about absence, and absence cannot be tested by calling something.

**The release attempt.** Mark the whole stack, then request a release four times over, each at the
current revision. `releasedAnswerIds` is still empty and one request is on the page: a second request
is refused because one is already staged, and the human confirm/decline transitions are covered by
separate domain and browser checks.

**The boundary failures.** Extra object keys, duplicate findings, oversized finding arrays,
duplicate line ids, generated numeric prose, and an unexpected port failure all return a bounded
refusal or recovery envelope without changing the session.

**The redaction canary.** The same idea as the boundary sweep, pointed at the rendered page instead of
the tool results. It derives the figures the page owns from the fixture — the four rubric point values,
the pass mark, the maximum, and every total the worked example lands, thirteen of them — and requires
that none appears in any of the four agent-view renders. Two things make it a test rather than a
formality. Its control asserts that the teacher's marked render *does* leak more than four of them, so a
pass cannot come from a pattern that never matches anything. And its floor is honest rather than
whitelisted: figures at or below the class size are dropped, because a `4` is the band and also the
number of rubric lines, and the doc comment says so instead of the test pretending to a precision it
does not have. Icon path geometry is stripped and the students' own words are exempt, since
`read_answer` hands the body over verbatim.

**The hold the page will not name.** Three of the five holds sit near the pass boundary, and the agent
is told how many it cannot see and never which. The test renders the queue and the audit rail through the
agent's lens and asserts all three halves of that: no cell is marked as a near-boundary hold, the entry
count equals what `agentVisibleHolds` returns rather than what `holdsFor` does, and the heading still
prints five waiting and two named. A fourth render — holds filtered to near-boundary only — asserts the
empty case renders as a sentence rather than as an empty list, because "nothing your agent can name" and
"nothing is held" must not look the same.

## What these tests cannot tell you

This section matters more than the one above it.

**They do not prove an agent behaves.** The tests call `tool.execute(args)` directly. That
establishes the *shape* of the surface — what it accepts, what it returns, what it refuses. It
says nothing about what a real browser agent does when it reads an injected answer, because no
agent has ever driven these tools. Every claim in this repository about agent behaviour is a
claim about the surface, not a recording.

**They render, and not in a browser.** Those are two claims and the second one is the limit.
`render.test.mts` builds thirty-three renders on every run: the top bar (no button at all, two
anchors — the audit and the gate — and the revision read off the session), the band in five states
(four figures, each the session's own: answers, marked, held, staged; two view buttons and no third
thing to press, one strip anchor per answer, no `h1`, and the live region already in the markup before
it has text; then the same band with the worked example applied, the figures moved and the region
saying how many are held back for you; then a release sent, and the band in the agent's view both with
and without a hold it can name), the left rail in three states (four flow steps with exactly one marked
current, four steps naming the act they are, three care rows and none disabled at the standard
setting), the queue in seven states (the whole class as fourteen rows, each anchored so the strip has
somewhere to point, and a head count of "14 of 14" that agrees with the rows below it; four tab panels
behind every row with exactly one open; a mark form in every row, all four rubric lines tickable on
each; a tag on each row saying whether a tool or a person named its lines, and nothing to attribute in
an unwritten session; and no proportional bar anywhere, because the audit owns the only bar on the
page), the contract column in six states (nine registered tool rows, six reads and three writes counted
from the registrations, five "never crosses" rows, one disclosure per projection each holding a `<pre>`
of pretty-printed JSON, the held-versus-named line when there is a gap — with nothing
marked, no such line and the empty state explaining that `explain_mark` has nothing to project yet;
with an agent connected, the live line that says what the surface cannot do; with no WebMCP in the
browser at all; with calls already arrived, where the connection line is a count rather than a claim
and the activity list holds a read, an accepted write and two refusals the session itself does not
remember, under a note saying six calls arrived and four are listed; and folded into a `<details>`
panel for one column, where the same heading becomes the summary),
the policy comparison three times (three columns, exactly one badged as selected, five measure rows),
the audit rail in three states (five entries for five holds, one open, five causal chains, a credited
rail and a pass-mark rail for each of the four held answers that have a mark, sixteen rubric-line cells
of which ten are dashes and none is a zero, and the two agent-view states described below), the action
bar in four states — idle, staged, staged by a tool
call, and with the stack scrolled out from under it (one disabled control when idle and none once a
release is staged, the sentence saying no tool can press it either way, and "Staged by a tool call."
only in the state a tool asked) — and `App` whole: one column grid, one of each region, three slabs
below the fold, one band above the columns and the page's only `h1` still in the queue. None throws,
none emits a single inline `style` attribute, and every class name the thirty-three renders ask for has
a rule in the sheet. Every number they display comes from a domain function that is tested.

The sweep runs the other way too. Every class the sheet defines must be reached by some render, so a
rule for a state the page can no longer reach fails the suite instead of sitting in the file looking
like a feature. Most of what the first run found was not dead but unrendered — a sent answer, a locked
care row, a browser with no WebMCP, a scrolled-away action bar — and those states are rendered now.
Five names are excused in writing today: the quantised bar stops, proved reachable by
`styles.test.mts` instead; `notice`, `App`'s transient message, which is set by a handler and gone by
the next action, so no static render holds it; `error-state`, the recovery screen `ErrorBoundary` shows
only after a render has already failed; `tick__conflict`, the by-hand form's live revision-conflict
state, which needs a write from outside the form; and `delta--on`, an answer landing exactly on the pass
mark, which this rubric's four point values cannot sum to. That last excuse is
itself a test: it builds all sixteen subset totals and asserts the boundary is not among them, so
changing a single point value turns the excuse back into a failure.

What that still cannot cover: layout, keyboard order, focus behaviour, responsive width, and what a
screen reader says. Contrast is half-covered — `contrast.test.mts` settles the palette by arithmetic,
but which pair lands on which pixel needs the cascade. `renderToStaticMarkup` runs no effect either,
so the tool registration in
`useMarkingSession` and the focus move in `App` are outside it, and so is `useOneColumn()`, which asks
the browser its width and therefore returns the wide shape here by construction. Everything, in other
words, that
only a browser can answer — which is what `pnpm browser` is for, and it is a separate program from
this suite, described at the foot of this file.

**They do not prove the CSP is enforced.** They cannot; that needs a browser. What is verified here
is that the policy still has the shape the code depends on (a test), that the tag is present in
`dist/index.html` before any script tag (checked by hand on each build), and that the build contains
nothing the policy would block (a test, from the other end: no render emits an inline style).
Enforcement itself is now observed, but by the browser session rather than by any test below.

**The tests are not typechecked.** `tsc -b` covers `src` (through `tsconfig.app.json`) and
`vite.config.ts` (through `tsconfig.node.json`), and `tests/*.mts` is in neither, so the suite runs
under `--experimental-strip-types` without ever being typechecked. `@types/node` is not installed
either, so an editor will show type errors in `tests/render.test.mts` — a `node:test` import error
among them — that `pnpm typecheck` does not. That is the reason for the discrepancy rather than a
problem in the tests. `--experimental-strip-types` also forbids enums, namespaces and parameter
properties, which is why none appear in `src/`.

The render loader creates a temporary writable Vite cache for each run and disables its websocket
server. This keeps a read-only or port-restricted workspace from turning a middleware-only render
test into an unrelated cache/listener failure; it does not skip or alter any render assertion.

## Running them

```sh
pnpm test           # all 136
pnpm typecheck      # tsc -b, exit 0 expected
pnpm build          # typecheck then production bundle
pnpm browser        # after a build: the 43 browser checks
pnpm agent-view     # after a build: the 17 two-view checks
pnpm webmcp         # after a build: the 19 native invocation checks
node --experimental-strip-types scripts/failure-recovery.mjs  # local 27-check recovery journey
```

**Which Node this has actually run on: 26.4.0, and only that.** Every figure in this file was
produced there. `package.json` asks for `>=22.6.0`, and that floor is reasoning rather than a
measurement: 22.6 is the release where `--experimental-strip-types` appeared, and the suite cannot
start without it. Node 22 is not installed on the machine this was built on, so nobody has watched
the suite pass on the version the engines field names — and CI, which is pinned to Node 22, has
never run either. If the floor matters to you, run it there before believing it.

## The browser checks

`pnpm test` and `pnpm browser` are two different instruments and the split is deliberate. The suite
above is pure and fast and runs anywhere; the browser session needs a build, a server and a Chromium
binary, so it is not wired into `pnpm test` and a machine without a browser is not a failing machine.

`scripts/browser-session.mjs` serves `dist/` with `vite preview`, launches a headless Chromium with a
throwaway profile, and drives it over the DevTools Protocol using Node's global `WebSocket` — no
driver dependency, because adding one would rewrite a workspace lockfile that belongs to other work.
It runs 43 checks and exits non-zero if any fails. Last run 2026-09-03 at 12:54:15 UTC,
Chrome/151.0.7922.137: **43 passed, 0 failed**, recorded in `docs/evidence/browser-session.json` with
four screenshots.
The evidence also records the base Git SHA, dirty-tree state, source and build SHA-256 values,
browser flags, and screenshot hashes.

**The script and the page agree again.** An earlier revision of this file reported 37 of 44 green and
named seven checks that had outgrown the page: two encoded the band before the view toggle and the
queue before the pager was removed, one measured paragraph widths without asking whether a paragraph
was visible, and four drove the by-hand form by clicking a checkbox at viewport coordinates that the
row's tab panels had turned into a `0×0` rect at the origin. None of the seven was repaired check by
check: the harness was rewritten against the rebuilt page before this run, which is also how the total
moved from 44 to 43. This run of it is 43 checks, 43 passed, 0 failed. The visibility filter is now
applied before a width is judged (check 11), and the concurrent-write journey is exercised through the
DOM again (checks 18–20 — a stale row draft is blocked, recovers only after a reload, and a successful
save does not conflict with its own form). Whether any assertion was weakened to
reach 43 is a question the diff answers and this file does not: read `scripts/browser-session.mjs`
against `git show HEAD:scripts/browser-session.mjs`, and read the 43 check names out of the artifact.

The checks worth naming, because each one answers something no test above can:

- **the CSP is enforced** — an inline `<script>` injected into the live page did not run, an
  injected `style` attribute did not apply, and the browser logged exactly those two violations
  while the page raised none;
- **the three columns exist and are the widths the target draws** — 322px of policy, 761px of work,
  357px of contract at 1440px, and one track at 420px;
- **the status band stays a band** — above the columns rather than inside one, 74px tall at 1440px with
  its four figures on a single row, and its only controls the two view buttons, which choose whose view
  is drawn and touch no mark. A static render has no widths, so nothing else
  could tell a band from four stacked boxes. Its figures are read out of the rendered page too, and
  twice: `14/0/0/0` on arrival and `14/13/5/0` after the worked example, because a counter is only worth
  printing if it survives to the screen and then moves;
- **no bar renders at zero width by accident** — a blocked inline width would have collapsed every
  proportional bar, which reads as a student who scored nothing, so the check reads the quantised
  stop out of each class name and requires width only where the stop is above zero. Eight fills are
  measured, in four distinct widths, across eight rails;
- **focus lands on the bar's heading** and not on its send button when a release is staged — an
  effect, and therefore outside `renderToStaticMarkup` entirely;
- **the human release path is exercised in the DOM** — decline clears a staged request and writes
  its timeline event, the request can be staged again, and confirm clears it, records the final
  receipt, and leaves the last timeline revision equal to the session revision;
- **a concurrent manual draft is blocked** — a second form write produces a visible conflict,
  disables its stale save, and can be recovered by reloading the current mark;
- **no paragraph is crushed into a narrow column** — narrowest 200px of 21 measured. This check exists
  because the first run found four paragraphs auto-placing into a 26px grid track, and it measures
  *visible* text only: a screen-reader-only span inside a figure once pushed a 60px number past the
  filter and reported it as crushed prose. The measured count fell from 26 to 21 when two reference
  blocks in the agent column moved inside closed disclosures — a closed `<details>` hides its prose, so
  there is less visible prose to measure, not less prose;
- **every text pair on the page clears its contrast threshold** — 599 pairs walked, each text node
  measured against the background it actually resolves to after the cascade, with the threshold picked
  from the computed size and weight. 455 more were skipped as invisible and five as sitting on an
  image. The thinnest three sit at 4.8:1 against a 4.5 requirement — `p.ifnobody__note`,
  `span.ledger__label` and `span.ledger__scope` — and nothing fails. This
  check found ten real failures on its first run, all at 1.43:1: a rubric-line mark drawn in a tone
  that had only ever been used against white. `contrast.test.mts` now guards the palette by
  arithmetic, so the sheet and its own account of itself cannot drift;
- **what the accessibility tree hands over** — 1106 nodes, 57 named regions and controls, **none
  unnamed**, 14 headings in document order at levels 1/2/3 with no level skipped, and the landmarks the
  page means to expose: one `banner`, one `main`, three `complementary`, one live `status`. There is
  deliberately no `contentinfo`: the foot is a note about the work, sits inside `main`, and HTML-AAM does
  not expose it as a landmark. Reading order comes from `document.querySelectorAll` rather than from the
  tree, because `Accessibility.getFullAXTree` does not report it;
- **the contract column folds on a phone and not on a desktop** — the check counts folding shells
  (`details.fold`) and finds **0** in the contract at 1440px, where the column is a plain region;
  at 420px a panel that arrives closed with **0 of its 9 registered tool rows visible**, 110px tall on
  a 110px summary,
  then opens with all nine visible and the column at 2053px when the summary is pressed, and closes
  again when pressed a second
  time. A closed `<details>` skips paint but keeps layout, so every row still reports a box: the check
  asks `checkVisibility()` and keeps both figures in the evidence to record why;
- layout and overflow at 1440px and 420px, tab order, no off-site request, a clean console, and
  whether `document.modelContext` exists on this build.

**The screenshots, and the one that is not full-page.** Three are requested beyond the viewport and one
is not. `browser-420-staged.png` is the one that still returns a tall image — 420×4883 — and it carries
the audit and the comparison below the fold. The two 1440px captures come back 1440×900 even though they
ask for the whole document, because at 1248px and wider the document *is* one viewport: the page is an
app shell and its three columns scroll inside themselves. That is a deliberate trade, recorded in
`docs/DECISIONS.md`: the human-release gate is in the first frame for every judge, and the price is that
a wide capture no longer shows the columns' lower reaches. `browser-fold-1487.png` is the one clipped by
request: the first screen at the mockup's own 1487×1058, so it can be laid beside
`docs/target-images/withheld-v3-monochrome-refined.png` without either image being scaled. A full-page
capture of a page with a sticky foot paints that foot across the middle of the document, and comparing
that against a mockup would be comparing an artefact. `docs/DECISIONS.md` D-27 lists what the pair still
differs on.

**It reads the WebMCP registry; it is not an agent.** A green run says nine tools are registered
natively. It says nothing about a model choosing one and calling it, and no such thing has happened
in this repository.

**It reads the accessibility tree; it is not a screen reader.** A green run says every named thing has
a name and the headings descend in order. It says nothing about what NVDA or VoiceOver actually
announces, or whether the announcement makes sense, and no assistive technology has been run against
this page. The same distinction applies to the phone layout: 420px in a headless Chromium is a width,
not a hand.

## The two-view sweep

`pnpm agent-view` (`scripts/agent-view.mjs`) exists because an absence is the one claim a render cannot
close on its own. The canary above proves the components never build a page-owned figure; this proves the
stylesheet did not put one back. Same build, same worked example, driven through the two view buttons the
way a person would press them, then read three ways: `innerText` for what is legible, the live
`outerHTML` with `<svg>` stripped for what is present, and `getClientRects()` for what is drawn.

The last run, 2026-09-03, Chromium 151, 17 checks and 0 failures:

| | teacher's view | agent's view |
| --- | --- | --- |
| the thirteen figures, in `innerText` | 12 | 0 |
| the thirteen figures, anywhere in the DOM | 13 | 0 |
| elements whose own text is one of them | 143 | 0 |
| holds named | 5 | 2 |
| bars drawn | 8 | 0 |
| overflow at 1440px and at 420px | 0px | 0px |

The teacher's column is the control and the run fails without it. Twelve of thirteen legible rather than
thirteen is the expected shape: one point value exists only inside a row nobody has opened, and
`innerText` does not reach into a closed `<details>`. The run also presses back to the teacher's view and
requires all 143 to return, because a toggle that destroyed state would pass a one-way check.

This is the measurement that settled the design argument. The mockup at `docs/design/proposal-v3.html`
redacts with `color: transparent` and an em dash from `::after`; swept the same way, all twenty-seven of
its boxes render and its own `innerText` reads back the band, the pass mark, all four point values and
the five totals it draws. `docs/DECISIONS.md` D-33 records why the built page projects instead.

**It is not an agent, and it is not a screen reader.** It says the figures are absent from the document.
It says nothing about whether a model would ask for them, or what an assistive technology announces about
a dashed box.

## The invocation run

`node --run webmcp` (`scripts/webmcp-invoke.mjs`) is the third layer, below the tests and beside the
session: **19 checks**, all green on 2026-09-03 against Chrome/151, recorded in
`docs/evidence/webmcp-invocation.json`.

The tests call `tool.execute` directly, which is a function call. This script does not: it uses
Chromium's `WebMCP` DevTools domain, so the browser dispatches each tool by name into the frame that
registered it and hands back what the handler returned. Everything the unit tests assert about the
boundary is re-asserted there, on the path a real caller would take, and two things are checked that no
test can reach — that the **rendered page** moves when a write lands (care setting, revision, held
count), and that `confirm_release` cannot be dispatched at all, because the browser answers *Tool not
found*.

The prompt-injection check is deliberately ordered: it runs against an unmarked stack, before the
worked example is clicked, so the quarantine is the page's answer to a hostile tool call rather than
something a fixture had already decided. A check that passes for the wrong reason is worse than no
check.

**It is still not a model.** The script picked the tools, wrote the arguments and knew the revision to
quote. `docs/PROGRESS.md` keeps the five classes of evidence apart, and the two empty rows — a model,
and a hosted URL — stay empty.

## The multi-agent workflow simulation

`docs/evidence/harness/multi-agent-simulation.mjs` assigns bounded responsibilities to recognition,
safety, adversarial recovery, release staging, audit and a page-owned human gate. It calls the real
Withheld tool registrations over one shared in-memory session and writes
`docs/evidence/multi-agent-simulation.json`.

The current run passes **20/20 checks**: redaction, injection quarantine, stale and duplicate
refusals, malformed input, stage-only release, human decline, re-stage, human confirmation, receipt
continuity and post-release refusal. It is a deterministic `SIMULATED_RUN`, not natural-language
model evidence, native-host discovery, user validation or impact measurement.

## The local failure/recovery journey

`scripts/failure-recovery.mjs` is a third browser instrument. It uses the same native WebMCP CDP
path as the invocation harness, then uses the page DOM for the human-only decline, reload, re-stage,
and confirm actions. Its report is `docs/evidence/failure-recovery.json`.

The latest production-build run completed **27/27 checks**. It covers clean load, rubric and answer
reads, wrong phase, extra keys, unknown answer and rubric ids, duplicate findings, oversized input,
valid proposal, stale revision, duplicate operation, reread/retry, staged release, duplicate stage,
human decline, reload, fresh restage, human confirm, receipt/timeline continuity, and final reread.
The trace stores only synthetic ids, revisions, counts, and redacted result summaries; it does not
store answer bodies, point values, pass boundaries, credentials, or personal data.

This is deterministic local CDP evidence, not a natural-language model replay, hosted evidence, or
persistence test. Reload intentionally demonstrates the documented fixture-only fallback to a new
in-memory session.
