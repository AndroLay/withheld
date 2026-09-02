# Withheld

**Your agent marks the whole stack. The page keeps the points and the pass boundary to
itself, and hands back only the few answers a human must decide.**

## The problem

Marking a class of short answers is mostly recognition and only occasionally judgement.
Most answers say the expected thing in an unexpected order, and reading them is mechanical.
A few are the reason a person marks at all: the long answer that earns nothing, the one
sitting on the pass boundary, the one addressed to the marker instead of to the question.
Hand the whole job to an agent and you have quietly given away those few. Keep the whole
job and you spend the evening on the rest.

**How much of it is recognition has not been measured here.** No teacher was interviewed
and no marking session was timed, so the sentence above is a description of the shape of
the work, not a finding, and nothing in this repository should be read as evidence for how
common the hard answers are. The demo stack of 14 answers is the author's own construction:
it holds five of them back, which is a property of that fixture and not a rate observed
anywhere.

Every agent workflow answers this by adding an approval step, which moves the cost rather
than removing it: you confirm once per answer instead of marking once per answer. Withheld
inverts that. The agent does the recognition. The page decides what you never should have
been asked, and what you must not be allowed to skip.

## The mechanic

The agent reports, in words, which canonical rubric ideas it recognised in each answer.
It is never told what a rubric line is worth, and never told the pass boundary. So it
cannot compute a total, cannot see which answers sit on a grade cliff, and therefore
cannot compute — or forge — the decision about what gets escalated to you. The page owns
the arithmetic and the identity.

> Agent brings language. Page keeps arithmetic and authority.

`src/domain/marks.ts` is that boundary in code. `tests/marks.test.mts` asserts that the
agent-facing rubric carries no point value and no boundary, that an invented rubric line
earns nothing, and that a line claimed twice is paid once.

## Status — what is built and what is not

The code is complete and tested, the page has been opened in a browser and measured, and the nine
tools have been invoked through the browser's own WebMCP registry with the page moving in response.
What no *model* has done is choose one of them: nothing here is a recording of a model reading this
page and deciding. Those are different kinds of unfinished, and the lists below keep them apart — the
first is what has been checked by running it, the second is what would need a model, a person, a host,
or a decision.

Built and verified locally:

- Page-owned mark arithmetic as a pure function.
- Redaction of point values and the pass boundary at the tool boundary, asserted by test.
- A fail-closed guard on the information boundary: a number may appear in a tool result
  only at an allowlisted path, plus a text canary for a secret smuggled out as prose.
- The authority layer: revision-gated writes, four escalation rules that hold an answer for
  a person, a care setting an agent may raise and nothing may lower, receipts, and a release
  that stages a request and releases nothing.
- All nine WebMCP tools, registered through `document.modelContext` with the deprecated
  `navigator.modelContext` as a fallback, torn down through an `AbortSignal` because the API
  offers no `unregisterTool`. Every payload — refusals included — passes the boundary guard
  before it is serialised.
- The page itself: a bar across the top, a status band under it, three columns and a sticky foot. The
  band states the claim before the work demonstrates it — *the page owns the decision* — beside the whole
  stack in four live figures: answers, marked, held, staged. Left, everything the page owns — the care
  setting, the boundary, the four steps of how a mark gets made, and the ledger of what has happened.
  Centre, the work: one answer opened with the rubric as ticks beside it, the rest of the stack three
  rows at a time with a form in each, then one expandable account per held answer — its causal chain,
  what was credited drawn against where the pass mark sits on the same scale, and what would have gone
  out unwatched — and the same stack costed under all three care settings. Right, the agent's whole half.
  Across the foot, the two human-only release controls. Nothing on it requires an agent to be present —
  every tool has a control beside it that does the same thing by hand, which is a fact about the source
  and not a report of using it.
- **The agent's own view, printed on the page.** The whole third column: all nine tool names with the
  read/write split, the absent `confirm_release` shown as absent, the five things no result can carry,
  the four redacted payloads verbatim as JSON, and a foot that names the one action with no tool and
  points at it rather than repeating it. It is built from the tool registrations and the tools' own
  payload builders rather than from a copy, and five tests hold the two together, so the boundary can
  be read against the totals beside it instead of taken on trust. This is also what makes the page
  mean anything with no agent connected, which is every run so far.
- A Content-Security-Policy injected into the production build only. Nine directives, none of
  them wider than the page uses; a test holds the policy to that shape, because widening
  `style-src` is the cheapest way to break every proportional bar on the page. The tag is present
  in the built `dist/index.html`, and the browser has been observed **enforcing** it — see the
  browser session below.
