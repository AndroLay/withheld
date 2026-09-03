# Design proposals

Not part of the submission. A working mockup kept next to the package so a layout argument can be
looked at instead of described. `proposal-v3.html` replaces the earlier v2 file and its renders.

| file | what it is |
| --- | --- |
| [`proposal-v3.html`](proposal-v3.html) | one self-contained page, clickable. Open it in any browser — no server, no build |
| `v3-1440-arrival.png` | nothing dispatched yet, 1440×1216 |
| `v3-1440-agent-writing.png` | 15 calls in: six answers written, one being read, sixteen calls left |
| `v3-1440-agent-staged.png` | the sequence finished, one row open on the chain that held it |
| `v3-1440-refused.png` | two refused calls, and a session unchanged by them |
| `v3-1440-by-hand.png` | the same 13 marks with no tool called — the control for the provenance claim |
| `v3-1440-agent-view.png` | the same session with **Agent's view** on: every page-owned value dashed out |
| `v3-420-agent-staged.png` | one column at 420px, contract folded shut |

## What it proposes

The page as built explains itself in prose: nearly every element carries a heading *and* a sentence
about why it is there. That reads as documentation rather than as a workspace. This mockup keeps every
claim and spends fewer words on it.

- **Who can do what** becomes a 3×5 matrix — fifteen glyphs where there were three paragraphs.
- **The stack** becomes one strip of fourteen cells above the fold: outlined, filled, or hatched.
  Hover names the student, click jumps to the row.
- **An answer** becomes one row. Opening it reveals four tabs — answer, rubric, why held, mark by hand —
  instead of stacking all four with connective prose between them.
- **The contract column** lists nine tools once, and each row opens on the payload it returns. The
  separate "what a tool actually returns" section disappears, because it was the same nine tools twice.
- **Agent's view** redacts every total, point value, pass mark, distance, boundary-hold identity, and
  provenance tag — the argument the built page makes in prose, made in one toggle. This one is no
  longer a proposal either: the built page has it, by omission rather than by stylesheet, and
  `docs/DECISIONS.md` D-33 records the difference and why it matters. The prose the toggle argues
  against is still on the page; cutting it is a separate pass, not something the toggle did.
- All fourteen answers are listed at once, dropping the three-answer window the built page used to
  keep at `src/ui/Stack.tsx`. The strip already carries the overview the pager was buying, and a
  collapsed row is one line tall. This one is no longer a proposal: the built page adopted it, and
  `docs/DECISIONS.md` D-31 records what the measurement showed.

## How progress becomes visible

The v2 mockup showed *state* and no *activity*, which is the thing a judge watching an agent work
needs to see. Five devices, all of them derivable from what the domain already records:

- **An activity list**, one row per dispatch: sequence number, tool, and either the revision it produced
  or the refusal code it came back with. Refusals mutate nothing (`src/domain/session.ts:250-259`
  returns `{ok:false, code, message}`), so this list is the only place a refused call can leave a trace.
- **A call count instead of a connection claim.** Registration happens at page load whether an agent
  is there or not, so the honest line is "no tool has been called yet" → "33 tool calls · revision 15",
  never "agent connected".
- **A provenance tag per row**, `tool` or `hand`. No domain change is needed: `Receipt.operationId` is
  set only for accepted WebMCP writes (`src/domain/session.ts:148`) and the human form path omits it
  (`src/App.tsx:116`). No view reads it today.
- **One call per answer.** The replay reads the stack, reads the rubric, then reads and marks each
  answer in turn, so fourteen writes land as fourteen revisions and the strip fills a cell at a time.
  Nothing is faked: a batched `propose_marks` really does land in one revision, and the mockup would
  show it as one row.
- **A gate that reacts.** When the release is staged by a tool call the footer reads "staged by a tool
  call — it reached the edge and stopped", and the confirm button stays disabled either way.

The buttons under the queue drive this: `Replay tool calls` steps the whole sequence, `Step once`
advances one call, `Mark all by hand` writes the same marks without touching a tool, and
`Force a refusal` sends one duplicate operation id and one attempt to lower the care setting.

## Measured against the built page

Both in Chromium 151, one script, one run: `document.body.innerText` word count and `scrollHeight`,
at 1440px and then at 420px. "After marking" is the same act on both sides — marked by a person, not
by a tool call, so the two pages are compared doing the same work: the built page's worked-example
button and the mockup's *Mark all by hand*.

| | built page | this mockup |
| --- | --- | --- |
| words on arrival | 1304 | 892 |
| words after marking | 1478 | 920 |
| height on arrival | 2495px | 1216px |
| height after marking | 2609px | 1266px |
| height at 420px, on arrival | 3006px | 2735px |
| height at 420px, marked | 3680px | 2805px |
| answers listed at once | all 14, since D-31 | all 14 |

The mockup's height barely moves because opening a row replaces content rather than adding to it. The
built page's does move, and the reason is the same one that makes it wordier: it says what it did in
prose where the mockup says it in a row. It is wordier than the v2 draft (769 words) — the activity
list, the receipt trail and the causal chain are what the extra 123 words buy.

## What was checked, and what it showed

One thing, by script rather than by eye: with all fourteen answers marked and **Agent's view** on, what
is left of the figures this page owns — the four point values, the pass mark, the band, and every total
the worked example produced. The script reads `document.body.innerText`, then the live DOM with icon
geometry and the students' own words removed, then counts the elements whose own text is one of those
figures, drawn or not. Against the built page it is `pnpm agent-view` (`scripts/agent-view.mjs`), kept in
the package; against this file it was the same probe pointed at `file://`, and that run is reported below
rather than kept, since the mockup is not part of the submission.

The mockup fails that check, and the way it fails is the reason the built page does not copy it. Its
`.rd` treatment is `color: transparent` with an em dash from `::after`: all twenty-seven of them render
a box, and the value is still inside it. In **Agent's view** the mockup's own `innerText` reads back
`4`, `50`, `17 19 23 29`, `88 71 52 48 46` — the band, the pass mark, all four point values and the five
totals it draws. Anyone with an inspector, a screen reader, or a text selection has the lot. Two of the
four selectors that earlier drafts of this file claimed to sweep — `.chain` and `.gauge` — do not exist in
this mockup at all, so that claim was not even wrong about a real element; it has been removed rather than
repaired.

The built page redacts by omission instead: each component is handed the projection a tool returns, so
there is no total to reveal. Same script, same figures, against the production build — none of the
thirteen figures appears in `innerText`, none anywhere in the DOM, and the count of elements whose text
is one of them is **0**, against **143** in the teacher's view of the same session, restored intact when
the toggle is pressed back. Seventeen checks, nothing failing, at 1440px and at 420px. That asymmetry is
also asserted statically in `tests/render.test.mts`, over four agent-view renders, so it cannot rot
between browser runs. `docs/DECISIONS.md` D-33 records the choice; `docs/RUNBOOK.md` says how to run
the sweep.

## What it is not

Static HTML with a `<style>` block and inline bar widths — both illegal under the production CSP. The
real implementation puts the sheet in `src/styles.css` and quantises widths into `bars__fill--N`
classes, as `docs/DECISIONS.md` D-08 requires. The replay is a script over the nine tools, not a model:
it proves the tool path can be driven and watched, and proves nothing about whether an agent would
choose those calls. No test, no accessibility tree, and no contrast sweep has been run against this
file; it is a picture of a layout, not a build.

Folding it into the React page touches `src/ui/*.tsx` and `src/styles.css`, and would require updating
`tests/render.test.mts` (which sweeps the stylesheet in both directions) and `tests/styles.test.mts`
(which pins the grid columns).
