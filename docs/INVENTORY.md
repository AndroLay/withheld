# Withheld evidence inventory

Snapshot: 2026-09-03, after the local verification run recorded in
[`evidence/verification-log.md`](evidence/verification-log.md). The five run artefacts share one
build — source tree `10fb7f7c…`, build tree `84eee099…` — taken from `df9608c4` with a dirty working
tree, so they describe the checkout you are reading rather than a predecessor of it. The two hosted
reports do not share that build: they describe source `09974722…` / build `3700f7c5…`, which is what
the live URL serves until the owner republishes.
The root checkout still contains unrelated work outside this target, and no public/final release
commit exists.
This inventory classifies what is known; it does not turn a local result into hosted, model,
CI, or user evidence.

| Evidence class | What is currently supported | Source of record | Interpretation |
| --- | --- | --- | --- |
| `VERIFIED_SOURCE` | Nine tools; closed schemas and bounds; page-owned arithmetic, hold state, revision checks, receipts, standalone package lockfile, and no `confirm_release` registration | `src/domain/`, `src/tools/webmcp.ts`, `src/ui/`, `tests/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, `docs/GATE-W1.md` | Checked against the current package source. This is implementation evidence, not proof of a hosted run. |
| `VERIFIED_RUN` | Package test suite via Node: 9/9 files and 136 assertions; typecheck; production build; `node --check` on four of the five harness scripts | `evidence/verification-log.md` | The direct test/type/build commands completed with exit code 0 in the recorded Node `v26.4.0` local environment; the pnpm wrapper was separately blocked by the workspace SQLite store. |
| `VERIFIED_ARTIFACT` | Locally: 43 browser checks, 19 native WebMCP dispatch checks, a nine-tool registry, a 17-check two-view redaction sweep, a 27-check failure/recovery trace, four screenshots and a checksum sheet. On the live URL: the same browser session at 43/43 and the same nine dispatches at 19/19, on 2026-09-03 at 07:44 UTC | `evidence/browser-session.json`, `evidence/webmcp-invocation.json`, `evidence/native-registry.json`, `evidence/agent-view-sweep.json`, `evidence/failure-recovery.json`, `evidence/hosted-browser-session.json`, `evidence/hosted-webmcp-invocation.json`, `evidence/manifest.json`, `evidence/checksums.txt` | Synthetic alias-only fixtures throughout. The five local artifacts bind to `df9608c4` with a dirty tree; the two hosted ones bind to the published `93eee30`, and all seven share one source/build pair. Delivery is proven; none of it is model evidence. |
| `HISTORICAL_LOCAL` | Older counts such as 110, 125 and 129 test-era assertions, and the 37-of-44 browser run at 05:51 UTC on the same day | Annotated historical sections in `docs/DECISIONS.md`, `docs/DEEP-AUDIT.md`, and `docs/RUNBOOK.md` | Retained for provenance only. Contrast them with the current 136 assertions and 43 of 43 browser checks; the older figures must not be quoted as current metrics. |
| `SELF_REPORTED` | Design intent, eligibility assertions, impact hypothesis, and prior internal judging estimates | `README.md`, `SECURITY.md`, `docs/UPGRADE-PLAN.md`, `docs/SUBMISSION-TEXT.md` | Useful context, but not independent validation. Synthetic fixtures are explicitly not real-user data. |
| `UNKNOWN` | Model-selected natural-language replay, and measurable impact | `evidence/natural-language-replay-blocked.json`, `docs/PREFLIGHT.md` | No valid observation exists in this task. No pass claim is made. The public repository, the final commit and the final manifest left this row on 2026-09-03: `AndroLay/withheld` reads back `main` at `b050f991` and `gh-pages` at `58a3ff42` without credentials, and `evidence/manifest.json` is written. |
| `NOT_RUN` | GATE-P2 non-builder validation, the demo video, and a controlled performance baseline | `evidence/gate-p2-not-run.json`, `docs/VIDEO-SCRIPT.md`, `evidence/performance-probe-not-run.json` | Possible in this environment and not performed. The instrument exists in each case and is named; what is missing is a participant, a recording, or a measurement session. |
| `ENVIRONMENT_BLOCKED` | Node 22/CI, and manual screen-reader / real-device review | `evidence/verification-log.md`, `evidence/accessibility-manual-not-run.json` | Required access, hardware or person is unavailable. Each carries a rerun protocol and the exact command or condition the owner needs. The two hosted rows left this class on 2026-09-03. |

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
43/43 and 19/19 on 2026-09-03 at 07:44 UTC — so the browser evidence is both local and hosted;
`evidence/manifest.json` is now written from the runs in the evidence directory and binds the hosted URL,
the three relevant commit shas, one source/build pair, every run, the four screenshot hashes and the
gates that remain open. `evidence/manifest.template.json` stays as the empty form.

## Reconciliation rule

When a document and an artifact disagree, the current artifact and its command log win only for
the scope it actually ran. A local artifact cannot close a hosted, public-repository, model,
non-builder, hardware, CI, or video gate. Any future final manifest must be generated only after
the final commit and hosted run are fixed, then re-hash the source, build, screenshots, and JSON.
