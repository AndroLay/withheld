# Withheld verification log

Written 2026-09-02T16:09:53Z and corrected on 2026-09-03, most recently after the release was
republished and its evidence re-taken. The browser/CDP rows below record runs taken on 2026-09-03: the
browser session, agent-view sweep and failure/recovery journey between 19:19:08 and 19:19:32 UTC, the
dispatch pair at 12:54:49 UTC, and the two hosted runs at 18:59:34 and 19:06:44 UTC — all against one
production build, authored and committed as `AndroLay <androlay30@gmail.com>`.
Environment: Node `v26.4.0`, pnpm `11.14.0`, Vite `7.3.6`, Chrome `151.0.7922.137`; browser flags
were `--enable-experimental-web-platform-features` and `--enable-features=WebMCPTesting`.

The source tree hash for this release is `b924a27a0a29…` and the production `dist/` tree hash is
`84eee0992732…`; both are restated inside each run artifact's own `evidence` block, and the
per-artifact values are the authoritative ones. The two hashes moved independently today, which is
worth stating plainly: the bundle bytes are the build of 12:16 UTC that added four pieces of copy, and
they have not changed since — `dist/assets/index-DI6vQgfk.css` and `index-LG0K2zXZ.js` are the same
files. The source hash moved twice after that build without moving the build hash: at about 12:50 UTC two
code comments were corrected, and later `scripts/` gained the MCP bridge, its five host configs and the
two harnesses. Neither touches `src/`, and neither survives the bundler, so the rebuild reproduced
identical output. Recompute the current pair with `scripts/evidence-meta.mjs` whenever the tree moves.
The source hash covers the standalone package inputs (`index.html`, Vite/package/TypeScript config,
local lockfile, `src/`, and `scripts/`); it deliberately does not depend on the root workspace lockfile
so the package can be published standalone. Browser/CDP calls below are deterministic local evidence,
not model replay.

The live URL serves this build. Since 18:02:45 UTC it has returned `84eee099…`
(`index-DI6vQgfk.css`, `index-LG0K2zXZ.js`), the bundle this tree produces, and the byte-identity row
below was re-run against it at 19:25:19 UTC. The two hosted rows were re-taken after the republish, so
every hosted figure in this log is a statement about the page a judge opens today and about this tree at
the same time. Two earlier builds are history: `3700f7c5…`, served until 18:02, and `eff1c3bf6eea…`, the
app-shell build of 10:56 UTC that was never published.

## Commands and results

