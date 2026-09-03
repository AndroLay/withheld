# Progress ledger

**As of 2026-09-04 (WITA).** `OWNER-REPORTED`: the submission deadline was extended by twelve
hours. Working deadline: **2026-09-04 16:00 WITA** (`2026-09-04 08:00 UTC`, `2026-09-04 01:00
Pacific`). Confirm the extension in the live Devpost countdown or notice before submitting.

This file separates three things that are easy to blur: what has been verified, what has been
built but not verified, and what is waiting on a decision that is not mine to make. Anything in
the second list must not be described as working.

## Verified locally

Each of these was checked by running it. The unit, typecheck and build rows were re-run on 2026-09-03;
the browser and CDP rows are the 12:54–12:56 UTC run of that day, all against one production build.
That build is what the live URL serves: `gh-pages` `15baf8f0` was pushed at 18:02:45 UTC and the three
served files hashed byte-identical to `dist/` at 18:03 UTC.
Every run was on Node 26.4.0; see `docs/TESTING.md`, and the Node floor under "Built, not verified".

- `pnpm test` — 136 tests, 136 pass, 0 fail across 9 files. Re-read this figure from the runner rather
  than from here; it moves whenever a test file does.
- `pnpm typecheck` — exit 0, no output.
- **`GATE-W1` was run and is recorded in `docs/GATE-W1.md`.** It found one real leak — the
  release receipt handed back every releasable answer id, which is the held set by subtraction —
  and that is fixed, with a regression test that fails if any stack id reappears in a
  `request_release` result. Two inference channels are named in the record rather than closed.
  The gate was driven by tests and by reading the source; no agent was involved.
- `pnpm build` — clean, 50 modules transformed. JS 269.08 kB raw / 83.68 kB gzipped
  (`index-LG0K2zXZ.js`), CSS 31.86 kB raw / 6.34 kB gzipped (`index-DI6vQgfk.css`), `index.html`
  0.99 kB / 0.51 kB gzipped, as Vite printed them on 2026-09-03. A second run of the same command
  reproduced all three file hashes, so the build is deterministic on this machine.
- **`pnpm agent-view` — 17 checks, 17 pass, 0 fail.** Both views, at 1440px and at 420px, swept for the
  thirteen figures this page owns: none in the agent's view's `innerText`, none anywhere in its DOM, and
  0 elements whose own text is one of them against 143 in the teacher's view of the same session, with
  132 redaction slots drawn where those figures were. The
  teacher's column is the control — the run fails if the teacher's view is clean. `docs/DECISIONS.md`
  D-33 records the choice; `docs/RUNBOOK.md` says how to run it.
- The CSP meta tag is present at `dist/index.html:4`, the referrer policy at :5, and the first
  script tag at :14 — the policy precedes the script it governs.
- No inline style or inline script in `dist/`, and no inline `style` prop or
  `dangerouslySetInnerHTML` in any component, so `style-src 'self'` without `'unsafe-inline'` has
  nothing to block.
- **The whole page renders, and that is now a test rather than a script I remembered to run.**
  `tests/render.test.mts` builds thirty-three renders through Vite's SSR module loader on every
  `pnpm test`, and none of them throws. The top bar: two anchors and no button, and the revision read
  off the session rather than typed. The band, in five states: four figures — answers, marked,
  held, staged — every one of them the session's own, the whole class as a strip of fourteen cells each
  anchored at its own row, two buttons and nothing else to press — they choose whose view is drawn and
  touch neither the marks nor the holds — no `h1`, and a live region
  that is in the markup before it has anything to say. The left rail, in three states: the four-step
  flow with exactly one step marked current (`aria-current="step"`, and the words "you are here" rather
  than emphasis alone), the authority matrix as fifteen cells, the three care rows, none disabled at the
  standard
  setting. The queue against a session marked from the worked example: all fourteen answers as fourteen
  rows, the head's "14 of 14" agreeing with the rows under it, four tabs and four panels on every row
  with exactly one of the four arriving checked, a mark form in every row and four rubric checkboxes on
  each, **no proportional bar at all** — the audit owns the only bars on the page — and 13 of the 14
  marked, because `ans-11` is quarantined. The policy comparison: 3 columns, exactly one badged
  "Selected", 5 measure rows. The audit rail: 5 entries for 5 holds, the first one open, 5 causal
  chains, 8 rails for the 4 held answers that have a mark — credited and pass mark, one pair each — and
  16 rubric-line cells of which 10 are em-dashes and none is a `0`.
