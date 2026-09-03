# Withheld verification log

Written 2026-09-02T16:09:53Z and corrected on 2026-09-03, most recently after two source comments
were repaired. The browser/CDP rows below record runs taken on 2026-09-03 between 12:54:15 and
12:55:11
UTC against one production build, authored and committed as `AndroLay <androlay30@gmail.com>`.
Environment: Node `v26.4.0`, pnpm `11.14.0`, Vite `7.3.6`, Chrome `151.0.7922.137`; browser flags
were `--enable-experimental-web-platform-features` and `--enable-features=WebMCPTesting`.

The source tree hash for that build is `10fb7f7cb083…` and the production `dist/` tree hash is
`84eee0992732…`; both are restated inside each run artifact's own `evidence` block, and the
per-artifact values are the authoritative ones. The two hashes moved independently today, which is
worth stating plainly: the bundle bytes are the build of 12:16 UTC that added four pieces of copy, and
they have not changed since — `dist/assets/index-DI6vQgfk.css` and `index-LG0K2zXZ.js` are the same
files. The source hash moved again at about 12:50 UTC because two code comments were corrected to cite
the right decision numbers, and a comment does not survive the bundler, so the rebuild reproduced
identical output. Recompute the current pair with `scripts/evidence-meta.mjs` whenever the tree moves.
The source hash covers the standalone package inputs (`index.html`, Vite/package/TypeScript config,
local lockfile, `src/`, and `scripts/`); it deliberately does not depend on the root workspace lockfile
so the package can be published standalone. Browser/CDP calls below are deterministic local evidence,
not model replay.

The live URL is two builds behind this pair. It still serves `09974722cf25…` / `3700f7c57edf…`
(`index-DXn1KLBA.css`, `index-JsqLqLgl.js`), which is the build the two hosted rows and the
byte-identity row below describe; between it and this pair sits `eff1c3bf6eea…`, the app-shell build
of 10:56 UTC, which was never published either. Republishing is the owner's decision and has not been
done, so read every hosted figure in this log as a statement about the published page, not about this
tree.

## Commands and results

| command | exit code | result/artifact |
| --- | ---: | --- |
| `pnpm --ignore-workspace test` | 1 | Environment-blocked before test execution: pnpm still resolved the four-project workspace and could not open its local SQLite store. |
| `node --experimental-strip-types --test tests/marks.test.mts tests/agent-boundary.test.mts tests/session.test.mts tests/views.test.mts tests/webmcp.test.mts tests/boundary-inference.test.mts tests/styles.test.mts tests/contrast.test.mts tests/render.test.mts` | 0 | 9/9 test files and 136/136 named assertions passed, re-run 2026-09-03. Regenerate this figure whenever a test file changes. |
| `./node_modules/.bin/tsc -b --pretty false` | 0 | Application TypeScript project check passed. |
| `./node_modules/.bin/vite build` | 0 | Current `dist/`: JS 269.08 kB raw (`index-LG0K2zXZ.js`); CSS 31.86 kB raw (`index-DI6vQgfk.css`); `index.html` 988 B. Two gzip measurements, both real and both named: Vite's own report (`zlib.gzipSync` defaults) is 83.68 kB JS / 6.34 kB CSS, and `gzip -9` on the same files is 82398 B / 6294 B. Sizes measured from the built files on 2026-09-03 at 12:16 UTC, not copied from an earlier build log; the rebuild at 12:50 UTC, after two comments were corrected, reproduced the same two filenames and the same sizes. |
| `node --check scripts/browser-session.mjs && node --check scripts/webmcp-invoke.mjs && node --check scripts/evidence-meta.mjs && node --check scripts/failure-recovery.mjs` | 0 | Node script syntax checks passed. |
| `node --run browser` | 0 | 43/43; `browser-session.json` records `VERIFIED_RUN`, 599 contrast pairs with none failing, and an accessibility tree of 1106 nodes with 57 named and none unnamed; `ranAt` `2026-09-03T12:54:15.778Z`, served from `http://127.0.0.1:4173/`. |
| `node --run agent-view` | 0 | 17/17; `agent-view-sweep.json`; `ranAt` `2026-09-03T12:54:42.562Z`, served from `http://127.0.0.1:4193/`. |
| `node --run webmcp` | 0 | 19/19; `webmcp-invocation.json` and `native-registry.json`; `ranAt` `2026-09-03T12:54:49.286Z`, served from `http://127.0.0.1:4183/`. |
| `node scripts/failure-recovery.mjs` | 0 | 27/27; `failure-recovery.json`; `ranAt` `2026-09-03T12:55:11.346Z`, served from `http://127.0.0.1:4191/`. |
| `pnpm install --lockfile-only --ignore-workspace --offline --store-dir /tmp/withheld-pnpm-store` | 0 | Standalone target lockfile generated with pnpm 11.14.0. |
| `pnpm install --frozen-lockfile --ignore-workspace --offline --ignore-scripts --store-dir /tmp/withheld-pnpm-store --fetch-retries=0 --fetch-timeout=1000 --network-concurrency=1` | 1 | Lockfile was up to date; package fetch stopped by blocked registry (`EAI_AGAIN`), so clean install remains environment-blocked. |
| `curl` of the three built files from `https://androlay.github.io/withheld/` plus `sha256sum` against `dist/` | 0 | HTTP 200 on all three; `index.html` 988 B, `assets/index-DXn1KLBA.css` 30494 B, `assets/index-JsqLqLgl.js` 267374 B, each **byte-identical** to `dist/` as it stood when the check ran. Checked 2026-09-03T10:06:01Z, before the layout rebuild; recorded in `manifest.json` under `hostedBuildIdentity`. It proves the published build was delivered intact and is **not** a statement about the build this tree now produces — `dist/` was replaced at 10:56 UTC and again at 12:16 UTC, and the row has not been re-run because republishing is the owner's decision. |
| `git ls-remote https://github.com/AndroLay/withheld.git` with `HOME` unset and `GIT_TERMINAL_PROMPT=0` | 0 | `HEAD` and `main` `b050f991`, `gh-pages` `58a3ff42`, re-read anonymously at 2026-09-03T10:06:01Z and unchanged from the 09:01:24Z reading. |
| `sha256sum -c docs/evidence/checksums.txt` | 0 | 26 of 26 hashed paths OK, 0 failed, plus the 2 documented `source-tree`/`build-tree` pseudo-entries that `sha256sum` reports as "improperly formatted" by design. The sheet was regenerated after every other file in this directory, which is the only order that verifies; it grew from 25 paths to 26 when `simulated-panel-2026-09-03.json` was written. Run from `submissions/withheld`; the paths are package-relative and every line fails if it is run from inside `docs/evidence/`. |
| `git diff --check -- submissions/withheld` | 0 | No whitespace errors. An earlier state of this documentation pass left a blank line at end of file in `docs/DECISIONS.md`; it was removed and the check re-run clean. |

