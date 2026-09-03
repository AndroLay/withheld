# Withheld evidence

This directory contains evidence from local runs on 2026-09-03 between 12:54 and 12:56 UTC, and two
runs against the live URL earlier the same morning at 07:44 UTC. The local five share one build —
source `10fb7f7c…`, build `84eee099…` — and that build is now what the live URL serves: `gh-pages`
`15baf8f0` went up at 18:02:45 UTC and all three served files hashed byte-identical to `dist/` at 18:03
UTC. The source hash has moved on to `b924a27a…` since those artifacts were written, because `scripts/`
gained the MCP bridge, five host configs and two harnesses while nothing under `src/` changed. The two
hosted runs are **not** on that build: they describe source `09974722…` / build `3700f7c5…`, the pair
the site served that morning, and they were not re-run after the republish. Each artifact
restates its own `sourceSha256` and `buildSha256`, and those
per-artifact values are the authoritative ones. Evidence is classified by what was actually observed:

- `VERIFIED_SOURCE`: a claim checked against source or tests.
- `VERIFIED_RUN`: a command completed with exit code zero.
- `VERIFIED_ARTIFACT`: a generated report or screenshot from that run.
- `HISTORICAL_LOCAL`: an older local observation retained for context only.
- `SELF_REPORTED`: a claim supplied by a person or document, not independently replayed.
- `INFERENCE`: a judgement produced by reasoning over the product, not an observation of it — the
  simulated review below is the only artifact in this class.
- `UNKNOWN`: not established by the available evidence.
- `ENVIRONMENT_BLOCKED`: not run because the required external environment or access was absent.
- `NOT_RUN`: possible here, but not performed; the instrument exists and is named.
- `TEMPLATE_ONLY`: a shape with no observed values in it, such as `manifest.template.json`.

## Local artifacts

These artifacts come from one build, exercised by four harnesses between 12:54:15 and 12:55:11 UTC
on 2026-09-03. They use synthetic alias-only fixtures. Every figure below carries the `ranAt` of the
run that produced it, because these numbers move whenever the page or a harness does. The hosted
gate is closed for the published build — see "Hosted artifacts" — while the model and
human-validation gates remain open.

- `browser-session.json`: **43/43** production-browser checks passing (`VERIFIED_RUN`, `ranAt`
  `12:54:15.778Z`) — layout, interaction, enforced CSP, accessibility tree, keyboard and tab order,
  responsive fold, and a clean console in flagged Chrome 151 at `http://127.0.0.1:4173/`. Within
  that run: **599 contrast pairs** with no failures, worst 4.8:1 against a 4.5:1 requirement; an
  accessibility tree of **1106 nodes, 57 named, none unnamed**; a 9-row fold; and no off-site
  request.
- `webmcp-invocation.json`: 19/19 native Chromium WebMCP dispatch checks (`ranAt` `12:54:49.286Z`).
  Nine tools are enumerated through the browser's own domain and seven are dispatched into the page in
  this run; the checks cover unknown rubric-line refusal, stale revision, duplicate operation,
  injection quarantine, and the missing human-only confirmation tool. `read_answer` is dispatched by
  the failure-recovery journey instead, and `preview_unattended_outcome` is registered but called by no
  harness.
- `native-registry.json`: the nine-tool registry as Chromium's own WebMCP domain reported it in
  that run (`ranAt` `12:54:49.286Z`).
- `failure-recovery.json`: 27/27 checks in one deterministic CDP journey (`ranAt` `12:55:11.346Z`)
  covering malformed and unknown input, oversized batches, stale and duplicate writes,
  reread/retry, decline, confirm, reload, and final state.
- `agent-view-sweep.json`: 17/17 live-DOM checks (`ranAt` `12:54:42.562Z`) that no page-owned
  figure — total, point value, boundary, or distance to it — appears anywhere in the agent's view,
  swept across both views.
- `verification-log.md`: commands, exit codes, environment, hashes, and the explicit non-runs for
  Node 22/CI, hosted targets, model replay, GATE-P2, manual accessibility, and performance.
- `browser-1440-marked.png`, `browser-fold-1487.png`, `browser-1440-staged.png`, and
  `browser-420-staged.png`: screenshots emitted by the browser harness and hash-bound in
  `browser-session.json`. The two 1440 frames are now 1440×900 rather than full-page, because at
  1248px and wider the page is an app shell one viewport tall whose three columns scroll on their
  own; `browser-420-staged.png` is a 420×4883 full-page capture and shows the narrow layout end to
  end — 171px taller than the published build's, because the four pieces of copy added at 12:16 UTC
  land in a single column there. `docs/DECISIONS.md` records that trade.

These local/CDP artifacts are transport and product evidence. They are not model-selected replay,
user validation, or CI evidence.

## Hosted artifacts

These two describe the build the site served on the morning of 2026-09-03 (source `09974722…`, build
`3700f7c5…`). The URL was republished at 18:02:45 UTC and these two were not repeated against it, so
they are neither runs against the source in this checkout nor statements about the page live now, and
their figures must not be read as either.