- **Every count in that test is derived, not typed in.** The head's count is checked against the rows
  the queue rendered, the checkbox count is the rows times the four rubric lines and the tab count is
  the rows times four, 5 audit entries because `holdsFor` returns 5, one projection per entry
  `agentFacingPayloads` returns, and the read/write split is counted off `toolSurfaceFacts()`. A fixture
  change moves the expectation with the page instead of failing for no reason, which is the difference
  between a test and a snapshot.
- **The agent's view is asserted, not asserted about.** Six of those renders draw the page through the
  agent's lens, and two tests read five of them: the first derives the thirteen figures the page owns from the
  fixture and requires four of those renders — band, queue, audit, comparison — to contain none of them,
  with the teacher's marked
  render as a control that must leak more than four; the second requires the three near-boundary holds to
  be absent by name, present in the count, and the "nothing your agent can name" case to render as prose
  rather than as an empty list. The sixth, the band with nothing held at all, is there for the sweeps.
  Figures at or below the class size are excluded and the doc comment says why: a `4` is the band and
  also the rubric-line count.
- **The action bar renders in all four of its states.** Idle: the send slot is present, locked,
  disabled, and carries the lock glyph, and it is the only disabled control in the bar. Staged:
  `bar--waiting`, the heading is focusable, nothing is disabled, and the decline button has appeared.
  Staged by a tool call, the gate says so, and says it in neither of the other two. Staged with the
  stack moved on underneath it, the bar prints the count it was asked for beside the count it would
  send.
- **The state and authority gaps from the audit are implemented.** Human confirm and decline now
  create receipt events with their exact resulting revision and appear in the timeline. Every agent
  write now carries a bounded single-use operation id; replaying an accepted key refuses without a
  second receipt. Repeated emphasis and repeated pending-release writes refuse as no-op/duplicate
  operations. Tool schemas are closed and bounded, runtime validation rejects oversized or duplicate
  findings before the reducer, and unexpected tool failures return a generic recovery envelope.
- **The manual form is revision-aware.** Its checkboxes are controlled, the submit carries its
  opened revision into the ref-backed latest session, a concurrent tool or form write produces an
  explicit conflict with saving disabled, and the teacher can reload the current mark. The browser
  session exercises the conflict, decline, re-stage, and confirm paths.
- **Partial registration has an honest recovery path.** If a browser refuses one registration,
  `AgentPanel` reports an incomplete surface without exposing the browser's raw failure detail and
  offers `Retry registration`; the render suite covers the zero-registered/one-failed case.
- **The text canary is on the production reply path.** Generated tool prose is checked against the
  live page-owned values; only raw `read_answer.answer.body` is exempt because it is explicitly
  untrusted student content. A React error boundary provides a fixed reload fallback without
  copying session data into the error surface.
- **The latest evidence is bound to its inputs.** `docs/evidence/*.json` records the base Git SHA,
  dirty-tree state, source SHA-256, build SHA-256, browser flags, and screenshot hashes. The tree
  was intentionally dirty during this run, so the hashes—not the base SHA alone—identify the
  implementation under test. All five local run artifacts of 2026-09-03 12:54–12:56 UTC carry one pair:
  source `10fb7f7cb08384fca77f800922398054c778523ccf7b830ebc665a5b34725012` and build
  `84eee0992732e7190659f7a1de5970fe784adabcb098858ef04ead0a9d120d02`, over base SHA
  `df9608c46c09e979d1b1dd55039ec7fc52402f24`. The two hosted artifacts carry the pair that was published
  that morning — source `09974722…`, build `3700f7c5…` — and were not re-run after the 18:02 republish,
  which put build `84eee099…` on the live URL. The source hash has since moved to `b924a27a…`, because
  `scripts/` gained the MCP bridge, the five host configs and the two harnesses while nothing under
  `src/` changed. Recompute the current pair with
  `scripts/evidence-meta.mjs`; the per-artifact values are the authoritative ones.
- **A continuous local failure/recovery journey is now stored.**
  `docs/evidence/failure-recovery.json` records 27/27 checks from clean load through malformed,
  unknown, oversized, stale, duplicate, reread/retry, stage, decline, reload, re-stage, human
  confirm, receipt, and final reread. It is a deterministic CDP run, not a model, hosted, or
  persistent-session result.
