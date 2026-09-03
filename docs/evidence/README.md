# Withheld evidence

This directory contains local and hosted runs for the Withheld package. The current hosted
artifacts were captured on 2026-09-03 from `https://androlay.github.io/withheld/` using the build
from source commit `93eee305573cf80c4e52db4bc45331777a71ae65`. The published Pages artifact is
commit `58a3ff42ca17d9fdef6bcad0800ea2244e0884f9`. Every generated report records its own source
and build hashes; those hashes are authoritative for the run it describes. Evidence is classified
by what was actually observed:

- `VERIFIED_SOURCE`: a claim checked against source or tests.
- `VERIFIED_RUN`: a command completed with exit code zero.
- `VERIFIED_ARTIFACT`: a generated report or screenshot from that run.
- `HISTORICAL_LOCAL`: an older local observation retained for context only.
- `SELF_REPORTED`: a claim supplied by a person or document, not independently replayed.
- `UNKNOWN`: not established by the available evidence.
- `ENVIRONMENT_BLOCKED`: not run because the required external environment or access was absent.

## Current hosted artifacts

- `hosted-browser-session.json`: 43/43 checks on the public HTTPS page, covering layout,
  interaction, CSP, accessibility tree, keyboard, responsive behavior, console, and origin
  enforcement in flagged Chromium 151.
- `hosted-webmcp-invocation.json`: 19/19 native Chromium WebMCP dispatch checks on the same URL,
  including closed schemas, unknown-input refusal, stale and duplicate protection, injection
  quarantine, state movement, and the missing human-only confirmation tool.
- `native-registry.json`: the nine-tool registry observed in that hosted native run.
- `browser-session.json` and `webmcp-invocation.json`: the same hosted runs retained under the
  harness's canonical output names.

## Local artifacts

- `failure-recovery.json`: 27/27 checks in one deterministic CDP journey covering malformed and
  unknown input, oversized batches, stale and duplicate writes, reread/retry, decline, confirm,
  reload, and final state.
- `agent-view-sweep.json`: 17/17 live-DOM checks that no page-owned figure appears in the agent
  view at 1440px or 420px. This remains a local production-build observation.
- The four PNG files are screenshots emitted by the browser harness and hash-bound in the browser
  report.
- `verification-log.md`: commands, exit codes, environment, hashes, and the remaining external
  non-runs.

These artifacts are transport and product evidence. They are not model-selected replay, user
validation, or CI evidence.

## Blocked or not-run artifacts

- `natural-language-replay-blocked.json`: no authorized model/client session was available.
- `hosted-browser-session-blocked.json` and `hosted-webmcp-invocation-blocked.json`: pre-deployment
  placeholders retained for provenance; the current hosted results are in the non-blocked files.
- `gate-p2-not-run.json`: no non-builder marker or workflow owner was available.
- `accessibility-manual-not-run.json`: the automated AX tree is recorded, but no independent
  screen-reader or real-device session was available.
- `performance-probe-not-run.json`: no controlled performance baseline on representative hardware
  or hosted infrastructure was established.

Each blocked artifact contains a rerun protocol. None is a substitute for the missing evidence.
There is intentionally no final `manifest.json` while model replay, GATE-P2, manual accessibility,
performance, and video gates remain open. `manifest.template.json` documents the required shape
without inventing values. `checksums.txt` covers every file in this directory except itself. Verify
it with `sha256sum -c docs/evidence/checksums.txt` from `submissions/withheld`; the paths are
package-relative. It deliberately does not hash `dist/`, because `dist/` is the ignored build input
used to create the Pages branch.

Do not call the deterministic CDP client a model. Do not treat the synthetic fixtures as real-user
validation. Hosted browser/native transport is now verified, but Withheld remains `E4 NOT ACHIEVED`
until model replay, independent learner validation, performance evidence, video, and the remaining
submission gates are independently completed.
