# Withheld evidence inventory

Snapshot: 2026-09-03, after the verification run recorded in
[`evidence/verification-log.md`](evidence/verification-log.md). Eight run artefacts share one
build tree `84eee099…`, and that is the build the live URL serves. Seven of them also share source tree
`b924a27a…`; the exception is the local dispatch pair, written before `scripts/` gained the MCP bridge,
its five host configs and the two harnesses, which records source `10fb7f7c…` — the same tree with
nothing under `src/` changed. The two hosted reports were re-taken after the 18:02:45 republish, so they
describe the page a judge opens and this checkout at once.
The root checkout still contains unrelated work outside this target.
This inventory classifies what is known; it does not turn a local result into hosted, model,
CI, or user evidence.

| Evidence class | What is currently supported | Source of record | Interpretation |
| --- | --- | --- | --- |
| `VERIFIED_SOURCE` | Nine tools; closed schemas and bounds; page-owned arithmetic, hold state, revision checks, receipts, standalone package lockfile, and no `confirm_release` registration | `src/domain/`, `src/tools/webmcp.ts`, `src/ui/`, `tests/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, `docs/GATE-W1.md` | Checked against the current package source. This is implementation evidence, not proof of a hosted run. |
| `VERIFIED_RUN` | Package test suite via Node: 9/9 files and 136 assertions; typecheck; production build; `node --check` on `scripts/browser-session.mjs`, `webmcp-invoke.mjs`, `evidence-meta.mjs` and `failure-recovery.mjs` | `evidence/verification-log.md` | The direct test/type/build commands completed with exit code 0 in the recorded Node `v26.4.0` local environment; the pnpm wrapper was separately blocked by the workspace SQLite store. `scripts/` now holds eight `.mjs` files: five have produced an artifact in `evidence/`, `nl-replay.mjs` and `mcp-bridge.mjs` produced two in `evidence-staging/` on 2026-09-04, and no artifact records a run of `native-webmcp-session.mjs`. The nine tools and result shapes quoted in `agent-integration.md` are real wire readings, but they were taken over CDP by the harness that wrote `native-registry.json`, not through the bridge's stdio. |
| `VERIFIED_ARTIFACT` | Locally: 43 browser checks, 19 native WebMCP dispatch checks, a nine-tool registry, a 17-check two-view redaction sweep, a 27-check failure/recovery trace, four screenshots and a checksum sheet. On the live URL: the same browser session at 43/43 at 18:59:34 UTC and the same nine dispatches at 19/19 at 19:06:44 UTC, both on 2026-09-03 and both on the build the site serves | `evidence/browser-session.json`, `evidence/webmcp-invocation.json`, `evidence/native-registry.json`, `evidence/agent-view-sweep.json`, `evidence/failure-recovery.json`, `evidence/hosted-browser-session.json`, `evidence/hosted-webmcp-invocation.json`, `evidence/manifest.json`, `evidence/checksums.txt` | Synthetic alias-only fixtures throughout. All seven bind build `84eee099…` at commit `bb4c82ad`; the two hosted reports read a clean tree, the re-taken local three read dirty because the run before each had just written into `docs/evidence/`. The four screenshots are byte-identical between the local render and the live page. Delivery is proven; none of it is model evidence. |
| `HISTORICAL_LOCAL` | Older counts such as 110, 125 and 129 test-era assertions, and the 37-of-44 browser run at 05:51 UTC on the same day | Annotated historical sections in `docs/DECISIONS.md`, `docs/DEEP-AUDIT.md`, and `docs/RUNBOOK.md` | Retained for provenance only. Contrast them with the current 136 assertions and 43 of 43 browser checks; the older figures must not be quoted as current metrics. |
| `SELF_REPORTED` | Design intent, eligibility assertions, impact hypothesis, and prior internal judging estimates | `README.md`, `SECURITY.md`, `docs/UPGRADE-PLAN.md`, `docs/SUBMISSION-TEXT.md` | Useful context, but not independent validation. Synthetic fixtures are explicitly not real-user data. |
| `UNKNOWN` | Native third-party WebMCP host discovery, and measurable impact | `evidence/natural-language-replay-blocked.json`, `docs/PREFLIGHT.md` | No valid observation exists in this task. No pass claim is made. The public repository, the release commit and the final manifest left this row on 2026-09-03: `AndroLay/withheld` reads back `main` at `7e404d36` and `gh-pages` at `15baf8f0` without credentials, and `evidence/manifest.json` is written from the runs. Model-selected replay left this row on 2026-09-04 — `docs/MODEL-REPLAY.md`, artifacts `evidence-staging/nl-replay.json` and `nl-replay-hosted.json`, both `VERIFIED_RUN`, local and hosted — but the tools reached the model through our own bridge; no third-party host has discovered the page, and `native-webmcp-session.mjs` is still unrun. The blocked artifact is retained unchanged as the record of the state before those runs. |
| `NOT_RUN` | GATE-P2 non-builder validation, the demo video, and a controlled performance baseline | `evidence/gate-p2-not-run.json`, `docs/VIDEO-SCRIPT.md`, `evidence/performance-probe-not-run.json` | Possible in this environment and not performed. The instrument exists in each case and is named; what is missing is a participant, a recording, or a measurement session. GATE-P2 was additionally **withdrawn as a blocking gate on 2026-09-04** — two documents replaced it, `docs/GATE-P2-SIMULATION.md` (the human half, class `INFERENCE`) and `docs/MULTI-AGENT-SIMULATION.md` (the workflow half, class `SIMULATED_RUN`, 20/20). `evidence/gate-p2-not-run.json` still records `"status": "NOT_RUN"`, which is the truth: retiring a gate is not running it. |
| `ENVIRONMENT_BLOCKED` | Node 22/CI, manual screen-reader / real-device review, and the local dispatch re-take on the frozen source | `evidence/verification-log.md`, `evidence/accessibility-manual-not-run.json`, `evidence/local-dispatch-retake-2026-09-03.json` | Required access, hardware or person is unavailable. Each carries a rerun protocol and the exact command or condition the owner needs. The two hosted rows left this class on 2026-09-03; the dispatch re-take entered it the same evening, blocked by a force-installed browser extension on this machine rather than by anything in the page. |

## Claim reconciliation

The current local numbers are intentionally narrow:

- 136 test assertions across 9 files;
- 43 of 43 browser checks in the current artefact; the 37-of-44 figure, and the seven checks named in
  `docs/RUNBOOK.md` as ones the script had outgrown, are from the earlier run that day;
- 17/17 checks in the two-view redaction sweep (`node --run agent-view` →
  `scripts/agent-view.mjs`, `evidence/agent-view-sweep.json`);
- 19/19 native WebMCP dispatch checks;
- 27/27 checks in the deterministic failure/recovery journey;
- 50 production modules, with the build hash recorded in the evidence package.

The native dispatch client is a deterministic CDP/WebMCP harness. It is not a model replay.
Two of those harnesses have also been run against the live URL — `https://androlay.github.io/withheld/`,
43/43 at 18:59:34 and 19/19 at 19:06:44 UTC on 2026-09-03, both after the republish — so the browser
evidence is both local and hosted, on one build;
`evidence/manifest.json` is written from the runs in the evidence directory and binds the hosted URL,
the published refs, one build pair, every run, the four screenshot hashes and the
gates that remain open. `evidence/manifest.template.json` stays as the empty form.