- **The contract column renders in six states, and `App` renders whole.** With the worked example
  applied: 9 real tool rows, a read/write count taken from the registrations rather than typed above
  them, 5 "never crosses" rows, one `<details>` and one `<pre>` of pretty-printed JSON per projection,
  the revision timeline numbered by the receipts' own revisions, and the held-vs-named
  line, which appears only when the page is holding something it will not name. With nothing marked:
  three projections, no held-vs-named line, and the empty state saying `explain_mark` is absent
  because nothing has a mark yet. With calls that have arrived: the activity list, which keeps a
  refusal the session does not, because a refusal changes nothing and is recorded nowhere else. With
  no agent in the browser, and with an agent connected: the two ends of the status line, neither
  needing an agent to be present to be drawn. And folded for one column: the whole column inside a
  closed
  `<details>` whose summary carries the title, with everything the wide shape argues still in it. The
  column contains no `<button>` at all: its foot names the human-only action and links to the gate.
  `App` renders as one tree with one of each region, three slabs below the fold, one current step, one
  `h1` — still the queue's — and the band above the columns.
- **No inline `style` attribute in any of the thirty-three renders**, and every class name they ask for
  has a rule in `src/styles.css`. That pair is what keeps every bar honest under
  `style-src 'self'`: a computed width would be dropped by the browser, so the width comes from a
  class instead. Both halves are assertions in the render test, with a floor under the class count so
  the sweep cannot pass on a page that stopped rendering.
- **The hosted policy is held to its shape by a test.** `tests/styles.test.mts` reads
  `vite.config.ts` as text and fails if any of the nine directives goes missing or if
  `'unsafe-inline'` appears anywhere in it. The cheapest way out of a blocked inline width is to
  widen the policy, and that would work, ship, and retire the reason the quantised classes exist.
- **`img-src` was narrowed from `'self' data:` to `'self'`.** Audited first: no `<img>` in `src/`,
  no `url()` in the stylesheet, no `data:` URL in the source, no favicon link in `index.html`, and
  every glyph inline SVG. The scheme was permission the page never exercised. Kept at `'self'`
  rather than `'none'` so an implicit `/favicon.ico` request is a 404 and not a console violation.
- **Both directions of the stylesheet are now swept by a test.** Every `className` the page renders
  has a rule in `styles.css`, asserted by `tests/render.test.mts` over all thirty-three renders — the
  direction that matters under `style-src 'self'`. The reverse direction, a rule with no user, was a
  hand check until 2026-09-01 and is now the same test read backwards. It found fourteen rules nothing
  rendered, and almost none of them were dead: a sent answer, a locked policy row, a browser with no
  agent in it, a scrolled-away stack. The fix was six new renders rather than an excuse, and five names
  are excused in writing — the quantised `bars__fill--N` stops, which `tests/styles.test.mts` proves
  reachable instead; `notice`, which only a handler sets; `delta--on`, which needs a total
  exactly on the pass mark that no subset of this rubric's points can reach; `error-state`, which needs
  a render to have thrown; and `tick__conflict`, which needs a write to land under an open form with
  ticks in it. That third claim is itself a test, so if the fixtures change the excuse fails rather
  than quietly persisting.
- **The quantised classes are a test, not a check I remembered to run.** `tests/styles.test.mts`
  walks every total from 0 to 200 against six rubric ceilings, collects every stop `gaugeStop()` can
  emit, and asserts all 21 `bars__fill--N` rules exist — the audit draws both of its rails from that one
  family, so the credited length and the pass mark are on the same scale by construction. A missing stop
  renders a zero-width bar, which reads as a student who scored nothing.
- **An uncredited rubric line prints a dash, not a `0`.** Verified in the render: zero occurrences
  of a `0` in the points column, and the credited and uncredited lines sit under separate labels, so
  the dash cannot be read as an awarded zero.
- **The column is the tool surface, not a picture of it.** `toolSurfaceFacts()` builds the real nine
  registrations and `agentFacingPayloads()` calls the same four payload builders the read tools
  call, through the same `assertAgentSafe`. Four tests in `tests/webmcp.test.mts` hold the two
  together: the names in order and the read/write split against the registrations, each printed payload
  `deepEqual` to what its tool returns, no page-owned number in any of them, and the surface building
  against a port that throws on read, so the page can list the tools before a session exists. The
  render test checks that the read/write counts printed above the rows come from the registrations
  rather than from a hand count. A new
  tool would appear on the page without the page being edited, while the human-only release gate is
  described separately and no unavailable operation is printed in the agent UI.
- **Who may do what is a table, not a paragraph.** Three rows — the agent, you, the page — against
  five columns: read, propose, hold, score, send. Fifteen cells, holding and scoring left to the page
  alone and sending to a person alone, every cell saying its answer in a word off screen because a
  hollow dot says nothing to a screen reader, and the test counting the cells from the rows and columns
  it finds rather than from fifteen.
- **The focus ring is `--ink`, the page's darkest tone.** There is no state hue left to borrow: the
  palette is monochrome, so a ring can only be a ring. `tests/contrast.test.mts` keeps it that way by
  refusing any hex, `rgb()` or `color-mix()` outside `:root`.
