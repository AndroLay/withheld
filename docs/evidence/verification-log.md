# Withheld verification log

Written 2026-09-02T16:09:53Z and corrected 2026-09-03 after the artifacts were regenerated. The
browser/CDP rows below record runs taken on 2026-09-03 between 06:10 and 06:29 UTC at base commit
`ba4bd6177bb3fd224a3d8dcdd12215eee716dc8c` with a dirty working tree, authored and committed as
`AndroLay <androlay30@gmail.com>`. Environment: Node `v26.4.0`, pnpm `11.14.0`, Vite `7.3.6`, Chrome
`151.0.7922.137`; browser flags were `--enable-experimental-web-platform-features` and
`--enable-features=WebMCPTesting`.

This log does not restate a single source/build tree pair, because the runs below were taken over
more than one build. Each artifact records its own `sourceSha256` and `buildSha256`, and those
per-artifact values are authoritative; recompute the current pair with `scripts/evidence-meta.mjs`
when a claim needs one. That hash covers the standalone package inputs (`index.html`,
Vite/package/TypeScript config, local lockfile, `src/`, and `scripts/`); it deliberately does not
depend on the root workspace lockfile so the package can be published standalone. Browser/CDP calls
below are deterministic local evidence, not model replay.

## Commands and results

| command | exit code | result/artifact |
| --- | ---: | --- |
| `pnpm --ignore-workspace test` | 1 | Environment-blocked before test execution: pnpm still resolved the four-project workspace and could not open its local SQLite store. |
| `node --experimental-strip-types --test tests/marks.test.mts tests/agent-boundary.test.mts tests/session.test.mts tests/views.test.mts tests/webmcp.test.mts tests/boundary-inference.test.mts tests/styles.test.mts tests/contrast.test.mts tests/render.test.mts` | 0 | 9/9 test files and 136/136 named assertions passed, re-run 2026-09-03. Regenerate this figure whenever a test file changes. |
| `./node_modules/.bin/tsc -b --pretty false` | 0 | Application TypeScript project check passed. |
| `./node_modules/.bin/vite build` | 0 | 49 modules; JS 260.98 kB raw / 81.16 kB gzip; CSS 27.88 kB raw / 5.52 kB gzip. |
| `node --check scripts/browser-session.mjs && node --check scripts/webmcp-invoke.mjs && node --check scripts/evidence-meta.mjs && node --check scripts/failure-recovery.mjs` | 0 | Node script syntax checks passed. |
| `node scripts/browser-session.mjs --preview-port 4663 --port 9603` | 1 | **37/44**; seven checks fail against the redesigned page; `browser-session.json` records `FAILED_RUN`; `ranAt` `2026-09-03T06:10:56.860Z`. |
| `node scripts/webmcp-invoke.mjs --preview-port 4664 --port 9604` | 0 | 19/19; `webmcp-invocation.json` and `native-registry.json`; `ranAt` `2026-09-03T06:28:52.014Z`. |
| `node --experimental-strip-types scripts/failure-recovery.mjs --preview-port 4665 --port 9605` | 0 | 27/27; `failure-recovery.json`; `ranAt` `2026-09-03T06:10:28.470Z`. |
| `node scripts/agent-view.mjs` | 0 | 17/17; `agent-view-sweep.json`; `ranAt` `2026-09-03T06:14:00.522Z`. |
| `pnpm install --lockfile-only --ignore-workspace --offline --store-dir /tmp/withheld-pnpm-store` | 0 | Standalone target lockfile generated with pnpm 11.14.0. |
| `pnpm install --frozen-lockfile --ignore-workspace --offline --ignore-scripts --store-dir /tmp/withheld-pnpm-store --fetch-retries=0 --fetch-timeout=1000 --network-concurrency=1` | 1 | Lockfile was up to date; package fetch stopped by blocked registry (`EAI_AGAIN`), so clean install remains environment-blocked. |
| `git diff --check -- submissions/withheld` | 0 | No whitespace errors in the target changes before the evidence refresh. |

The first non-escalated recovery-harness attempt was exit 1 because the sandbox could not complete
the loopback preview connection. The authorized rerun above is the result used in the artifact. No
assertion was weakened. Generated evidence files may make the target working tree dirty after a run;
the source/build hashes and tested source commit remain explicit.

## Explicitly not run

- Node 22 fresh-install verification and GitHub Actions CI: Node 22 is not installed and CI was not
  invoked.
- Hosted browser/native WebMCP: no hosted URL exists; no deployment or push was performed.
- Natural-language model replay: no authorized model/client session exists; deterministic CDP calls
  are explicitly excluded.
- GATE-P2, manual screen-reader/device review, and representative performance baseline: no suitable
  independent participant/device/hosted environment was available.
- Final manifest: `manifest.template.json` is present, but no placeholder was promoted to a claim.

These omissions are represented by separate blocked/not-run JSON artifacts. They are not passes and
do not support an E4 claim.