| command | exit code | result/artifact |
| --- | ---: | --- |
| `pnpm --ignore-workspace test` | 1 | Environment-blocked before test execution: pnpm still resolved the four-project workspace and could not open its local SQLite store. |
| `node --experimental-strip-types --test tests/marks.test.mts tests/agent-boundary.test.mts tests/session.test.mts tests/views.test.mts tests/webmcp.test.mts tests/boundary-inference.test.mts tests/styles.test.mts tests/contrast.test.mts tests/render.test.mts` | 0 | 9/9 test files and 136/136 named assertions passed, re-run 2026-09-03. Regenerate this figure whenever a test file changes. |
| `./node_modules/.bin/tsc -b --pretty false` | 0 | Application TypeScript project check passed. |
| `./node_modules/.bin/vite build` | 0 | Current `dist/`: JS 269.08 kB raw (`index-LG0K2zXZ.js`); CSS 31.86 kB raw (`index-DI6vQgfk.css`); `index.html` 988 B. Two gzip measurements, both real and both named: Vite's own report (`zlib.gzipSync` defaults) is 83.68 kB JS / 6.34 kB CSS, and `gzip -9` on the same files is 82398 B / 6294 B. Sizes measured from the built files on 2026-09-03 at 12:16 UTC, not copied from an earlier build log; the rebuild at 12:50 UTC, after two comments were corrected, reproduced the same two filenames and the same sizes. |
| `node --check scripts/browser-session.mjs && node --check scripts/webmcp-invoke.mjs && node --check scripts/evidence-meta.mjs && node --check scripts/failure-recovery.mjs` | 0 | Node script syntax checks passed. |
| `node --run browser` | 0 | 43/43; `browser-session.json` records `VERIFIED_RUN`, 599 contrast pairs with none failing, and an accessibility tree of 1106 nodes with 57 named and none unnamed; `ranAt` `2026-09-03T19:19:08.732Z`, served from `http://127.0.0.1:4173/`. Re-taken on the frozen source `b924a27a…`; the figures are unchanged from the 12:54 run. |
| `node --run agent-view` | 0 | 17/17; `agent-view-sweep.json`; `ranAt` `2026-09-03T19:19:11.947Z`, served from `http://127.0.0.1:4193/`. |
| `node --run webmcp` | 0 | 19/19; `webmcp-invocation.json` and `native-registry.json`; `ranAt` `2026-09-03T12:54:49.286Z`, served from `http://127.0.0.1:4183/`. This is the one local row not re-taken at 19:19, so it binds `sourceSha256 10fb7f7c…`; the row below says why. |
| `node --run webmcp`, re-take on the frozen source | 1 | 18/19, twice — once inside the 19:19 sequence and once at `2026-09-03T19:21:26.550Z`. The failing check is "nothing left the expected origin": a Chromium extension force-installed on this machine (`/usr/share/chromium/extensions/cimiefiiaegbelhefglklhhakcgmhkai.json`) is loaded into the harness's fresh profile and injects `page-script.js` into the `http://` origin. The page's own requests and its `connect-src 'none'` are unchanged, and the same nineteen checks passed 19/19 over `https://` at 19:06:44Z. Recorded as `local-dispatch-retake-2026-09-03.json`, `FAILED_RUN` / `ENVIRONMENT_BLOCKED`; the 12:54 run was kept rather than replaced, and no flag was added to `scripts/` because that would move `sourceSha256` off the published tree. |
| `node scripts/failure-recovery.mjs` | 0 | 27/27; `failure-recovery.json`; `ranAt` `2026-09-03T19:19:32.481Z`, served from `http://127.0.0.1:4191/`. |
| `pnpm install --lockfile-only --ignore-workspace --offline --store-dir /tmp/withheld-pnpm-store` | 0 | Standalone target lockfile generated with pnpm 11.14.0. |
| `pnpm install --frozen-lockfile --ignore-workspace --offline --ignore-scripts --store-dir /tmp/withheld-pnpm-store --fetch-retries=0 --fetch-timeout=1000 --network-concurrency=1` | 1 | Lockfile was up to date; package fetch stopped by blocked registry (`EAI_AGAIN`), so clean install remains environment-blocked. |
| `curl` of the three built files from `https://androlay.github.io/withheld/` plus `sha256sum` against `dist/` | 0 | HTTP 200 on all three; `index.html` 988 B, `assets/index-DI6vQgfk.css` 31862 B, `assets/index-LG0K2zXZ.js` 269076 B, each **byte-identical** to `dist/` in this checkout. Re-checked 2026-09-03T19:25:19Z, after the 18:02:45 UTC republish; recorded in `manifest.json` under `hostedBuildIdentity`. It proves the build this tree produces is the build the URL delivers, intact. An earlier reading of this row at 10:06:01Z described the previous published bundle (`index-DXn1KLBA.css`, `index-JsqLqLgl.js`) and is superseded. |
| `node scripts/browser-session.mjs --url https://androlay.github.io/withheld/` | 0 | 43/43 against the live URL; `hosted-browser-session.json`, `ranAt` `2026-09-03T18:59:34.561Z`, `workingTreeDirty: false`, CSP enforced from that origin, 4 requests and none off-site, 599 contrast pairs, 1106 accessibility nodes with 57 named and none unnamed, nine tools on `document.modelContext`. Its `artifactSha256` block carries the four screenshots it re-rendered from the live page, each byte-identical to the committed file of the same name. |
| `node scripts/webmcp-invoke.mjs --url https://androlay.github.io/withheld/` | 0 | 19/19 against the live URL; `hosted-webmcp-invocation.json`, `ranAt` `2026-09-03T19:06:44.394Z`, `workingTreeDirty: false`. Nine registrations, seven dispatches, the stale-revision and duplicate-operation refusals, a staged release left for a person, and `confirm_release` still *Tool not found*. Deterministic CDP, not a model. |
| `git ls-remote https://github.com/AndroLay/withheld.git` with `HOME` unset and `GIT_TERMINAL_PROMPT=0` | 0 | `HEAD` and `main` `7e404d36`, `gh-pages` `15baf8f0`, read anonymously at 2026-09-03T19:25:19Z. `gh-pages` is the ref the site serves; doc commits after that minute move `main` only. |
| `sha256sum -c docs/evidence/checksums.txt` | 0 | 27 of 27 hashed paths OK, 0 failed. Until 2026-09-04 the run also printed "WARNING: 2 lines are improperly formatted" for the bare `source-tree`/`build-tree` pseudo-entries; those two lines are now comments, so the command prints 27 OK and nothing else while the tree hashes stay in the file. The sheet was regenerated after every other file in this directory, which is the only order that verifies; it grew from 26 paths to 27 when `local-dispatch-retake-2026-09-03.json` was written. Run from `submissions/withheld`; the paths are package-relative and every line fails if it is run from inside `docs/evidence/`. |
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

## Hosted runs, and how they bind

- Hosted browser session and hosted native WebMCP dispatch: run on 2026-09-03 at 18:59:34Z and
  19:06:44Z against `https://androlay.github.io/withheld/` from this working tree at commit
  `bb4c82ad`, after the 18:02:45 UTC republish. `hosted-browser-session.json` (43 checks, 43 passed) and
  `hosted-webmcp-invocation.json` (19 checks, 19 passed) are those two reports, byte-for-byte as they
  were written; their `screenshots` paths name this repository, and both report
  `workingTreeDirty: false` because the tree was restored to its committed state before each ran. Both
  bind `sourceSha256 b924a27a…` and `buildSha256 84eee099…` — the same build the local rows above were
  taken against, and the build the URL serves. The four screenshot hashes in the session's
  `artifactSha256` are the four files in this directory: it re-rendered them from the live page and they
  came out identical. `checksums.txt` lists the same four.
- An earlier hosted pair, at 07:44:04Z and 07:44:25Z, ran from a temporary publication clone at commit
  `93eee30` and described the previous published bundle (`sourceSha256 09974722…`, `buildSha256
  3700f7c5…`). It was replaced by the two runs above rather than retained, so that no two reports in this
  directory describe two different builds. That history is summarised in `manifest.json` under
  `liveUrlParity.history`.
- Final manifest: `manifest.json` is written from the runs in this directory, regenerated at 19:30Z as a
  single-release record; `manifest.template.json` stays as the empty form it was.

These omissions are represented by separate blocked/not-run JSON artifacts. They are not passes and
do not support an E4 claim.