- **A staged release moves focus to the bar's heading, not to its send button**, guarded on the
  null→non-null transition so a repeated request cannot pull focus mid-typing. A release can be
  staged by an agent, so an agent must not be able to put an irreversible action one keystroke away.
  The heading renders with `tabindex="-1"`, and the focus move itself has now been observed in a
  browser — see the section below.

## Verified in a browser

The page has been opened in a browser. `pnpm browser` (`scripts/browser-session.mjs`) serves
`dist/` with `vite preview`, launches an isolated headless Chromium with a throwaway profile, and
drives it over the DevTools Protocol. The latest run, on 2026-09-03 at 12:54:15 UTC against
Chrome/151.0.7922.137, reported **43 passed, 0 failed**. The record is
`docs/evidence/browser-session.json`, with four screenshots beside it. **The script serves `dist/` and
never builds it**, so every run of it has to follow a `pnpm build` or it is measuring the last bundle
rather than the current source.

**An earlier run of the same day reported 37 of 44, and the seven were the script's expectations rather
than the page's behaviour.** Two encoded the band before the view toggle and the queue before the pager
was removed; one required the narrowest paragraph to clear 80px without filtering for visibility; four
clicked the by-hand checkbox at viewport coordinates that had become a `0×0` rect once the row's panels
went behind tabs. The harness has since been repaired — the visibility filter is applied before a width
is judged, and the concurrent-write journey runs through the DOM again — and the total moved from 44 to
43 in that rewrite. `docs/RUNBOOK.md` keeps the account of what each one was.

What that run established, and what nothing before it could:

- **The layout holds, and it is the one the target image draws.** Three tracks at 1440px —
  `322px 761px 357px`: the policy rail, the work, the agent's contract — and one track at 420px.
  The foot bar computes to `position: sticky`. Nothing spills sideways at either width: `scrollWidth`
  equals `clientWidth` at 1440 and at 420.
- **The band is a band above the columns, and its four figures run across rather than down.** 74px
  tall, four figures on one row, measured by comparing the band's bottom against the columns' top —
  which is the one thing static markup cannot settle. The figures are read off the rendered page
  twice: `14/0/0/0` before the worked example and `14/13/5/0` after it, so a counter that reaches the
  screen and then fails to move is caught. The only controls in the band are its two view buttons.
- **Every proportional bar has a width.** 8 fills in the audit — a credited rail and a pass-mark rail
  for each of the four held answers that have a mark — in 4 distinct lengths, narrowest 257px, widest
  308px, with none broken and none unclassed. A blocked inline width would have rendered every one of
  them at zero, which reads as a student who scored nothing, so the check distinguishes an empty bar
  from a broken one.
- **The policy is enforced, not merely present.** An inline `<script>` injected into the live page
  did not run (`ran=false`) and an injected `style` attribute did not apply (`applied=false`). The
  browser logged exactly those two violations; the page itself raised none. The served policy
  carries all nine directives.
- **Focus moves to the bar's heading** when a release is staged — `{"tag":"h2","id":"gate-title"}` —
  and send unlocks only then. That is an effect, and therefore invisible to `renderToStaticMarkup`.
- **The human release decisions are visible and receipt-backed.** The browser declined a staged
  request, staged it again, then confirmed it through the page control. The timeline contains
  `release declined by human` and `release confirmed by human`, and the final timeline revision
  equals the session revision.
- **A concurrent marking draft is blocked rather than merged silently.** The script submits another
  form while the focused form is open, observes the conflict alert and disabled save, then reloads
  the current mark to recover.
- **Every colour pair the page actually composes clears its WCAG threshold.** 599 composed pairs
  measured and none failing, each against the background the cascade really gave it rather than the one
  the rule intended — ancestors composited, alpha included, `background-image` bailed out of rather than
  guessed at; 455 more skipped as invisible and five as sitting on an image. The worst pair on the page
  is 4.8:1 on `p.ifnobody__note`, at 11.5px and weight 400; the threshold is 4.5 for body
  text and 3 for large text and for the bars that carry a value
  as a length. **It found ten real failures on its first run**: the uncredited dot in the audit rail
  was drawn in the hairline grey at 1.43:1, a glyph nobody could see. That is fixed — the dot inherits
  the row's own grey — and `tests/contrast.test.mts` guards the palette by arithmetic so the page and
  the sheet are checked separately.