The first non-escalated recovery-harness attempt was exit 1 because the sandbox could not complete
the loopback preview connection. The authorized rerun above is the result used in the artifact. No
assertion was weakened. Generated evidence files may make the target working tree dirty after a run;
the source/build hashes and tested source commit remain explicit.

## Explicitly not run

- Node 22 fresh-install verification and GitHub Actions CI, re-checked on 2026-09-03 at 09:40 UTC.
  `package.json` declares `engines.node` as `>=22.6.0`; every run recorded above used `v26.4.0`, which
  satisfies that range but does not test its floor. No Node 22 is installed and no version manager is
  present — `nvm`, `fnm`, `volta`, `asdf` and `n` are all absent, and `pnpm env list` reports only
  `26.8.1` — so the lower bound is asserted by the manifest and not by a run. Installing a second
  toolchain is a change to this machine and is the owner's call, not this package's. The commands are:
  `pnpm env add --global 22` (or `nvm install 22 && nvm use 22`), then, **from
  `submissions/withheld`**, `node --version && node --run test && node --run typecheck && node --run
  build`. Do not run them from the repository root: the root scripts are recursive and would build all
  four projects. If the floor fails, the honest repair is to raise `engines.node` to the version that
  passes, not to relax a test.
- Natural-language model replay: no authorized model/client session exists; deterministic CDP calls
  are explicitly excluded. `natural-language-replay-blocked.json` now carries the six verbatim
  prompts, the client and flags, and what to record, so the session is one sitting of work rather
  than a design problem.
- GATE-P2, manual screen-reader/device review, and representative performance baseline: no suitable
  independent participant or device was available. Each has its own artifact in this directory with a
  rerun protocol, and each of those artifacts records that the hosted URL removed the technical half
  of its blocker and left the human half. What was done instead of GATE-P2 is a five-reviewer
  simulated design review, recorded as `simulated-panel-2026-09-03.json` and classified `INFERENCE`.
  It found confusing copy and overstated claims, several of which were repaired the same session. It
  is not a user study, not learner validation, and not adoption evidence, and GATE-P2 stays open.

## Run elsewhere, and copied in

- Hosted browser session and hosted native WebMCP dispatch: run on 2026-09-03 at 07:44:04Z and
  07:44:25Z against `https://androlay.github.io/withheld/` from the publication clone at commit
  `93eee30`, not from this working tree. `hosted-browser-session.json` (43 checks, 43 passed) and
  `hosted-webmcp-invocation.json` (19 checks, 19 passed) are those two reports, byte-for-byte as they
  were written; their `screenshots` paths therefore name the temporary clone directory they ran in
  rather than a path in this repository. Both bind to `sourceSha256 09974722…` and `buildSha256
  3700f7c5…`, which is the build the live URL still serves and **not** the build the five local rows
  above were taken against. None of the four screenshot hashes they record is still a file in this
  directory: the three wide renders went with the app-shell rebuild at 10:56 UTC and
  `browser-420-staged.png` went with the copy build at 12:16 UTC, which added height to the one-column
  layout. `checksums.txt` lists the current four.
- The two reports disagree about `workingTreeDirty` — `false` for the browser session, `true` for the
  dispatch, at one `gitSha`. That is the order they ran in, not a contradiction: the flag is sampled
  when a run starts, the browser session then wrote its own report and four screenshots into that
  clone's tree, and the dispatch run twenty-one seconds later saw them. `manifest.json` records the
  same explanation.
- Final manifest: `manifest.json` is now written from the runs in this directory;
  `manifest.template.json` stays as the empty form it was.

These omissions are represented by separate blocked/not-run JSON artifacts. They are not passes and
do not support an E4 claim.
