# Withheld verification log

This log describes the tested application snapshot, not a final E4 release. The hosted checks
were run against commit `d089bac8b3859c4f27df5e2984a6c05fab2a1f51` (`Document Withheld staging
status`), authored and committed as `AndroLay <AndroLay@users.noreply.github.com>`.

- Hosted URL: `https://androlay.github.io/withheld/`
- Source SHA256: `ab596fa99cda7cf6e0c931e9e9dc5f3254d56769f9e2239864ee398c7917d118`
- Production build SHA256: `b35beb8ce348caf23acffac1b2ffb5ef49e85e225b77a1b366af89740870c77d`
- Browser: Chrome `151.0.7922.137`
- WebMCP flags: `--enable-experimental-web-platform-features`, `--enable-features=WebMCPTesting`
- Fixture policy: synthetic alias-only data; no student PII

## Commands and results

| command | exit code | result/artifact |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/withheld-public-pnpm-store` | 0 | Standalone clean-clone install completed. |
| `pnpm test` | 0 | 9/9 test files and 125/125 assertions passed in the writable standalone clone. |
| `pnpm typecheck` | 0 | Application TypeScript check passed. |
| `pnpm build` | 0 | Production build passed; 49 modules; JS 260.98 kB raw / 81.16 kB gzip; CSS 27.88 kB raw / 5.52 kB gzip. |
| `node --check scripts/browser-session.mjs && node --check scripts/webmcp-invoke.mjs && node --check scripts/evidence-meta.mjs && node --check scripts/failure-recovery.mjs` | 0 | Node harness syntax checks passed. |
| `node scripts/browser-session.mjs --url https://androlay.github.io/withheld/ --port 9623` | 0 | Hosted browser run, 44/44; `hosted-browser-session.json`; `ranAt` `2026-09-02T17:22:10.615Z`. |
| `node scripts/webmcp-invoke.mjs --url https://androlay.github.io/withheld/ --port 9634` | 0 | Hosted WebMCP dispatch run, 19/19; `hosted-webmcp-invocation.json` and `native-registry.json`; `ranAt` `2026-09-02T17:23:49.435Z`. |
| `node --experimental-strip-types scripts/failure-recovery.mjs --preview-port 4665 --port 9605` | 0 | Local deterministic failure/recovery journey, 27/27; `failure-recovery.json`; not hosted and not model-selected. |
| `git diff --check` | 0 | No whitespace errors in the public snapshot before evidence publication. |

All hosted reports record the hosted URL, browser/flags, tested commit, source hash, build hash,
and clean working-tree state at capture time. The report files themselves are written after the
metadata snapshot, so evidence generation can make a checkout dirty afterward; this does not alter
the tested source/build hashes.

## Explicitly not run or not proven

- Node 22 fresh-install verification and GitHub Actions CI: not proven. The public package does not
  include a deployment workflow; the legacy Pages staging branch was published separately. A prior
  workflow attempt in the source workspace was blocked by the GitHub account billing lock.
- Natural-language model replay: no authorized client/model session was available. No scripted CDP
  invocation is represented as model behavior.
- GATE-P2: no independent non-builder marker/workflow owner was available.
- Manual screen-reader and real-device accessibility review: not available.
- Controlled cold/warm, long-task, and representative-device performance baseline: not available.
- Final manifest, final video, and Devpost submission: not created or submitted.

These limitations are represented by the blocked/not-run JSON artifacts. They are not passes and do
not support an E4 claim.