- **What a screen reader would be handed is now read, not assumed.** The full accessibility tree —
  with every control and heading arriving named (57 named regions and controls), no unnamed node in any role
  that must have one, a heading outline in document order with one level 1 and no level skipped (14
  headings, at levels 1, 2 and 3), and the page's landmarks: banner, main, three complementary regions,
  and the live region
  arriving as a `status`. 1106 nodes in total. A shut `<details>` does not expose its contents to the
  tree, so this figure moves with which panels the harness has opened by the time it reads — the
  outline, the landmarks, the live region and the empty unnamed set do not. There is deliberately no
  `contentinfo`: the footnote is a note about the
  work and sits inside `main`, where HTML-AAM does not expose a nested `<footer>` as one. This says
  what the tree contains. It does not say the page was listened to — see the standing list below.
- **On a phone the contract column is a panel, and pressing it works.** At 420px the column is a
  closed `<details>` whose summary and nothing else is visible; the summary is pressed, the column
  opens with all nine registered tool rows, and pressed again it closes. At 1440px there is no panel
  at all: the column is a plain region beside the work. The probe asks `checkVisibility()` rather than
  measuring heights, because a closed `<details>` hides its contents with `content-visibility: hidden`
  and every row inside one still reports a box.
- 14 of 14 tab stops focus something; no element on the page carries an inline `style` attribute;
  4 requests in total and none of them left `127.0.0.1`; no console error and no uncaught exception.
- **`document.modelContext` exists on a flagged Chromium build, and all nine tools registered
  natively** — `describe_stack`, `explain_mark`, `list_held_answers`, `preview_unattended_outcome`,
  `propose_marks`, `read_answer`, `read_rubric`, `request_release`, `set_marking_emphasis`. The run
  reads that registry; **it does not call a tool.** Calling them is the next section.
- **It found a real defect, which is the point of looking.** The four "look at" lines then in the left
  rail were rendering one word per line: the step's grid was `26px minmax(0, 1fr)`, the badge spanned
  three rows in column one, and the "look at" line — the fourth in-flow child — auto-placed into
  column one of row four, a 26px column. It was fixed with an explicit `grid-column`; those lines have
  since given way to the authority table, and what the run left behind is a generic guard: the
  narrowest paragraph on the page is 200px of 26.

## Invoked through the browser's own registry

`node --run webmcp` (`scripts/webmcp-invoke.mjs`) is a second browser script, and it answers the one
question the session above cannot: what happens when something *other than this page* calls a tool.
Chromium exposes the agent side of WebMCP over the DevTools Protocol — `WebMCP.enable` reports the
registry, `WebMCP.invokeTool` dispatches a tool by name into the frame that registered it, and
`WebMCP.toolResponded` carries back what the handler returned. The script is a client on that path and
then reads the rendered page to see what moved. The latest run, on 2026-09-03 at 12:54:49 UTC against
Chrome/151.0.7922.137 and `dist/` under `vite preview`, reported **19 passed, 0 failed**; the record is
`docs/evidence/webmcp-invocation.json`.

What that run establishes, and what the session above could not:

- **A call this page did not make reaches the handler and comes back `Completed`.** All nine tools are
  in the browser's own registry, the names it holds are the names the page prints, and the hints
  crossed with them: six tools carry `readOnly`, and `read_answer` — the only tool that returns a
  student's words — carries `untrustedContent`.
- **A write from outside the page moves the rendered page.** `set_marking_emphasis` to `cautious`:
  the care setting moves in the left rail, the revision increments, and the held count rises from 5 to
  6. That is the sentence this package could not previously write.
- **An accepted write replayed with its operation id and the current revision is refused
  `duplicate-operation`, and the page does not move a second time.** A different write replayed from
  the old revision is refused `stale-revision`. Both are observed from outside rather than called from
  a test.
- **The injection is not credited when it arrives as a tool call.** All four rubric lines claimed for
  `ans-11` — the answer whose text asks the marker to ignore the rubric and award full marks — against
  an unmarked stack: the answer is quarantined, nothing is marked, and `explain_mark` refuses to
  explain a mark that was never made.
- **No point value crosses on the wire**, and `list_held_answers` counts five holds while naming two,
  on the dispatched path rather than only in a unit test.
- **A release staged by a tool waits for a person.** `awaitingHuman: true`, no answer id anywhere in
  the 136 characters that came back, the human control unlocked, and focus on the bar's heading rather
  than on its send button.
- **`confirm_release` cannot be invoked: the browser answers *Tool not found*.** The absence at the
  centre of this design is now measured by the browser instead of asserted by the page.
- Four requests, none of them off `127.0.0.1`, and no browser-logged error other than the implicit
  `/favicon.ico` 404 that `img-src 'self'` exists to allow.

**It is not a model.** This script chose the tools, wrote the arguments and knew which revision to
quote. See the next section for what that leaves open.

