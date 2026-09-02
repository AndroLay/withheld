# Withheld

Withheld is a privacy-first marking prototype where an agent recognises ideas in student answers,
the page computes marks and escalation decisions, and a human remains the only release authority.

> Agent brings language. The page keeps arithmetic and authority.

## Status

| Item | Status |
| --- | --- |
| Public repository | [github.com/AndroLay/withheld](https://github.com/AndroLay/withheld) |
| Staging URL | [androlay.github.io/withheld](https://androlay.github.io/withheld/) |
| Hosting | GitHub Pages, HTTPS enforced |
| Data | Synthetic alias-only fixtures; no real student data |
| Runtime model | No backend, database, login, persistence, analytics, or runtime network request |
| License | MIT |
| E4 status | **NOT ACHIEVED** — model replay, independent user validation, final video, and several release gates remain open |

The staging URL is a working demonstration target. It is not a claim that a natural-language model has
used the tools: the recorded browser/WebMCP checks were selected and driven by deterministic CDP
harnesses.

## Why Withheld

Short-answer marking has two different kinds of work:

1. recognition — finding which ideas an answer expresses; and
2. judgement — deciding what is safe to accept, what needs a second look, and what may be released.

Withheld gives the recognition surface to WebMCP while keeping the consequential decisions inside the
page. The agent can read language and report rubric-line IDs, but it never receives point values or
the pass boundary. The page computes the mark, derives holds, records receipts, and stages a release.
Only a person can confirm that release in the UI.

The demo uses a 14-answer science fixture about why a metal spoon feels colder than a wooden spoon.
The fixture is deliberately synthetic and exists to exercise clean, ambiguous, long, boundary, and
marker-directed answers. It is not a classroom dataset or an impact measurement.

## WebMCP tool surface

The page exposes exactly nine tools: six read-only tools and three guarded write tools.

| Tool | Access | Input | What it does | Boundary / result |
| --- | --- | --- | --- | --- |
| `describe_stack` | Read-only | `{}` | Describes the question, revision, answer IDs, aliases, character counts, and current answer states. | Never returns marks, point values, or the pass boundary. |
| `read_rubric` | Read-only | `{}` | Returns the canonical rubric line IDs and recognition labels. | Point values and the pass boundary are removed before serialization. |
| `read_answer` | Read-only | `{ answerId }` | Reads one answer and its alias so the agent can recognise rubric ideas. | The body is explicitly untrusted content and is labelled with `untrustedContentHint`; it is not an instruction. |
| `list_held_answers` | Read-only | `{}` | Reports the number of held answers and reasons that are safe to name. | Near-boundary answer IDs are intentionally omitted; the aggregate count remains available. |
| `explain_mark` | Read-only | `{ answerId }` | Explains which rubric ideas were accepted or missed for an already-marked answer. | Returns IDs and labels only—never totals, points, distance, or pass/fail. |
| `preview_unattended_outcome` | Read-only | `{}` | Shows how much of the stack still needs a person before release. | Returns counts only; it does not expose per-answer pass/fail outcomes. |
| `propose_marks` | Write | `{ findings, expectedRevision, operationId }` | Accepts bounded recognition findings and lets the page compute marks and holds atomically. | Closed schema, bounded IDs/arrays, current-revision check, single-use operation ID, receipt. |
| `set_marking_emphasis` | Write | `{ emphasis, expectedRevision, operationId }` | Raises the page's caution level. | Emphasis can only move upward; duplicate, stale, and lowering writes are refused. |
| `request_release` | Write | `{ expectedRevision, operationId }` | Stages the currently releasable set for human review. | Returns `awaitingHuman`; it never releases marks and has no confirmation path. |

All agent-facing payloads pass through the same numeric allowlist and text canary. Invalid, oversized,
unknown, stale, duplicate, or wrong-state operations return structured refusal envelopes with recovery
instructions.

### Deliberately unavailable

There is no `confirm_release` tool. The final release control exists only in the page's human UI.
A tool may request or stage a release, but it cannot press the confirmation control.

## Information boundary

| Capability | Agent can see | Page / human keeps |
| --- | --- | --- |
| Recognition | Question text, rubric labels, answer IDs, aliases, and untrusted answer text | — |
| Arithmetic | Safe counts and current revision | Point values, totals, pass boundary, and distance from the boundary |
| Escalation | Whether human attention is needed and selected safe reasons | Near-boundary identities and the full hold decision |
| Release | Whether a request is awaiting a person | Release set, final confirmation, and irreversible authority |

The page and the agent panel are projections of the same session, but they are not the same payload.
The page owns the information that determines the outcome.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React `19.2.8` with TypeScript |
| Build | Vite `7.3.6` |
| Language/runtime | TypeScript `5.9.3`; Node `>=22.6.0` |
| Package manager | pnpm `11.14.0`; standalone `pnpm-lock.yaml` included |
| WebMCP | Native `document.modelContext.registerTool`, with deprecated navigator fallback |
| Styling | Plain CSS; no UI framework, webfont, or remote stylesheet |
| Tests | Node built-in test runner, React static-render checks, contract/boundary tests |
| Browser probes | Chromium DevTools Protocol harnesses for browser and native WebMCP paths |
| Deployment | Static GitHub Pages artifact; production CSP is injected as a meta tag |

Node `26.4.0` is the environment used for the current local verification. Node 22 and GitHub Actions
CI have not been independently verified.

## Repository map

```text
submissions/withheld/
├── README.md                         product overview and operating instructions
├── LICENSE                           MIT license
├── SECURITY.md                       threat model and security limitations
├── package.json                      scripts, versions, and engines
├── pnpm-lock.yaml                    standalone dependency lockfile
├── index.html                        application shell
├── vite.config.ts                    Vite config and production CSP
├── src/
│   ├── App.tsx                       session composition and human actions
│   ├── main.tsx                      React entry point and ErrorBoundary
│   ├── data/fixtures.ts              synthetic rubric, answers, and demo findings
│   ├── domain/
│   │   ├── marks.ts                  page-owned arithmetic and rubric redaction
│   │   ├── session.ts                holds, revisions, receipts, and release authority
│   │   └── views.ts                  teacher and agent projections
│   ├── tools/
│   │   ├── agent-boundary.ts          numeric/text leak guard
│   │   └── webmcp.ts                 schemas, validation, registration, and tool handlers
│   └── ui/                           queue, policy rail, agent panel, audit, and release UI
├── tests/                            unit, contract, boundary, render, style, and contrast suites
├── scripts/
│   ├── browser-session.mjs           browser layout, accessibility, CSP, and interaction probe
│   ├── webmcp-invoke.mjs             native WebMCP registry and dispatch probe
│   ├── failure-recovery.mjs           deterministic refusal/recovery journey
│   └── evidence-meta.mjs             source/build provenance and artifact metadata
└── docs/
    ├── ARCHITECTURE.md               state and trust-boundary explanation
    ├── DECISIONS.md                  dated design decisions
    ├── E4-REQUIREMENTS.md            internal evidence gate
    ├── GATE-P2.md / GATE-W1.md       impact and information-boundary protocols
    ├── PREFLIGHT.md                  submission requirement checklist
    ├── PROGRESS.md                   evidence ledger
    ├── RUNBOOK.md / TESTING.md       reproducible test and browser procedures
    ├── SUBMISSION-TEXT.md            draft Devpost copy
    └── evidence/                     reports, screenshots, hashes, and blocked-run artifacts
```

The local working tree also contains internal audit notes and visual references under `docs/` that
are not needed to run the application. They are intentionally excluded from the public release
snapshot; this README documents the runnable package and its limitations.

## Quick start

Requirements: Node `>=22.6.0` and pnpm `11.14.0`.

```sh
cd submissions/withheld
pnpm install
pnpm dev
```

Open the development URL printed by Vite. For a production build and the local verification suite:

```sh
pnpm build
pnpm test
pnpm typecheck
pnpm browser
pnpm webmcp
node --experimental-strip-types scripts/failure-recovery.mjs
```

Run `pnpm build` before the browser probes. `pnpm dev` is for development and does not inject the
production CSP. To inspect the built artifact manually, run `pnpm preview` in a separate terminal
after `pnpm build`; the preview server stays in the foreground.

## WebMCP testing

WebMCP requires a supported Chromium build and the WebMCP testing flag:

1. Use Chrome 149 or newer.
2. Enable `chrome://flags/#enable-webmcp-testing`.
3. Restart Chrome.
4. Open the staging URL or a local `vite preview` URL.
5. Inspect `document.modelContext` in the console.

The local scripts are deterministic transport checks. They choose tool names and arguments themselves,
so they must not be described as natural-language model replay.

For a hosted smoke run from a clean checkout:

```sh
pnpm build
node scripts/browser-session.mjs --url https://androlay.github.io/withheld/ --port 9623
node scripts/webmcp-invoke.mjs --url https://androlay.github.io/withheld/ --port 9634
```

## Verification snapshot

The latest available verification is split by evidence class:

| Evidence | Result | Classification |
| --- | --- | --- |
| Node test runner | 125/125 test cases across 9 files | `VERIFIED_RUN` on Node 26.4.0 |
| Typecheck | Passed | `VERIFIED_RUN` |
| Production build | 49 modules; JS 260.98 kB raw / 81.16 kB gzip | `VERIFIED_RUN` |
| Local browser harness | 44/44 checks | `VERIFIED_ARTIFACT`; flagged Chrome 151 |
| Local native WebMCP dispatch | 19/19 checks; exactly 9 registered tools | `VERIFIED_ARTIFACT`; deterministic CDP |
| Local failure/recovery | 27/27 checks | `VERIFIED_ARTIFACT`; deterministic CDP |
| Hosted staging smoke | 44/44 browser and 19/19 native checks | `VERIFIED_ARTIFACT`; hosted deterministic CDP, not a model |
| Natural-language model replay | Not run | `UNKNOWN` / `ENVIRONMENT_BLOCKED` |
| GATE-P2 | Not run | `UNKNOWN` |
| Manual screen reader/device review | Not run | `ENVIRONMENT_BLOCKED` |
| Controlled performance baseline | Not run | `UNKNOWN` |
| E4 | **Not achieved** | External evidence and human gates remain open |

The evidence reports are bound to the tested application commit and source/build hashes recorded
inside them. The browser/CDP artifacts are deterministic observations, not model replay; regenerate
them whenever source or harness behavior changes. Do not combine local/CDP, hosted, model, and
human-validation evidence into one claim.

## Scope and limitations

- This is a privacy-first prototype for a controlled marking workflow, not a classroom production
  system.
- There is no backend, account system, persistence, multi-user synchronization, or real student data.
- A refresh starts a new in-memory fixture session.
- The agent can propose recognition, but it cannot compute marks or confirm release.
- Prompt-injection detection is a quarantine router, not a general solution to model behavior.
- Automated accessibility-tree and contrast checks do not replace a screen-reader review.
- No real marker has validated the problem or measured time saved.
- The staging URL is not a final submission claim until the remaining gates, video, and Devpost entry
  are complete.

## License

MIT. See [LICENSE](LICENSE).
