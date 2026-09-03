# Withheld evidence inventory

Snapshot: 2026-09-03, after the hosted verification run recorded in
[`evidence/verification-log.md`](evidence/verification-log.md). The Withheld target is clean after
the evidence refresh and publication; the tested source commit is `93eee30` and the Pages artifact is
`58a3ff4`. The root checkout still contains unrelated work outside this target. This inventory
classifies what is known; it does not turn a hosted transport run into model, CI, or user evidence.

| Evidence class | What is currently supported | Source of record | Interpretation |
| --- | --- | --- | --- |
| `VERIFIED_SOURCE` | Nine tools; closed schemas and bounds; page-owned arithmetic, hold state, revision checks, receipts, standalone package lockfile, and no `confirm_release` registration | `src/domain/`, `src/tools/webmcp.ts`, `src/ui/`, `tests/`, `package.json`, `pnpm-lock.yaml` | Checked against the current package source. This is implementation evidence, not proof of a hosted run. |
| `VERIFIED_RUN` | Package test suite via Node: 9/9 files and 125 assertions; typecheck; production build; browser and Node script syntax checks | `evidence/verification-log.md` | The direct test/type/build commands completed with exit code 0 in the recorded Node 26 local environment; the pnpm wrapper was separately blocked by the workspace SQLite store. |
| `VERIFIED_ARTIFACT` | 43 hosted browser checks, 19 hosted native WebMCP dispatch checks, nine-tool registry, 17 local agent-view checks, and 27 local failure/recovery checks; screenshots and hashes are present | `evidence/hosted-browser-session.json`, `evidence/hosted-webmcp-invocation.json`, `evidence/native-registry.json`, `evidence/agent-view-sweep.json`, `evidence/failure-recovery.json` | Hosted artifacts use the published Pages URL and source commit `93eee30`; local artifacts are clearly scoped as local. All fixtures are synthetic alias-only data. |
| `HISTORICAL_LOCAL` | Older counts and runs such as 37 browser checks, 17 registry checks, and 110/123 test-era observations | Annotated historical sections in `docs/DECISIONS.md` and `docs/DEEP-AUDIT.md` | Retained for provenance only. They are not current proof and must not be quoted as current metrics. |
| `SELF_REPORTED` | Design intent, eligibility assertions, impact hypothesis, and prior internal judging estimates | `README.md`, `SECURITY.md`, `docs/UPGRADE-PLAN.md`, `docs/SUBMISSION-TEXT.md` | Useful context, but not independent validation. Synthetic fixtures are explicitly not real-user data. |
| `UNKNOWN` | Model-selected natural-language replay, GATE-P2, final manifest, public video, and measurable impact | `evidence/natural-language-replay-blocked.json`, `evidence/gate-p2-not-run.json`, `docs/PREFLIGHT.md` | No valid observation exists in this task. No pass claim is made. |
| `ENVIRONMENT_BLOCKED` | Node 22/CI, manual screen-reader/real-device review, and representative hosted performance run | `evidence/accessibility-manual-not-run.json`, `evidence/performance-probe-not-run.json` | Required environment is unavailable. Each artifact contains a rerun protocol. |

## Claim reconciliation

The current local numbers are intentionally narrow:

- 9 test files pass;
- 43 of 43 hosted browser checks;
- 17/17 checks in the two-view redaction sweep (`pnpm agent-view`);
- 19/19 native WebMCP dispatch checks;
- 27/27 checks in the deterministic failure/recovery journey;
- 50 production modules, with the build hash recorded in the evidence package.

The native dispatch client is a deterministic CDP/WebMCP harness. It is not a model replay. The
hosted URL is verified, but no final `manifest.json` is present because model, user-validation,
video, and other entrant-specific values are not known.

## Reconciliation rule

When a document and an artifact disagree, the current artifact and its command log win only for
the scope it actually ran. A local artifact cannot close a hosted, public-repository, model,
non-builder, hardware, CI, or video gate. Any future final manifest must be generated only after
the final commit and hosted run are fixed, then re-hash the source, build, screenshots, and JSON.