## Built, not verified

- **No model has ever driven these tools.** The tools have now been invoked — by a DevTools Protocol
  client, which is the same path an agent's host uses, and the page moved. What no run in this
  workspace shows is a *model* finding the page, choosing among nine tools, or composing arguments for
  one. Those are different claims, and the classes of evidence are kept apart on purpose:

  | class | what it establishes | where | state |
  | --- | --- | --- | --- |
  | the source | the functions do what they say | 136 tests, thirty-three renders | green |
  | the artefact in a browser | layout, contrast, the AX tree, CSP enforced, focus, console, human release path | `pnpm browser` — 43 checks | green |
  | what the artefact withholds | no page-owned figure in the agent's view, in the live DOM | `pnpm agent-view` — 17 checks | green |
  | the browser's registry | the API exists, nine tools registered | both scripts | green |
  | dispatch through it | a call from outside reaches the handler, and the page moves | `pnpm webmcp` — 19 checks | green |
  | a model | it finds the page, picks a tool, writes the input | nothing | **absent** |
  | a hosted URL | a stranger can open it | `https://androlay.github.io/withheld/`, HTTP 200 on 2026-09-03 at 09:01 UTC; 43/43 and 19/19 against it at 07:44 UTC | green |

  Anything that reads a green run as evidence of the model row is wrong, and this file exists to
  make that mistake hard. The hosted row went green on 2026-09-03 and closed nothing about the model
  row: both hosted reports carry their own denial, "not model-selected" and "No model was involved."
- **Nothing has been judged by eye or by ear.** Contrast is measured now, in the palette and on the
  composed page, and the accessibility tree is read on every browser run — but measuring a ratio is
  not reading a sentence, and dumping a tree is not listening to it. No screen reader has been run
  against this page, no wording has been reviewed by anyone, and no person other than the author has
  read it at all. Those are the gaps; the arithmetic does not close them.
- CI is pinned to Node 22 and has never run. Every local run was on Node 26.4.0, so the `>=22.6.0`
  floor in `package.json` is inferred from when `--experimental-strip-types` shipped, not observed.
- Hosted browser/dispatch, natural-language model replay, GATE-P2, manual screen-reader review and a
  controlled performance baseline are blocked or not-run; their runbooks sit under `docs/evidence/`
  rather than being represented as passes.


## What exists, file by file

| file | what it is | tests |
| --- | --- | --- |
| `src/data/fixtures.ts` | 14 synthetic answers, the rubric, the worked example | — |
| `src/domain/marks.ts` | the arithmetic, pure | 8 |
| `src/domain/session.ts` | authority: holds, refusals, receipts, release | 25 |
| `src/domain/views.ts` | paired projections, one per audience | 12 |
| `src/tools/agent-boundary.ts` | the fail-closed guard, including the runtime text canary boundary | 10 |
| `src/tools/webmcp.ts` | the nine tools, closed schemas, limits, registration, operation-id retry, and the two facts the page prints | 30 |
| `src/ui/useMarkingSession.ts` | one session, two callers | none — no effects in a render |
| `src/ui/useOneColumn.ts` | whether the page is in one column, so the contract can fold | 1, against the sheet's own breakpoint |
| `src/ui/wording.ts` | hold wording, and the quantised bar stop | 4, via the sheet |
| `src/ui/lens.tsx` | which of the two readers the page is drawing for, and the dash that stands where a withheld figure would be | via the agent's-view renders |
| `src/ui/Icon.tsx` | every glyph on the page, as inline SVG | via the thirty-three renders |
| `src/ui/Chain.tsx` | why an answer was held, as three links | via the audit and the queue renders |
| `src/ui/TopBar.tsx` | the bar across the top: the name, the revision, two anchors | 1, rendered |
| `src/ui/Intro.tsx` | the band: the claim, four counted figures, the class as a strip of fourteen cells, and the two buttons that choose whose view is drawn | 4, rendered five times |
| `src/ui/Rail.tsx` | the care setting, the authority table, the ledger, the four steps | 2, rendered three times |
| `src/ui/Stack.tsx` | the whole class as fourteen rows, four panels behind each | 4, rendered seven times |
| `src/ui/AgentPanel.tsx` | the third column: the surface and four payloads as the agent gets them, the calls that have arrived, the revision timeline, folded into a panel when there is one column | 4 via `webmcp.ts`, 9 over six renders |
| `src/ui/Compare.tsx` | the same stack under all three care settings | 2, rendered three times |
| `src/ui/Audit.tsx` | what was held back, why, and what cannot be known | 3, rendered three times |
| `src/ui/ActionBar.tsx` | the sticky foot: stage, the gate that says when a tool staged the request, and the confirm no tool can reach | 2, all four states |
| `src/App.tsx` | the shell: a bar, a band, three columns and the gate | 1, rendered whole |
| `src/ui/ErrorBoundary.tsx` | fixed, non-diagnostic reload fallback around the app | 1, on the fallback markup; the runtime failure path is not induced in a browser |
| `src/styles.css` | 2907 lines, no framework, no webfont | 8, and 7 more on the palette itself |
| `vite.config.ts` | build-only CSP injection | 1, as text |
| `scripts/browser-session.mjs` | serves `dist/`, drives a headless Chromium over CDP, measures contrast and the AX tree, exercises conflict/release, writes the evidence | it *is* the check — 43 |
| `scripts/webmcp-invoke.mjs` | invokes the nine tools through Chromium's `WebMCP` CDP domain and reads what the page did | it *is* the check — 19 |
| `scripts/failure-recovery.mjs` | drives one redacted local refusal/recovery/release journey through native WebMCP and the page UI | it *is* the check — 27 |

