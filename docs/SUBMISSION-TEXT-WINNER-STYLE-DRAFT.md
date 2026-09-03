# Withheld — winner-style submission text draft (unsent)

**Status:** `DRAFT — UNSENT`

**Use:** copy-ready English narrative for the WebMCP submission form.

**Owner must still fill:** `[YOUTUBE_VIDEO_URL_PENDING_OWNER]` after the hosted build and video are verified. The current hosted URL and public repository are:
`https://androlay.github.io/withheld/` and `https://github.com/AndroLay/withheld`.

## Title

**Withheld — the agent recognises; the page keeps the last word**

## One-line description

A marking workspace where a browser agent can read short answers and propose rubric findings,
while the page keeps the arithmetic, the pass boundary, and the human-only release.

## Inspiration

Marking short answers is really two jobs wearing one coat. Reading a stack against a rubric is
repetitive work that an agent can help with. Deciding what an answer is worth, especially near a
pass boundary, is a professional judgement that should remain visible and accountable to a person.

I built Withheld to make that separation tangible. The agent can recognise language in an answer;
the page owns the numbers and the release. Nothing important is hidden behind a system prompt that
the model might misunderstand.

## What it does

Withheld presents fourteen synthetic short answers, one four-line rubric, and a single marking
workspace.

1. The agent reads the question, rubric line ids, answer text, and safe stack state.
2. It reports which rubric ideas it recognises, by canonical id, rather than inventing a point value.
3. The page maps those ids to its own rubric, computes totals, applies the symmetric boundary hold,
   and records why a person must review an answer.
4. The teacher sees the queue, the page-owned totals, the held reasons, and the agent contract side
   by side. The payloads show what the agent received and what it never received.
5. A proposal can be staged, declined, or confirmed in the page. Sending a mark is a human action;
   there is no `confirm_release` tool.

The result is not “AI grades the class”. It is a bounded proposal workflow in which the agent does
the language-heavy first pass and the page makes the authority boundary inspectable.

## Why this is a strong fit for WebMCP

The important context lives in the page: the current marking revision, the answer currently open,
the rubric vocabulary, the hold policy, and the release state. A copied chat transcript would lose
that shared state and would force a teacher to paste marks back into the system. WebMCP lets the
agent work through named, page-scoped tools while the page remains the source of truth.

Withheld makes the counterfactual explicit. Remove WebMCP and the page can still display a marking
table, but the bounded agent contract, untrusted-answer channel, revision-aware proposal path, and
visible separation between recognition and arithmetic disappear. Add a generic chatbot and the
most important rule is still only prose. Here, the rule is enforced by the state machine and by the
absence of a release capability.

## What people and agents can do together

The agent may:

- `describe_stack` — read the question, aliases, answer ids, revision, and safe state counts;
- `read_rubric` — read canonical rubric ids and recognition labels, not point values;
- `read_answer` — read one answer as explicitly untrusted content;
- `list_held_answers` — learn that human attention is needed, without learning hidden boundary ids;
- `explain_mark` — explain recognised and missed rubric ideas by id and label;
- `preview_unattended_outcome` — see how much attention remains, without per-answer outcomes;
- `propose_marks` — submit bounded recognition findings for the page to compute;
- `set_marking_emphasis` — raise caution, never silently lower it;
- `request_release` — stage a releasable set for human review.

The human may inspect the calculation, change a mark, decline a staged release, re-stage it, and
confirm the final release from the page. The contract panel makes the split visible: six read tools,
three proposal tools, and no tool that can send a mark.

## The moment that makes the boundary real

One synthetic answer contains instructions aimed at the marker rather than an answer to the
question. Withheld treats that text as untrusted student content and quarantines it; it cannot
carry a point-bearing argument through the tool surface. Unknown rubric ids earn nothing, duplicate
findings are paid once, and stale or repeated writes are refused instead of silently changing a
newer session.

The teacher can then compare the page-owned total and pass mark in the middle column with the
redacted agent payloads on the right. The point is not that the agent is “trusted”; the point is
that the page does not need to trust it with authority it never had.

## How it was built

