# Withheld verification log

Generated 2026-09-02T16:09:53Z for the local staging candidate. Source/build candidate commit:
`8a228b884d4d954fe6c4af8599cc5667a6c3c8c8`, authored and committed as `AndroLay
<androlay30@gmail.com>`. Environment: Node `v26.4.0`, pnpm `11.14.0`, Vite `7.3.6`, Chrome
`151.0.7922.137`; browser flags were `--enable-experimental-web-platform-features` and
`--enable-features=WebMCPTesting`.

The source tree hash is `26609a30594cfedd1e77075a0d98c2542c3f5f930b5f44b68bb7caf5eb86977c` and
the production `dist/` tree hash is
`b35beb8ce348caf23acffac1b2ffb5ef49e85e225b77a1b366af89740870c77d`. The source hash covers the
standalone package inputs (`index.html`, Vite/package/TypeScript config, local lockfile, `src/`, and
`scripts/`); it deliberately does not depend on the root workspace lockfile so the package can be
published standalone. Browser/CDP calls below are deterministic local evidence, not model replay.

## Commands and results

| command | exit code | result/artifact |
| --- | ---: | --- |
| `pnpm --ignore-workspace test` | 1 | Environment-blocked before test execution: pnpm still resolved the four-project workspace and could not open its local SQLite store. |
| `node --experimental-strip-types --test tests/marks.test.mts tests/agent-boundary.test.mts tests/session.test.mts tests/views.test.mts tests/webmcp.test.mts tests/boundary-inference.test.mts tests/styles.test.mts tests/contrast.test.mts tests/render.test.mts` | 0 | 9/9 test files and 125/125 named assertions passed. |
| `./node_modules/.bin/tsc -b --pretty false` | 0 | Application TypeScript project check passed. |
| `./node_modules/.bin/vite build` | 0 | 49 modules; JS 260.98 kB raw / 81.16 kB gzip; CSS 27.88 kB raw / 5.52 kB gzip. |
| `node --check scripts/browser-session.mjs && node --check scripts/webmcp-invoke.mjs && node --check scripts/evidence-meta.mjs && node --check scripts/failure-recovery.mjs` | 0 | Node script syntax checks passed. |
| `node scripts/browser-session.mjs --preview-port 4663 --port 9603` | 0 | 44/44; `browser-session.json`; `ranAt` `2026-09-02T16:08:10.739Z`. |
| `node scripts/webmcp-invoke.mjs --preview-port 4664 --port 9604` | 0 | 19/19; `webmcp-invocation.json` and `native-registry.json`; `ranAt` `2026-09-02T16:08:25.328Z`. |
| `node --experimental-strip-types scripts/failure-recovery.mjs --preview-port 4665 --port 9605` | 0 | 27/27; `failure-recovery.json`; `ranAt` `2026-09-02T16:08:48.115Z`. |
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