Nine tools: six read (`describe_stack`, `read_rubric`, `read_answer`, `list_held_answers`,
`explain_mark`, `preview_unattended_outcome`), three write (`propose_marks`,
`set_marking_emphasis`, `request_release`). The release action is deliberately outside this list and
is verified by the browser's negative registry probe rather than shown as a row in the agent UI.

The counts above are per test file. `tests/boundary-inference.test.mts` adds six more that cut
across three source files at once, because what it tests is a property of the surface as a whole
  rather than of any one function: see `docs/GATE-W1.md`. `tests/render.test.mts` adds thirty the same
way: four of them sweep every render at once — in both directions, since one asks whether the sheet
has a rule for every class the page uses and another asks whether the page reaches every class the
sheet defines — one is an arithmetic guard standing behind a written excuse in that reverse sweep, and
the other twenty-five take one part of the page each.

## Blocked on the owner

Not started, and not mine to start:

- **Publication.** The Devpost entry is not made and the demo video is not recorded. Both are
  reserved to the owner.

Settled since this file was first written:

- **Publication of the source and the page.** The owner published: `AndroLay/withheld` is public and
  readable without credentials — `main` `9cce7d0a`, `gh-pages` `15baf8f0`, both pushed on 2026-09-03 at
  18:02 UTC — and `https://androlay.github.io/withheld/` answers HTTP 200 with the built `index.html`
  from 18:02:45 UTC, byte-identical to `dist/` here. Two probes ran against that URL at 07:44 UTC rather
  than against `127.0.0.1`, and their reports are `docs/evidence/hosted-browser-session.json` (43/43) and
  `docs/evidence/hosted-webmcp-invocation.json` (19/19); both describe the build published that morning,
  and neither was model-selected.
- **A local browser session.** The owner granted the permission on 2026-09-01 and it has been
  carried out; the last run reported 43 passed / 0 failed.
  See "Verified in a browser", and `docs/RUNBOOK.md` for what the earlier runs found.
  What still needs a person rather than a launch is `GATE-P2`, which asks someone who did not build
  the page to read it.
- **The name on the licence.** `LICENSE` now exists in this package, MIT, with the same
  `Copyright (c) 2026 AndroLay` line as the repository root. The owner chose the name the
  repository already publishes under rather than a separate legal name.

## Not done

- The page is not identical to the image it was built to. Eleven differences are deliberate and written
  down in `docs/DECISIONS.md` D-27 — the band's figures are the live session rather than the drawing's
  invented ones, the tool list carries nine rows rather than seven, "Connect agent" is an anchor and not
  a button, because a button by that name would claim the page can install one — and a twelfth, the
  disclosure panels arriving shut, is recorded in D-30 rather than folded into an earlier dated list.
  The only frame that can honestly be compared against the mockup is
  `docs/evidence/browser-fold-1487.png`, because a full-page capture paints the sticky foot across the
  middle of the document.
- No demo video, and no review by anyone other than the author. The hosted URL exists and is
  verified; the model replay is not.
- `GATE-P1` is closed the honest way rather than the strong way: no primary source on marking
  workload was read, so `README.md` now states in as many words that the size of the problem was
  not measured here. The gate allowed either; this is the weaker half of it.
- `GATE-P2` (one non-builder, ten minutes, four written questions) has not been run. It is about
  whether the problem is real to someone other than me, and it cannot be closed by writing code.
  The instrument now exists — `docs/GATE-P2.md` has the four questions, the protocol, the rules the
  observer has to follow, and an empty Result section — so what is left is twenty minutes and one
  person. The page opens in a browser now, so nothing technical is in the way.
