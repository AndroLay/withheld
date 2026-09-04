# Gallery frames

Eleven PNG captures of the page in the states it actually reaches. They exist for the Devpost card
and the write-up; nothing here is part of the evidence ledger.

## What they are

Captures of the **built** tree in `dist/` — build `84eee099…`, the same three files
`https://androlay.github.io/withheld/` serves — driven through the page's own controls and through
the real WebMCP tool surface over CDP. Every state on screen was produced by a click or by a tool
call, in the order the frames are numbered. No mockup, no annotation, no retouching, no composite.

They are **not** renders of [`../design/proposal-v3.html`](../design/proposal-v3.html). Those renders
in `../design/` are of a proposal the page does not implement, and must not be uploaded as product
screenshots.

They are **not** model evidence. Every call in these frames was dispatched by Chromium's own
`WebMCP` domain from a deterministic CDP client — the same transport as
[`../evidence/webmcp-invocation.json`](../evidence/webmcp-invocation.json). No language model chose
any of them, and the frames say so where the page says so. The run was against a local
`vite preview` of `dist/`, not against the hosted URL; the served bytes are byte-identical, the run
is not.

## The frames

Every frame is 2× pixel density except `11`, which is 1×. Sizes are the files as written.

| frame | pixels | what is on it |
| --- | --- | --- |
| `01-entry-1440.png` | 2880×1800 | the page as a visitor arrives, before any call has been made |
| `02-agent-contract.png` | 2396×5252 | the whole contract, opened: nine tools with read/write against each, the revision timeline, what no result can carry, four verbatim payloads, and the note that names `document.modelContext` and the Chrome flag |
| `03-quarantine-1440.png` | 2880×1800 | three calls in, one of them a write claiming every rubric line for the answer that tells the marker to ignore the rubric. Revision 02, one held, the row open: "It is quarantined, and carries no mark at all" |
| `04-marked-1440.png` | 2880×1800 | the stack marked from this page's own worked-example fixture — a click, not an agent: 14 answers, 13 marked, 5 held, 0 staged, at revision 03 |
| `05-queue-holds.png` | 2344×2360 | the queue's own filter set to *Held for you*, 5 of 14, every row open with the rule that held it: three on the line against a 50 / 88 pass mark, one long answer that matched no rubric idea, one quarantined |
| `06-care-ratchet.png` | 2312×270 | the care setting after a tool raised it to *Most cautious*, with the two lower settings locked against being chosen again |
| `07-calls-and-refusals.png` | 2344×812 | every call the page has been sent, in order, with what each one did — reads that moved nothing, the revision each write produced, and two refusals: `duplicate-operation` and `stale-revision` |
| `08-gate-awaiting-human.png` | 2880×1800 | a release staged by a tool and stopped there. Revision 05, seven staged: "Staged by a tool call. It reached the edge of what it may do and stopped there" — and the only button that can send them, marked HUMAN ONLY |
| `09-authority-grid.png` | 2344×488 | the fifteen cells: Agent, You and Page against READ, PROPOSE, HOLD, SCORE and SEND |
| `10-audit-ledger.png` | 2344×488 | the page's own receipts — four actions, written by the page and never by the caller, with the revision as the session's only clock |
| `11-whole-audit-1180.png` | 1180×3426 | the whole page in one frame at revision 03. Below 78rem the columns stack and the document grows, which is the only width where one capture can hold all of it |

## Why this directory costs nothing

`scripts/evidence-meta.mjs` hashes the source tree over `index.html`, `vite.config.ts`,
`package.json`, `pnpm-lock.yaml`, the three tsconfigs, `src/` and `scripts/`, and the build tree over
`dist/`. **`docs/` is in neither.** So these frames move neither source `b924a27a…` nor build
`84eee099…`, they are not entries in [`../evidence/checksums.txt`](../evidence/checksums.txt), which
stays at 27 paths, and `sha256sum -c` still prints 27 OK.

The capture script is deliberately **not** in this repository. It lives outside the package because
`scripts/` is inside the hashed source tree, and a capture script committed there would move the
source hash and invalidate the checksum sheet mid-window. Re-taking the frames therefore needs that
script; the states themselves are reproducible from the page without it — the worked-example button
marks the stack, the queue filter shows the holds, and the three write tools produce the rest.

## Reading them honestly

- The band figures depend on the fixture and on the care setting. 5 held at *Standard* and 7 at
  *Most cautious* are the same fourteen answers under different rules, not a change of data.
- Every student and every answer is invented, and is a fixture in this page's own source.
- `HAND` on a row means the mark came from the worked-example fixture. A row marked by a tool call
  carries `TOOL` instead — frame `03` shows one.
- The two refusals in frame `07` are states the interface never offers. They can only arrive from a
  caller, which is why they are worth a frame.

Candidates, if the owner wants them: `08` as the card, because one frame carries the whole argument;
`03` for the injection; `11` for the write-up. That is a suggestion, not a decision.

