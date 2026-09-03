# Withheld

**A marking workspace that hands a browser agent everything it needs to read a class of short
answers, and nothing it needs to decide one.**

![license MIT](https://img.shields.io/badge/license-MIT-09090b?style=flat-square)
![React 19.2.8](https://img.shields.io/badge/React-19.2.8-09090b?style=flat-square)
![TypeScript 5.9.3](https://img.shields.io/badge/TypeScript-5.9.3-09090b?style=flat-square)
![Vite 7.3.6](https://img.shields.io/badge/Vite-7.3.6-09090b?style=flat-square)
![Node >=22.6](https://img.shields.io/badge/Node-%E2%89%A522.6-09090b?style=flat-square)
![WebMCP 9 tools](https://img.shields.io/badge/WebMCP-9%20tools%20%C2%B7%206%20read%20%2F%203%20write-09090b?style=flat-square)
![local tests 125 passing](https://img.shields.io/badge/local%20tests-125%20passing-09090b?style=flat-square)
![status unpublished](https://img.shields.io/badge/status-unpublished%20prototype-6b6b73?style=flat-square)

![Withheld mid-session: the marking queue in the middle column, the agent's contract on the right, and the human-only release control in the foot](docs/images/hero-1440.png)

<sub>Captured from `dist/` in headless Chromium 151, 2026-09-02. Thirteen answers marked, five held
for a person, nothing staged. No agent was connected — the right column says so.</sub>

> Agent brings language. The page keeps arithmetic and authority.

---

## What it does

Fourteen synthetic short answers, one four-line rubric, one browser agent. The agent reads answers
and reports which rubric ideas it recognises, by id. The page does everything with a consequence: it
owns the point values and the pass mark, computes every total, decides which answers a person must
look at, records a receipt for each write, and stages a release. Sending a mark to a student is a
click made by a person — there is no tool for it, and dispatching the name of one fails.

- **The agent never receives a number that decides anything.** No point values, no totals, no pass
  boundary, no distance from it. Its whole vocabulary is *"I recognised these rubric line ids in this
  answer."*
- **Five of the fourteen answers are held for a person.** Two of the holds are named to the agent and
  three are not, because those three sit on the pass boundary. The agent is told how many it cannot
  see, never which, and never which side — the hold test is `|total − boundary| ≤ band`, so it is
  symmetric.
- **An answer that instructs the marker to ignore the rubric is quarantined with no mark at all.**
  A prompt injection costs the student their mark rather than earning one, because no argument
  anywhere in the tool surface carries points.

## Try it in two minutes

Requirements: Node `>=22.6.0`, pnpm `11.14.0`. No account, no key, no backend to start.

```sh
cd submissions/withheld
pnpm install
pnpm dev
```

In the page: press **Mark all from the worked example** at the foot of the queue, then read the middle
column against the right one — the totals and the pass mark are in the middle, and the payload boxes
on the right show they are not in what any tool returns. Raise **Care level** in the left rail and
watch more answers get held, not fewer. Finish with **Stage release** and the send control beside it.

The page works with no agent connected at all, and the right column says so on arrival.

For the production artifact and the whole local verification suite:

```sh
pnpm build      # tsc -b && vite build — 50 modules, 267.37 kB JS (83.20 kB gzip), 30.49 kB CSS
pnpm test       # 9 test files
pnpm typecheck
pnpm browser    # 43 checks in headless Chromium against dist/ — all pass
pnpm agent-view # 17 checks: the agent's view, swept for the figures the page owns
pnpm webmcp     # 19 checks through Chromium's own WebMCP DevTools domain
node --experimental-strip-types scripts/failure-recovery.mjs   # 27 refusal/recovery checks
```

`pnpm dev` does not inject the production Content-Security-Policy, so run `pnpm build` before the
browser probes. `pnpm preview` serves the built artifact and stays in the foreground.

## Calling the tools from a browser

WebMCP needs a recent Chromium and the testing flag:

1. Chrome or Chromium **149 or newer**.
2. Enable `chrome://flags/#enable-webmcp-testing`.
3. Relaunch the browser.
4. Open the `pnpm preview` URL.
5. In the console: `(await document.modelContext.getTools()).length` → `9`.

The scripts in `scripts/` are deterministic transport checks. They choose the tool names and the
arguments themselves, so they prove the surface works when called from outside the page — they are
**not** a natural-language model replay, and this README does not claim one.

## The information boundary

| | Agent can see | Page and human keep |
| --- | --- | --- |
| **Recognition** | Question text, rubric line ids and labels, answer ids, aliases, untrusted answer text | — |
| **Arithmetic** | Safe counts, the current revision | Point values, totals, the pass mark, distance from it |
| **Escalation** | That human attention is needed, and the reasons safe to name | Which answers sit near the boundary, and the full hold decision |
| **Release** | That a request is awaiting a person | The release set, the confirmation, and the authority itself |

The page and the agent panel are projections of one session, not one payload. The agent names rubric
line ids; the page maps ids to points. An invented id earns nothing, and a line claimed twice is paid
once.

## The nine tools

Six read, three write. Registered in `src/tools/webmcp.ts` through
`document.modelContext.registerTool`, falling back to `navigator.modelContext` (deprecated in
Chromium 150). The six reads carry `readOnly`; only `read_answer` carries `untrustedContent`, so the
hint means something where it appears.

| Tool | Access | Input | What comes back, and what never does |
| --- | --- | --- | --- |
| `describe_stack` | read | `{}` | The question, the revision, answer ids, aliases, character counts, current states. **Never** a mark, a point value, or the pass mark. |
| `read_rubric` | read | `{}` | Canonical rubric line ids and their recognition labels. **Never** point values or the pass mark — they are removed before serialisation, not hidden in the UI. |
| `read_answer` | read | `{ answerId }` | One answer and its alias, explicitly labelled untrusted content. It is student text, not an instruction. |
| `list_held_answers` | read | `{}` | How many answers are held, and the reasons that are safe to name. **Never** the ids of near-boundary holds. |
| `explain_mark` | read | `{ answerId }` | Which rubric ideas were credited and which were missed, by id and label. **Never** a total, a distance, or pass/fail. |
| `preview_unattended_outcome` | read | `{}` | How much of the stack still needs a person. Counts only; **never** a per-answer outcome. |
| `propose_marks` | write | `{ findings, expectedRevision, operationId }` | Bounded recognition findings; the page computes marks and holds atomically and returns a receipt. |
| `set_marking_emphasis` | write | `{ emphasis, expectedRevision, operationId }` | Raises the page's caution level. It only ratchets — lowering, stale and duplicate writes are refused. |
| `request_release` | write | `{ expectedRevision, operationId }` | Stages the releasable set and returns `awaitingHuman`. It cannot release, and there is no follow-up tool that can. |

### Deliberately unavailable

There is no `confirm_release` tool. Sending a mark is a human act by *absence* rather than by
permission, and the browser confirms the absence: dispatching that name over the WebMCP DevTools
domain comes back **Tool not found**. A tool may stage a release; nothing but a person can press the
control that sends it.

## How the guards hold

- **Every write quotes the revision it read.** A call built from a stale read is refused
  `stale-revision` rather than applied to a session that has moved.
- **Every write carries a single-use `operationId`.** A retry of an accepted operation is refused
  `duplicate-operation` without a second receipt, a second revision, or a second effect. At-most-once
  for an in-memory fixture, not durable idempotency — a refresh deliberately starts a new session.
- **One function builds every result, success and refusal alike.** `reply()` runs a fail-closed
  guard: numbers are permitted only at explicitly listed paths and anything else throws, then a second
  pass scans generated prose for the live page-owned values in case one escaped as text.
- **Closed schemas, bounded arrays and bounded ids.** Unknown, oversized, invalid, stale, duplicate
  and wrong-state calls all return a structured refusal envelope with recovery instructions, and no
  refusal carries a digit.
- **The production build ships a nine-directive CSP with no `'unsafe-inline'`**, injected as a meta
  tag, which is why every proportional bar on the page is a stylesheet class rather than an inline
  width. The browser harness proves it is enforced, not merely present.

## Verification

Measured on this machine against the current build, on Node `26.4.0` and Chromium `151`.

| Evidence | Result | Class |
| --- | --- | --- |
| Node test runner | 9 / 9 files pass | `VERIFIED_RUN` |
| Typecheck | passes, no output | `VERIFIED_RUN` |
| Production build | 50 modules; 267.37 kB JS (83.20 kB gzip), 30.49 kB CSS | `VERIFIED_RUN` |
| Hosted browser harness | 43 / 43 — enforced CSP, focus, tab order, clean console, contrast, accessibility-tree, human release path, keyboard, responsive layout, and origin checks on the public Pages URL | `VERIFIED_ARTIFACT` |
| The agent's view, swept in a browser | 17 / 17 — none of the thirteen figures the page owns appears in its `innerText` or anywhere in its DOM, at 1440px and 420px, against 143 elements carrying them in the teacher's view of the same session | `VERIFIED_ARTIFACT` |
| Native WebMCP dispatch | 19 / 19 — all nine tools called from outside the page, plus the injection, the duplicate-operation retry, the stale-revision and unknown-rubric-line refusals, and `confirm_release` coming back *Tool not found* | `VERIFIED_ARTIFACT`, deterministic CDP |
| Failure and recovery journey | 27 / 27 | `VERIFIED_ARTIFACT`, deterministic CDP |
| Hosted browser/native WebMCP | 43 / 43 browser checks and 19 / 19 native dispatch checks on the public Pages URL | `VERIFIED_ARTIFACT` |
| Natural-language model replay | not run | `UNKNOWN` |
| Independent user validation | not run — the protocol is written and waiting in `docs/GATE-P2.md` | `UNKNOWN` |
| Screen reader and real-device review | not run | `ENVIRONMENT_BLOCKED` |
| Controlled performance baseline | not run | `UNKNOWN` |

Do not combine those classes. A deterministic CDP run is engineering proof; the hosted runs are
delivery and hosted-transport proof; a model choosing a tool by itself would be something neither
of them shows. The reports in `docs/evidence/` are bound to source and build hashes. The hosted
reports identify the public URL and the source/build pair used for the Pages artifact.

## On a phone

<img src="docs/images/phone-420.png" alt="Withheld at 420px: the three columns become one, and the human-authority foot stays pinned above the release control" width="320">

One breakpoint, at `62rem`. Below it the three columns become one, the agent contract collapses into a
closed panel — 110px shut, 2480px open, with none of its nine tool rows visible until it is opened —
and the foot that names human authority stays pinned. Measured at 420px in the harness: nothing
overflows sideways, and the panel arrives closed rather than dumping a thousand words between the
stack and the gate.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React `19.2.8`, TypeScript `5.9.3` |
| Build | Vite `7.3.6`; production CSP injected as a meta tag |
| Runtime | Node `>=22.6.0`, pnpm `11.14.0`, standalone `pnpm-lock.yaml` |
| WebMCP | native `document.modelContext.registerTool`, `navigator.modelContext` fallback |
| Styling | plain CSS, monochrome; no UI framework, no webfont, no remote stylesheet |
| State | in-memory session; no backend, database, login, persistence, or analytics |
| Tests | Node's own test runner; unit, contract, boundary, render, style and contrast suites |
| Probes | hand-written Chromium DevTools Protocol harnesses |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server. Does **not** inject the production CSP. |
| `pnpm build` | `tsc -b && vite build` into `dist/` |
| `pnpm preview` | serves the built artifact, stays in the foreground |
| `pnpm test` | 129 tests across 9 files |
| `pnpm typecheck` | `tsc -b --pretty false` |
| `pnpm browser` | 43-check browser session against `dist/` — all pass; writes `docs/evidence/browser-session.json` and four screenshots |
| `pnpm agent-view` | 17-check sweep of both views against `dist/`; prints its report and exits non-zero on any failure |
| `pnpm webmcp` | 19-check native WebMCP registry and dispatch run; writes `docs/evidence/webmcp-invocation.json` and `native-registry.json` |
| `node --experimental-strip-types scripts/failure-recovery.mjs` | 27-check refusal and recovery journey |

`pnpm browser`, `pnpm agent-view` and `pnpm webmcp` accept `--url` to run against a server that is
already up, `--browser` to name a binary, and `--port` to move the debugging port.

<details>
<summary><strong>Repository map</strong></summary>

```text
submissions/withheld/
├── index.html                        application shell
├── vite.config.ts                    build config and the production CSP
├── src/
│   ├── main.tsx                      entry point and error boundary
│   ├── App.tsx                       session composition and the human actions
│   ├── styles.css                    the whole stylesheet; no inline styles anywhere
│   ├── data/fixtures.ts              synthetic rubric, fourteen answers, worked example
│   ├── domain/
│   │   ├── marks.ts                  page-owned arithmetic and rubric redaction
│   │   ├── session.ts                holds, revisions, receipts, release authority
│   │   └── views.ts                  the teacher projection and the agent projection
│   ├── tools/
│   │   ├── webmcp.ts                 schemas, validation, registration, handlers
│   │   └── agent-boundary.ts         the fail-closed numeric and text guard
│   └── ui/                           top bar, queue, policy rail, agent panel, audit, release
├── tests/                            nine suites: unit, contract, boundary, render, style, contrast
├── scripts/
│   ├── browser-session.mjs           layout, CSP, focus, contrast and accessibility probe
│   ├── webmcp-invoke.mjs             native registry and dispatch probe
│   ├── failure-recovery.mjs          refusal and recovery journey
│   └── evidence-meta.mjs             source and build provenance, shared by the three above
├── docs/                             see docs/README.md; evidence/ holds the artifacts
├── LICENSE                           MIT
└── SECURITY.md                       threat model, and what a header-less static host cannot enforce
```

</details>

## Documentation

[`docs/README.md`](docs/README.md) routes the rest, one document per question:
[ARCHITECTURE](docs/ARCHITECTURE.md) for how it is built,
[DECISIONS](docs/DECISIONS.md) for why — thirty numbered, dated entries,
[TESTING](docs/TESTING.md) for what the checks do and do not prove,
[GATE-W1](docs/GATE-W1.md) for whether an agent could derive the points or the boundary,
[PROGRESS](docs/PROGRESS.md) for what is verified and what is waiting on a person, and
[PREFLIGHT](docs/PREFLIGHT.md) for the submission requirements with an owner against each gap.

## Scope and limits

- A privacy-first prototype for a controlled marking workflow, not a classroom production system.
- No backend, no accounts, no persistence, no multi-user sync, no real student data. A refresh starts
  a new in-memory session, deliberately.
- The rubric, the fourteen answers and the worked example are synthetic. They exist to exercise clean,
  ambiguous, long, boundary and marker-directed answers — they are not a dataset and not a measurement
  of anything.
- Prompt-injection handling is a quarantine router, not a general solution to model behaviour.
- Computed contrast and a read accessibility tree are instruments, not a review. No screen reader has
  been run, and no person other than the author has read the page.
- The 420px layout is measured in a headless browser, not on a phone. Nothing has run on macOS, iOS,
  Safari, or in ChatGPT's in-app browser.
- No natural-language model has chosen a tool here. The nine were dispatched by a DevTools client
  through Chromium's `WebMCP` domain — the surface working from outside, not an agent replay.
- A confirmed release is final by design and is the one thing on the page that cannot be taken back
  (`docs/DECISIONS.md` D-23).

## Status

The current Withheld build is published for review. The source is on GitHub and the static build is
served by GitHub Pages; Devpost entry, public demo video, model-selected replay, and independent
learner validation remain open.

| | |
| --- | --- |
| Public repository | [AndroLay/withheld](https://github.com/AndroLay/withheld) — source commit `93eee30` |
| Hosted URL | [androlay.github.io/withheld](https://androlay.github.io/withheld/) — Pages commit `58a3ff4` |
| Data | synthetic, alias-only fixtures; no real student data |
| Runtime | no backend, database, login, persistence, analytics, or outbound request |
| Internal evidence gate (E4) | **not achieved** — hosted browser/native transport is verified; model replay, independent validation, performance, and video remain open |
| License | MIT |

## License

MIT. See [LICENSE](LICENSE).