- Twelve commits exist for this work: the first builds the package, the second records the browser
  session and the layout fix it found, the third rebuilds the page to the first target images, the
  fourth adds the invocation run and the submission paperwork, the fifth opens the page with a band that
  states the claim, the sixth measures contrast and the accessibility tree and folds the contract
  column on a phone, and the seventh redraws the page to the refined monochrome target. The eighth
  commits the reliability hardening — the revision guard, the operation receipts, the fail-closed
  number check and the tests that hold them — and the four after it are paperwork on the staged
  candidate: the evidence re-run, the documentation sync, a corrected checksum, and the provenance
  wording in `docs/E4-REQUIREMENTS.md`. The disclosure redesign of the page, and the figures it
  moved, remain in the working tree until they are reviewed and committed. This repository has no
  remote and none of those twelve commits has been pushed. What is published is a *separate* standalone
  repository, `AndroLay/withheld`, whose tree was generated from this package: `93eee30` is the source
  the page served that morning was built from, `b050f991` is the commit that added the two hosted
  reports, and `9cce7d0a` is this package mirrored into that root on 2026-09-03 at 18:02 UTC. None of
  those shas exists in this repository's history, which is why they are named rather than linked.
- The Devpost copy is a draft and nothing more. `docs/PREFLIGHT.md` is the hackathon's own requirement
  list with an owner against every gap, and `docs/SUBMISSION-TEXT.md` holds the four points and the
  judge's instructions. The live URL and the repository URL are no longer placeholders — both exist and
  were read on 2026-09-03 at 09:01 UTC — and the demo video link is the one placeholder left.

## Applied later the same day: the objection answered on the page

`README.md` answers the judge's fair objection — *if the agent cannot see a point value, a total or
the pass mark, is it still doing the work?* — with four mechanisms rather than four claims, and a judge
who only opens the page never reads that. It is now on the page too.

One sentence sits in the agent-contract column, inside the disclosure that prints four tool payloads
verbatim: *"No tool here has a slot for a score, so there is no target to mark toward: naming the ideas
it found is the whole proposal, and the arithmetic was never the agent's to do."* Placement was the
whole point — it is checkable against the four objects printed beside it, in the one column where the
absence is already visible. `src/ui/AgentPanel.tsx`, `.proj__why--ask` in `src/styles.css`,
`docs/DECISIONS.md` D-39.

**What it cost, since the earlier version of this section priced it honestly and the price was paid.**
The edit moved `sourceSha256`, so all five local artefacts were re-run against the new tree and now bind
to `10fb7f7c…` / `84eee099…`; `dist/` was rebuilt; `checksums.txt` was regenerated last. The expensive
part is real and is not repaired: the two hosted reports from the published `93eee30` describe the build
the URL still serves, not this one. That divergence is recorded in `docs/evidence/README.md`,
`manifest.json` and `verification-log.md` rather than smoothed over, because closing it needs a
republish and two fresh hosted runs, which are the owner's acts.

## Applied later the same day: the height of the contract column

**The observation, measured, as it stood before the change.** At 1440px with thirteen answers marked the
page was 2856px tall. The third column carried most of that: the status box, nine tool rows, the
revision timeline, five "what no result can carry" items, four verbatim payload blocks, the release
note, and then the full "How to connect one" prose.

**What was applied, in two steps.** First the content fix: the two heaviest reference blocks in the
agent column became `<details>` disclosures, so the four payloads and the connection prose are one click
away and still in the accessibility tree. Then the layout fix, which the earlier version of this section
had considered and rejected: above the 78rem breakpoint the page is now an app shell one viewport tall
and the three columns scroll on their own. The rejection reasoning was that a judge might not know a
column scrolls; what changed the balance is that the release gate and the agent contract are now both
visible at once, which is the page's whole claim, and the columns show their own scrollbars.

**What it cost, stated where it matters rather than here.** `docs/DECISIONS.md` D-36 records both
consequences: the two wide screenshots are now 1440×900 viewport frames instead of full-page captures,
and the wide sideways-overflow assertion is weaker, because a column that scrolls contains its own
horizontal overflow. The 420px capture is still full-page — 420×4883 — and is the one to read end to
end. All five local artefacts were re-run; the hosted pair still describes the published build.

## Note on scope

The active submission scope is limited to this package and `submissions/flowline/`.
`prototypes/decision-receipt-room/` and the older candidate documents under
`docs/research/` are historical provenance, not additional submissions. See
`../../../docs/research/44-active-submission-scope.md` for the authoritative scope — a monorepo path that
does not exist in the published standalone tree — and note that old candidate
names must not be reused in the public submission copy.