## External target reconciliation — 2026-09-04

An external audit register describes this package's release binding as stale or partial. Five of its
Withheld rows no longer match the artifacts, and one gap it does not name is real. Recorded here rather
than argued in prose elsewhere:

| External row | Verified state in this package |
| --- | --- |
| "the final hosted binding is still stale/partial" | Closed. `evidence/manifest.json` records `liveUrlParity.state` as "no lag", closed at 18:02:45Z when `gh-pages` moved `58a3ff4` → `15baf8f0`, and re-checked at 19:25:19Z |
| "the published build and the current working tree have diverged" | They have not. `hostedBuildIdentity` fetched all three served files unauthenticated and hashed them against `dist/`: index.html 988 bytes, the CSS 31,862, the JS 269,076, all three identical |
| "the manifest retains earlier run and dirty/lag metadata, so the URL is a partial hosted proof" | The ~7-hour gap is kept as `liveUrlParity.history`, marked closed, rather than deleted. `treeState.hostedPair` reads false for both hosted runs; every remaining true flag is `docs/evidence/` only, which is in neither tree hash |
| gate "clean final source/build binding: HOLD, manifest has dirty/lag limitations" | One release: source `b924a27a…`, build `84eee099…`, `gh-pages 15baf8f0`, public main `7e404d3`, nine tools, 27 of 27 checksum paths verifying |
| a ledger of "46 of 46 OK", attributed to both projects at once | Not this package's figure. `docs/evidence/checksums.txt` holds **27** entries — 24 evidence paths plus the three `dist/` files — and `sha256sum -c` prints 27 OK. 46 belongs to the other submission's sheet. Anything pasted into the form or a judge-facing note must say 27 for Withheld |

The gap the external register misses: the public mirror's `main` is at `7e404d3`, and the documentation
commits made after it are local to the monorepo and unpushed. That is the owner's decision and does not
touch the served bytes, because `docs/` is in neither tree hash — but until it is pushed, the mirror's
documentation is behind this checkout while its build is not.

Reconfirmed for this reconciliation rather than quoted: `node --run test` reported 136 pass, 0 fail on
Node v26.4.0. The Node 22 and CI gate stays `ENVIRONMENT_BLOCKED`; nothing here closes it. Model replay
and the video also stay exactly where they were. GATE-P2 moved on 2026-09-04, but not upward: it was
withdrawn without being run, and `docs/GATE-P2-SIMULATION.md` is `INFERENCE`, not a class change.

## Reconciliation rule

When a document and an artifact disagree, the current artifact and its command log win only for
the scope it actually ran. A local artifact cannot close a hosted, public-repository, model,
non-builder, hardware, CI, or video gate. Any future final manifest must be generated only after
the final commit and hosted run are fixed, then re-hash the source, build, screenshots, and JSON.