- `hosted-browser-session.json`: the browser session repeated against
  `https://androlay.github.io/withheld/` on 2026-09-03 at 07:44:04Z — 43 checks, 43 passed, in
  Chrome/151.0.7922.137, with the CSP enforced from that origin, 4 requests and none off-site,
  593 contrast pairs with none failing, an accessibility tree of 1139 nodes with 57 named and none
  unnamed, and `document.modelContext` present with nine tools. Those two counts are that build's;
  the same harness on this build reports 599 and 1106.
- `hosted-webmcp-invocation.json`: the same dispatch run repeated against the same URL at 07:44:25Z —
  19 checks, 19 passed. Only these two harnesses were repeated against the URL: the agent-view sweep
  and the failure-recovery journey were not, so 17/17 and 27/27 are local figures only.
- Both ran from a temporary publication clone at commit `93eee30`, not from this working tree, and are
  stored byte-for-byte as written. Two consequences to read carefully: their `screenshots` paths name
  that clone directory rather than a path in this repository, and they record one `gitSha` with two
  `workingTreeDirty` values — `false` for the session that started on a clean tree, `true` for the
  dispatch twenty-one seconds later, after the session had written its report and four screenshots
  into it. `manifest.json` states both facts in `screenshotNote` and `dirtyFlagNote`. None of the four
  screenshot hashes they carry is still a file in this directory: the three wide renders were replaced
  by the app-shell rebuild at 10:56 UTC, and `browser-420-staged.png` by the copy build at 12:16 UTC.
- The served build was compared to `dist/` twice. On 2026-09-03 at 10:06:01Z, before the layout rebuild,
  all three files a judge downloads — `index.html` 988 B, `assets/index-DXn1KLBA.css` 30494 B and
  `assets/index-JsqLqLgl.js` 267374 B — were **byte-identical** to `dist/` as it then stood, by
  sha256 on the downloaded bytes. `manifest.json` records those three hashes under
  `hostedBuildIdentity`, which is what makes `buildSha256 3700f7c5…` a statement about a live site rather
  than only about a local directory. That statement now belongs to the past: the site was republished at
  18:02:45 UTC, and at 18:03 UTC the comparison was repeated against the current three files —
  `index.html` 988 B, `assets/index-DI6vQgfk.css` 31862 B and `assets/index-LG0K2zXZ.js` 269076 B — which
  came back byte-identical to `dist/` in this checkout, build `84eee099…`. The published refs are now
  `main` `9cce7d0a` and `gh-pages` `15baf8f0`; `manifest.json` still records the earlier trio and has not
  been regenerated.
- A hosted browser check is delivery evidence. It is not user validation and not a model replay.

## Blocked or not-run artifacts

- `natural-language-replay-blocked.json`: no authorized model/client session was available.
- `hosted-browser-session-blocked.json` and `hosted-webmcp-invocation-blocked.json`: the earlier
  `ENVIRONMENT_BLOCKED` records from when no deployment existed. They are kept as history; the two
  files above superseded them on 2026-09-03.
- `gate-p2-not-run.json`: no non-builder marker or workflow owner was available.
- `accessibility-manual-not-run.json`: the automated AX tree is recorded, but no independent
  screen-reader or real-device session was available.
- `performance-probe-not-run.json`: no controlled performance baseline on representative hardware
  was established.

## Simulated review, which is not evidence of impact

- `simulated-panel-2026-09-03.json`: a formative review in which five read-only agent reviewers were
  each given one scope — a rubric-style scoring pass, a cold read by a stand-in teacher, a
  before/after legibility pass, a WebMCP tool-surface review, and an overclaim hunt — and reported
  what they found. It is classified **`INFERENCE`** throughout. It is a design instrument for finding
  confusing copy and overstated claims, and it did: several page and document changes on 2026-09-03
  came from it. It is **not** a user study, **not** learner validation, and **not** adoption
  evidence; no human participated, so nothing in it says any person understood anything. It does not
  satisfy GATE-P2 and may never be promoted to any other class.

Each blocked artifact contains a rerun protocol. None is a substitute for the missing evidence.
`manifest.json` is written from the runs in this directory: it binds the hosted URL, the published
commit `b050f991`, the built commit `93eee30`, this working commit `df9608c4`, the local
`sourceSha256`/`buildSha256`, every run with its timestamp and result, the four screenshot hashes, the
`liveUrlLag` record of the two-build gap between this tree and the URL, and the gates that remain
open. It was written before the 18:02 republish and has not been regenerated, so its `liveUrlLag` and
its published-commit fields describe the state at 12:56 UTC rather than the state now — the gap they
record was closed by `gh-pages` `15baf8f0`. `manifest.template.json` stays as the empty form.
`checksums.txt` covers every file in this directory except itself, plus the three current `dist/`
files. Verify it with `sha256sum -c docs/evidence/checksums.txt` run from `submissions/withheld` —
the paths are package-relative, so running it from inside this directory fails every line. It also
carries the source and build tree hashes from `scripts/evidence-meta.mjs`, which for this generation
match the `sourceSha256`/`buildSha256` recorded inside each artifact. Rebuilding changes the hashed
`dist/` asset filenames, so regenerate the sheet after any `node --run build`; the sheet is the last
thing to refresh before publishing, not the first.

Do not call the local CDP client a model. Do not call `127.0.0.1` hosted. Do not treat the
synthetic fixtures as real-user validation. Do not call the simulated panel a user study. Withheld
remains `E4 NOT ACHIEVED` until every required external gate is independently completed.