- **Every part of the page rendered to static markup, by test.** Twenty-three renders on every run — the
  top bar, the band in both states, three rail states, the stack in five (marked from the worked example,
  after a send, with an answer already sent, with a ready answer open, and with nothing in the view), the
  contract column in five (nothing marked, marked, no agent in this browser, an agent connected, and
  folded for one column), the comparison twice, the audit rail, the bar idle, staged and with the stack
  scrolled away, and `App` whole. None throws, none emits an inline `style`, and every class name any of
  them asks for has a rule in the stylesheet. The counts they assert are derived from the fixtures rather
  than typed in. The sweep runs backwards too: every class the sheet defines must be reached by one of the
  twenty-three renders, so dead CSS fails the suite rather than sitting there looking like a feature.
- 110 tests pass under the Node test runner. Typecheck and build are clean.
- **The page has been opened in a browser and measured.** `pnpm browser` serves `dist/`, launches
  an isolated headless Chromium, and drives it over the DevTools Protocol: **37 checks, 37 passed,
  0 failed** on 2026-09-01 against Chrome/151, recorded in `docs/evidence/browser-session.json`
  with four screenshots. It establishes the things static markup cannot — the three columns lay out
  at 1440px (322px of policy, 761px of work, 357px of contract), the band stays a band above
  them with its four figures on one row and no control in it, the four figures read `14/0/0/0` before the
  worked example and `14/13/5/0` after it, the foot bar stays pinned, and
  nothing spills sideways at 1440px or 420px; all eight proportional bars in the audit have a width, in
  four distinct lengths, with none broken and none unclassed; the CSP is **enforced**, since
  an injected inline script did not run and an injected `style` attribute did not apply; focus
  moves to the bar's heading rather than its send button when a release is staged; nothing left
  `127.0.0.1`; the console is clean. It also found and fixed a real layout defect, four paragraphs
  auto-placing into a 26px grid column. On a flagged Chromium build `document.modelContext` exists
  and all nine tools register natively. **The session reads that registry; it is not an agent.**
- **Contrast is measured, not asserted.** The same session walks every visible text node the page renders
  and computes the ratio against the background it actually resolves to: **423 pairs, none below its
  WCAG AA threshold**, the thinnest at 4.8:1 against a 4.5 requirement. It found ten real
  failures at 1.43:1 on first run — a rubric-line mark drawn in a tone that had only ever been used
  on white — and the palette is now guarded by arithmetic in `tests/contrast.test.mts` so the page
  and its own claim cannot drift apart.
- **What a screen reader is handed, read out of the accessibility tree.** 1001 nodes, 32 named
  regions and controls, **none unnamed**, 18 headings in document order at levels 1, 2 and 3 with no
  level skipped, and the landmarks the page means to expose: one `banner`, one `main`, three
  `complementary`, one live `status`. There is deliberately no `contentinfo` — the foot is a note about
  the work and sits inside `main`, which HTML-AAM does not expose as a landmark. **This is the tree, not a
  screen reader: no assistive technology has been run against this page.**
- **The contract column folds on a phone.** Below 62rem the third column becomes a `<details>` panel
  that arrives closed, measured in the browser at both widths: absent at 1440px, and at 420px 110px
  tall shut with **0 of its 10 tool rows visible**, 2538px and all ten visible when pressed, closed
  again when pressed a second time. A closed `<details>` still reports layout boxes, so the check
  asks `checkVisibility()` rather than trusting heights.
- **The tools have been invoked through the browser's own registry, and the page moved.**
  `pnpm webmcp` drives Chromium's `WebMCP` DevTools domain — the path an agent's host uses:
  `WebMCP.invokeTool` dispatches a tool by name into the frame that registered it. **17 checks, 17
  passed, 0 failed** on 2026-09-01 against Chrome/151, recorded in
  `docs/evidence/webmcp-invocation.json`. A write from outside the page moves the rendered page — the
  care setting, the revision, and the held count from 5 to 6 — and the same write replayed at the
  revision it spent is refused `stale-revision` with the page staying put. The prompt injection
  arrives as a tool call, claiming all four rubric lines for the answer that asks for full marks, and
  is quarantined with nothing marked. A release staged by a tool comes back `awaitingHuman` with no
  answer id in it, unlocks the human control, and puts focus on the bar's heading. And
  `confirm_release` fails with *Tool not found*: the absence at the centre of this design is measured
  by the browser rather than asserted by the page. **The script composed every call; no model did.**

Not built, and not claimed:

- **No model has chosen a tool here.** The invocation run above is a DevTools Protocol client: it
  picked the tools, wrote the arguments and knew which revision to quote. What remains unobserved is a
  model finding this page, choosing among nine tools, and composing input for one. `docs/PROGRESS.md`
  keeps the five classes of evidence — the source, the artefact in a browser, the registry, dispatch
  through the registry, and a model — in a table, with the last one empty.
- **Measured is not the same as reviewed.** The browser session computes contrast ratios and reads
  the accessibility tree, so those two are no longer guesses. What it cannot do is listen: no screen
  reader has been run, so the tree is evidence that every control has a name and not evidence that
  the page makes sense read aloud. It also makes no judgement about wording, and the phone layout has
  been measured at 420px in a headless browser rather than held in a hand. No person other than the
  author has read the page.
- **No undo, and the word is used carefully.** Four things can be taken back: a proposal, until a
  release is staged; a staged release, by declining it; the history, because every write leaves a
  receipt; and any mark, by re-entering it. One cannot: a release a person has confirmed. That is a
  decision, not a gap — see `docs/DECISIONS.md` D-23.
- No hosted URL, no video, and no validation by anyone other than the author.

`SECURITY.md` carries the threat model: prompt injection through student answers, the
absence of a release tool, the information boundary, and what a header-less static host
cannot enforce.


## The tool surface

Nine tools, one function each. Six read-only: `describe_stack`, `read_rubric`,
`read_answer` (answer bodies always carry `untrustedContentHint`), `list_held_answers`,
`explain_mark`, `preview_unattended_outcome`. Three writes, each returning a receipt and
each gated on `expectedRevision`: `propose_marks`, `set_marking_emphasis`,
`request_release`.

There is deliberately **no `confirm_release` tool**. Releasing marks to students is a
human action in the page's own UI, and no tool exists that an agent could call to perform
it. That absence is the design, not an omission.

## Requirements

WebMCP is behind a flag. The page feature-detects `document.modelContext` and stays fully
usable as an ordinary web app when it is absent — every tool has a visible manual
equivalent.

## Local development

This package is one workspace member, so every command below runs from its own directory.
The repository root has no `dev` script.

```sh
cd submissions/withheld
pnpm install    # or `pnpm install` once at the repository root
pnpm dev        # http://127.0.0.1:4174
pnpm preview    # serves dist/ — the only way to exercise the CSP
pnpm test       # 110 tests: arithmetic, authority, boundary, tools, sheet, palette, renders
pnpm build      # typecheck, then production bundle
pnpm browser    # after a build: 37 checks against dist/ in a headless Chromium
pnpm webmcp     # after a build: 17 checks, invoking the tools through the browser's registry
```

From the repository root, `pnpm --filter withheld dev` does the same thing without changing
directory. `package.json` asks for Node ≥ 22.6, since the tests run through
`--experimental-strip-types` and that is the release it appeared in. What has actually been run is
Node 26.4.0.

No backend, no accounts, no network calls. All student data in the demo is synthetic and
alias-only; there is no real personal data in this repository.

## Documentation

`docs/` carries the detail, and `docs/README.md` is the index:
[architecture](docs/ARCHITECTURE.md), a numbered [decision log](docs/DECISIONS.md),
[what the tests do and do not prove](docs/TESTING.md), a [runbook](docs/RUNBOOK.md) with a
walkthrough, and a [progress ledger](docs/PROGRESS.md) separating what is verified from what is
merely built. Two gates have their own files: [GATE-W1](docs/GATE-W1.md), on what an agent could
derive, which found a real leak and records two channels it leaves open; and
[GATE-P2](docs/GATE-P2.md), on whether the problem is real to anyone but the author, which is written
out and **has not been run**. `docs/evidence/` holds what the browser session recorded, screenshots
included. `SECURITY.md` carries the threat model.

The visual the page was built to is kept separately in
[docs/target-images](docs/target-images/README.md), with the reference it departs from and the one
frame that can honestly be compared against it. It is a drawing, not evidence of a hosted or
native-agent run. The current target is monochrome, and the page departs from it in eleven recorded
places — the band's figures are the live session rather than the drawing's invented ones, the tool list
carries ten rows rather than seven, and the mockup's second release control in the top bar is an anchor
here, because exactly one control on this page releases a mark. All eleven are in
`docs/DECISIONS.md` as D-27; the three departures from the colour target that preceded it are D-21,
which also records the one item of the brief that was outstanding until the contract column learned to
fold.

## License

MIT. `LICENSE` in this directory carries the same terms and the same copyright line as the
repository root — `Copyright (c) 2026 AndroLay`, the name this repository already publishes
under. The owner chose that rather than a separate legal name, so the two files agree and
neither needs revisiting.
