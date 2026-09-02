# Withheld evidence

This directory contains evidence tied to the current local checkout. Evidence is classified by
what was actually observed:

- `VERIFIED_SOURCE`: a claim checked against source or tests.
- `VERIFIED_RUN`: a command completed with exit code zero.
- `VERIFIED_ARTIFACT`: a generated report or screenshot from that run.
- `HISTORICAL_LOCAL`: an older local observation retained for context only.
- `SELF_REPORTED`: a claim supplied by a person or document, not independently replayed.
- `UNKNOWN`: not established by the available evidence.
- `ENVIRONMENT_BLOCKED`: not run because the required external environment or access was absent.

## Current local artifacts

The following artifacts were generated from the same production build during the 2026-09-02
local run. They use synthetic alias-only fixtures and record source commit `8a228b8` plus source
and build hashes. The target source is now committed, but these are still not a final release
manifest because hosted URL, model, and human-validation gates remain open.

- `browser-session.json`: 44/44 production-browser layout, interaction, CSP, accessibility-tree,
  keyboard, responsive, and console checks in flagged Chrome 151.
- `webmcp-invocation.json`: 19/19 native Chromium WebMCP dispatch checks, including unknown
  rubric-line refusal, stale revision, duplicate operation, injection quarantine, and the missing
  human-only confirmation tool.
- `native-registry.json`: the nine-tool registry observed in that native run.
- `failure-recovery.json`: 27/27 checks in one deterministic CDP journey covering malformed and
  unknown input, oversized batches, stale and duplicate writes, reread/retry, decline, confirm,
  reload, and final state.
- `verification-log.md`: commands, exit codes, environment, hashes, and the explicit non-runs for
  Node 22/CI, hosted targets, model replay, GATE-P2, manual accessibility, and performance.
- `browser-1440-marked.png`, `browser-fold-1487.png`, `browser-1440-staged.png`, and
  `browser-420-staged.png`: screenshots emitted by the browser harness and hash-bound in
  `browser-session.json`.

These local/CDP artifacts are transport and product evidence. They are not model-selected replay,
hosted-URL evidence, user validation, or CI evidence.

## Blocked or not-run artifacts

- `natural-language-replay-blocked.json`: no authorized model/client session was available.
- `hosted-browser-session.json`: required-name blocked artifact; no hosted HTTPS URL exists and
  deployment is outside this task's authorization. `hosted-browser-session-blocked.json` retains
  the same explanation in an explicit filename.
- `hosted-webmcp-invocation.json`: required-name blocked artifact for hosted native dispatch;
  `hosted-webmcp-invocation-blocked.json` retains the same explanation.
- `gate-p2-not-run.json`: no non-builder marker or workflow owner was available.
- `accessibility-manual-not-run.json`: the automated AX tree is recorded, but no independent
  screen-reader or real-device session was available.
- `performance-probe-not-run.json`: no controlled performance baseline on representative hardware
  or hosted infrastructure was established.

Each blocked artifact contains a rerun protocol. None is a substitute for the missing evidence.
There is intentionally no final `manifest.json` while hosted URL, final commit, model replay, and
GATE-P2 remain open; `manifest.template.json` documents the required shape without inventing values.
`checksums.txt` covers the current evidence files, screenshots, and individual production assets.

Do not call the local CDP client a model. Do not call `127.0.0.1` hosted. Do not treat the
synthetic fixtures as real-user validation. Withheld remains `E4 NOT ACHIEVED` until every
required external gate is independently completed.