Withheld is a static, local-first React application:

- React `19.2.8`, TypeScript `5.9.3` strict, and Vite `7.3.6`;
- pure page-owned arithmetic and hold policy in `src/domain/marks.ts`;
- a revision/receipt authority layer in `src/domain/session.ts`;
- separate teacher and agent projections in `src/domain/views.ts`;
- nine strict WebMCP definitions registered through `document.modelContext`, with a deprecated
  `navigator.modelContext` fallback;
- plain monochrome CSS, no remote font, no inline style dependency, and a production CSP;
- synthetic alias-only fixtures, no backend, database, login, telemetry, or outbound request.

Every write carries an `expectedRevision` and a bounded, single-use `operationId`. The shared reply
guard rejects invalid/oversized/unknown input and keeps page-owned figures out of agent-facing
prose. `read_answer` is the one tool marked as untrusted content. The human release control is a
page action, not a WebMCP registration.

## What I am proud of

The strongest part of Withheld is that its safety story is visible in the workflow, not just in a
README. A person can read the exact answer, the rubric evidence, the held reason, the proposal, and
the receipt. A browser client can exercise the registered tools and observe revision-bound refusals,
prompt-injection quarantine, duplicate-operation rejection, stale-write rejection, and the missing
`confirm_release` capability. Local artifacts also cover the human decline/re-stage/confirm path.

Those are deterministic local engineering artifacts. They are not presented here as proof that a
remote natural-language model has already selected the tools, or that a hosted marking service is
ready for real student data.

## Challenges and what I learned

The challenge was not adding more tools. It was deciding what the agent must never learn. I had to
keep the agent useful enough to recognise rubric language while preventing it from receiving the
numbers that decide a mark. That required separate projections, fail-closed serialization, revision
guards, and a release flow that stays human-owned even when a tool can stage a request.

I also learned that a limitation is part of the product explanation. The fixtures are synthetic,
the session is in memory, and the current evidence is local. Saying that plainly is more credible
than implying a classroom deployment that has not happened.

## Testing instructions for judges

Open **https://androlay.github.io/withheld/** in Chrome 149+ with WebMCP enabled, or use ChatGPT's in-app
browser after the hosted run is verified. No account or API key should be required.

1. Press **Mark all from the worked example** and compare the page-owned totals with the contract
   panel's payloads.
2. Open a held answer and read the evidence chain. The total and pass boundary belong to the page,
   not to the agent payload.
3. Raise **Care level** and watch the page hold more answers rather than silently releasing them.
4. Send a deliberately stale or invalid proposal in the test instructions; the page returns a
   structured refusal and leaves the current revision unchanged.
5. Stage a release, decline it, stage again, then confirm it with the human control. The receipt
   records the human decision; there is no agent release button.

The local reproduction path is in the public repository once published:
`pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then `pnpm preview`.

## Limitations and evidence status

Withheld is a controlled marking prototype, not a school grading system. The answers, aliases, and
rubric are synthetic; there is no account, backend, persistence, multi-user sync, or real student
data. Prompt-injection handling is a bounded quarantine route, not a universal model-safety claim.

The package contains local deterministic tests, browser accessibility/CSP checks, agent-view
redaction checks, native WebMCP registry/dispatch artifacts, and failure/recovery artifacts. At the
time this draft was written, hosted URL verification, a model-selected natural-language replay,
non-builder GATE-P2 validation, Node 22/CI, screen-reader review, and real-device review were still
open in `docs/PROGRESS.md` and `docs/PREFLIGHT.md`. They must be closed or stated plainly before
submission.

## Submission fields to fill after verification

- **Live URL:** `https://androlay.github.io/withheld/`
- **Public repository:** `https://github.com/AndroLay/withheld`
- **Demo video (public YouTube, < 3 minutes):** `[YOUTUBE_VIDEO_URL_PENDING_OWNER]`
- **License/rights:** MIT code; confirm that every final visual, voice, music, and video element is
  original or licensed.

**Do not submit this file as evidence of a hosted/model run. It is copy for the form, and remains
unsent until the owner verifies the final URLs and recording.**
