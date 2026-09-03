# Withheld evidence inventory

Snapshot: 2026-09-02, after the local verification run recorded in
[`evidence/verification-log.md`](evidence/verification-log.md). The Withheld target is clean after
the evidence refresh and documentation-only sync; the tested source/build candidate is `8a228b8`.
The root checkout still contains unrelated work outside this target, and no public/final release
commit exists.
This inventory classifies what is known; it does not turn a local result into hosted, model,
CI, or user evidence.

| Evidence class | What is currently supported | Source of record | Interpretation |
| --- | --- | --- | --- |
| `VERIFIED_SOURCE` | Nine tools; closed schemas and bounds; page-owned arithmetic, hold state, revision checks, receipts, standalone package lockfile, and no `confirm_release` registration | `src/domain/`, `src/tools/webmcp.ts`, `src/ui/`, `tests/`, `package.json`, `pnpm-lock.yaml` | Checked against the current package source. This is implementation evidence, not proof of a hosted run. |
| `VERIFIED_RUN` | Package test suite via Node: 9/9 files and 125 assertions; typecheck; production build; browser and Node script syntax checks | `evidence/verification-log.md` | The direct test/type/build commands completed with exit code 0 in the recorded Node 26 local environment; the pnpm wrapper was separately blocked by the workspace SQLite store. |
| `VERIFIED_ARTIFACT` | 44 browser checks, 19 native WebMCP dispatch checks, nine-tool registry, and 27-check failure/recovery trace; screenshots and hashes are present | `evidence/browser-session.json`, `evidence/webmcp-invocation.json`, `evidence/native-registry.json`, `evidence/failure-recovery.json` | These are current local production-build artifacts using synthetic alias-only fixtures. They are bound to source commit `8a228b8` and source/build hashes; they are not hosted or model evidence. |
| `HISTORICAL_LOCAL` | Older counts and runs such as 37 browser checks, 17 registry checks, and 110/123 test-era observations | Annotated historical sections in `docs/DECISIONS.md` and `docs/DEEP-AUDIT.md` | Retained for provenance only. They are not current proof and must not be quoted as current metrics. |
| `SELF_REPORTED` | Design intent, eligibility assertions, impact hypothesis, and prior internal judging estimates | `README.md`, `SECURITY.md`, `docs/UPGRADE-PLAN.md`, `docs/SUBMISSION-TEXT.md` | Useful context, but not independent validation. Synthetic fixtures are explicitly not real-user data. |
| `UNKNOWN` | Model-selected natural-language replay, GATE-P2, public repository, final commit, final manifest, public video, and measurable impact | `evidence/natural-language-replay-blocked.json`, `evidence/gate-p2-not-run.json`, `docs/PREFLIGHT.md` | No valid observation exists in this task. No pass claim is made. |
| `ENVIRONMENT_BLOCKED` | Hosted HTTPS browser/native runs, Node 22/CI, manual screen-reader/real-device review, and representative hosted performance run | `evidence/hosted-browser-session.json`, `evidence/hosted-webmcp-invocation.json`, `evidence/accessibility-manual-not-run.json`, `evidence/performance-probe-not-run.json` | Required access or environment is unavailable or outside the explicit authorization. Each artifact contains a rerun protocol. |

## Claim reconciliation

The current local numbers are intentionally narrow:

- 129 test assertions across 9 files;
- 37 of 44 browser checks, with the seven the script has outgrown named in `docs/RUNBOOK.md`;
- 17/17 checks in the two-view redaction sweep (`pnpm agent-view`);
- 19/19 native WebMCP dispatch checks;
- 27/27 checks in the deterministic failure/recovery journey;
- 50 production modules, with the build hash recorded in the evidence package.

The native dispatch client is a deterministic CDP/WebMCP harness. It is not a model replay.
The browser URL is local, not hosted. No final `manifest.json` is present because its required
external values are not known.

## Reconciliation rule

When a document and an artifact disagree, the current artifact and its command log win only for
the scope it actually ran. A local artifact cannot close a hosted, public-repository, model,
non-builder, hardware, CI, or video gate. Any future final manifest must be generated only after
the final commit and hosted run are fixed, then re-hash the source, build, screenshots, and JSON.
