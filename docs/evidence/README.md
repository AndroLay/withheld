# Withheld evidence

This directory contains evidence from local runs on 2026-09-03 — three re-taken at 19:19 UTC, the
dispatch pair still from 12:54 UTC — and two runs against the live URL that evening at 18:59 and 19:06
UTC. Everything here shares one build, `84eee099…`, and that build is what the live URL serves:
`gh-pages` `15baf8f0` went up at 18:02:45 UTC and all three served files hashed byte-identical to `dist/`
again at 19:25:19 UTC. Six of the seven passing reports also share source `b924a27a…`. The exception is
the local dispatch pair, written before `scripts/` gained the MCP bridge, five host configs and two
harnesses; it records source `10fb7f7c…`, the same tree with nothing under `src/` changed, and the
re-take that would have moved it forward is disclosed below as a blocked run. Each artifact
restates its own `sourceSha256` and `buildSha256`, and those
per-artifact values are the authoritative ones. Evidence is classified by what was actually observed:

- `VERIFIED_SOURCE`: a claim checked against source or tests.
- `VERIFIED_RUN`: a command completed with exit code zero.
- `VERIFIED_ARTIFACT`: a generated report or screenshot from that run.
- `HISTORICAL_LOCAL`: an older local observation retained for context only.
- `SELF_REPORTED`: a claim supplied by a person or document, not independently replayed.
- `INFERENCE`: a judgement produced by reasoning over the product, not an observation of it — the
  simulated review below is the only artifact in this class.
- `SIMULATED_RUN`: a deterministic multi-role workflow run over the production tool surface. It is
  auditable execution, but it is not a model replay, native-host discovery, or user validation.
- `UNKNOWN`: not established by the available evidence.
- `ENVIRONMENT_BLOCKED`: not run because the required external environment or access was absent.
- `NOT_RUN`: possible here, but not performed; the instrument exists and is named.
- `TEMPLATE_ONLY`: a shape with no observed values in it, such as `manifest.template.json`.

## Local artifacts

These artifacts come from one build, exercised by four harnesses on 2026-09-03: the browser session,
the agent-view sweep and the failure/recovery journey were re-taken between 19:19:08 and 19:19:32 UTC on
the frozen source `b924a27a…`, and the dispatch pair is still the 12:54:49 UTC run on source
`10fb7f7c…`. They use synthetic alias-only fixtures. Every figure below carries the `ranAt` of the
run that produced it, because these numbers move whenever the page or a harness does. The three
re-taken reports say `workingTreeDirty: true`; each samples that flag as it starts, and what was
modified is this directory — the reports written moments earlier in the same sequence. Nothing under
`src/`, `scripts/`, `index.html`, the configs or the lockfile moved, which is why all four carry the same
`buildSha256`. The hosted gate is closed for the build the site serves — see "Hosted artifacts" — while
the model replay and video remain open. The former GATE-P2 is retired as an active internal gate; its
`NOT_RUN` file is historical. The replacement role-based simulation is described below.

- `browser-session.json`: **43/43** production-browser checks passing (`VERIFIED_RUN`, `ranAt`
  `19:19:08.732Z`) — layout, interaction, enforced CSP, accessibility tree, keyboard and tab order,
  responsive fold, and a clean console in flagged Chrome 151 at `http://127.0.0.1:4173/`. Within
  that run: **599 contrast pairs** with no failures, worst 4.8:1 against a 4.5:1 requirement; an
  accessibility tree of **1106 nodes, 57 named, none unnamed**; a 9-row fold; and no off-site
  request.
- `webmcp-invocation.json`: 19/19 native Chromium WebMCP dispatch checks (`ranAt` `12:54:49.286Z`).
  Nine tools are enumerated through the browser's own domain and seven are dispatched into the page in
  this run; the checks cover unknown rubric-line refusal, stale revision, duplicate operation,
  injection quarantine, and the missing human-only confirmation tool. `read_answer` is dispatched by
  the failure-recovery journey instead, and `preview_unattended_outcome` is registered but called by no
  harness. This is the one report still bound to source `10fb7f7c…`; see
  `local-dispatch-retake-2026-09-03.json` for why it was not replaced.
- `local-dispatch-retake-2026-09-03.json`: the attempt to re-take that run on the frozen source, twice —
  once inside the 19:19 sequence, once on its own at 19:21:26 UTC. **18/19** both times (`FAILED_RUN`,
  class `ENVIRONMENT_BLOCKED`). The failing
  check is the one that asserts nothing left the expected origin: a Chromium extension force-installed on
  this machine — `/usr/share/chromium/extensions/cimiefiiaegbelhefglklhhakcgmhkai.json`, whose entire
  content is an `external_update_url` — is loaded into the harness's fresh profile and injects a
  page-script into the `http://` origin. The page's own requests and its `connect-src 'none'` are
  unchanged, and the same nineteen checks passed 19/19 over `https://` against the live URL at
  19:06:44 UTC on this build. Suppressing the extension would mean adding a browser flag under
  `scripts/`, which would move `sourceSha256` off the published tree, so the source was left frozen and
  the failure recorded here instead.
- `native-registry.json`: the nine-tool registry as Chromium's own WebMCP domain reported it in
  that run (`ranAt` `12:54:49.286Z`). The same nine names were read again on the served page at
  18:59:34Z and 19:06:44Z.
- `failure-recovery.json`: 27/27 checks in one deterministic CDP journey (`ranAt` `19:19:32.481Z`)
  covering malformed and unknown input, oversized batches, stale and duplicate writes,
  reread/retry, decline, confirm, reload, and final state.
- `agent-view-sweep.json`: 17/17 live-DOM checks (`ranAt` `19:19:11.947Z`) that no page-owned
  figure — total, point value, boundary, or distance to it — appears anywhere in the agent's view,
  swept across both views.
- `verification-log.md`: commands, exit codes, environment, hashes, and the explicit non-runs for
  Node 22/CI, hosted targets, model replay, GATE-P2, manual accessibility, and performance.
- `browser-1440-marked.png`, `browser-fold-1487.png`, `browser-1440-staged.png`, and
  `browser-420-staged.png`: screenshots emitted by the browser harness and hash-bound in
  `browser-session.json`. The two 1440 frames are 1440×900 rather than full-page, because at
  1248px and wider the page is an app shell one viewport tall whose three columns scroll on their
  own; `browser-420-staged.png` is a 420×4883 full-page capture and shows the narrow layout end to
  end. `docs/DECISIONS.md` records that trade. All four were re-rendered from the live URL by the
  hosted run at 18:59:34Z and came back byte-identical, so they picture the published build, not only a
  local one.

These local/CDP artifacts are transport and product evidence. They are not model-selected replay,
user validation, or CI evidence.

## Hosted artifacts

These two describe the build the site serves now — source `b924a27a…`, build `84eee099…`, the same pair
the local reports carry. Both ran after the 18:02:45 UTC republish, from this working tree at commit
`bb4c82ad`, and both report `workingTreeDirty: false`.

- `hosted-browser-session.json`: the browser session repeated against
  `https://androlay.github.io/withheld/` on 2026-09-03 at 18:59:34Z — 43 checks, 43 passed, in
  Chrome/151.0.7922.137, with the CSP enforced from that origin, 4 requests and none off-site,
  599 contrast pairs with none failing, an accessibility tree of 1106 nodes with 57 named and none
  unnamed, and `document.modelContext` present with nine tools. Every figure matches the local run on
  the same build.
- Its `artifactSha256` block is the strongest single line in this directory: the four screenshots were
  re-rendered from the live URL during that run, into this directory, and came out byte-identical to the
  four files committed here. The pictures in the README are the live page.
- `hosted-webmcp-invocation.json`: the same dispatch run repeated against the same URL at 19:06:44Z —
  19 checks, 19 passed, including the nine registrations, seven dispatches, the stale-revision and
  duplicate-operation refusals, a staged release left waiting for a person, and `confirm_release` coming
  back *Tool not found*. Only these two harnesses were repeated against the URL: the agent-view sweep
  and the failure-recovery journey were not, so 17/17 and 27/27 are local figures only.
- The served build was compared to `dist/` again at 19:25:19Z: all three files a judge downloads —
  `index.html` 988 B, `assets/index-DI6vQgfk.css` 31862 B and `assets/index-LG0K2zXZ.js` 269076 B —
  came back HTTP 200 and **byte-identical** to `dist/` in this checkout by sha256 on the downloaded
  bytes. `manifest.json` records those three hashes under `hostedBuildIdentity`, which is what makes
  `buildSha256 84eee099…` a statement about a live site rather than only about a local directory. The
  published refs read at that minute, without credentials, were `main` `7e404d36` and `gh-pages`
  `15baf8f0`; `gh-pages` is the ref the site serves and doc commits after that minute move `main` only.
- Superseded, for the record: an earlier pair of hosted runs at 07:44 UTC described source `09974722…` /
  build `3700f7c5…`, the bundle the URL served that morning, and was replaced rather than kept, because
  two reports about two builds is exactly the confusion this directory exists to prevent.
- A hosted browser check is delivery evidence. It is not user validation and not a model replay.

## Multi-agent simulation

`multi-agent-simulation.json` is a `SIMULATED_RUN` replacement for the retired active GATE-P2
workflow gate. The deterministic harness ran five bounded agent roles plus a human-only gate over
the real production registrations and shared session: recognition, safety review, adversarial
recovery, release staging and final audit. It passed **20/20 checks**, including the nine-tool
registry, redaction, injection quarantine, stale and duplicate refusal, malformed input, decline,
re-stage, human confirmation, receipt continuity and post-release refusal.

Run it with:

```sh
node --experimental-strip-types docs/evidence/harness/multi-agent-simulation.mjs
```

This artifact is not natural-language model evidence, native third-party host evidence, user
validation, learner validation, adoption evidence or measured time saving. It records no answer
bodies or page-owned arithmetic. The full boundary is in
[`MULTI-AGENT-SIMULATION.md`](../MULTI-AGENT-SIMULATION.md).

## Blocked or not-run artifacts

- `natural-language-replay-blocked.json`: no authorized model/client session was available.
- `hosted-browser-session-blocked.json` and `hosted-webmcp-invocation-blocked.json`: the earlier
  `ENVIRONMENT_BLOCKED` records from when no deployment existed. They are kept as history; the two
  files above superseded them on 2026-09-03.
- `gate-p2-not-run.json`: historical record that no non-builder marker or workflow owner was
  available before GATE-P2 was retired; it is not an active blocker.
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
`gh-pages` `15baf8f0` and `main` `7e404d36`, the monorepo commit `bb4c82ad` the runs read, the
`sourceSha256`/`buildSha256` of this release, every run with its timestamp and result, the four
screenshot hashes, the `liveUrlParity` record showing there is no longer a gap between this tree and the
URL, and the gates that remain open. It was regenerated at 19:30 UTC from those runs, and its
`whatPointsAtThisRelease` block names the one link that is still missing: no video exists.
`manifest.template.json` stays as the empty form.
`checksums.txt` covers every file in this directory except itself, plus the three current `dist/`
files. Verify it with `sha256sum -c docs/evidence/checksums.txt` run from `submissions/withheld` —
the paths are package-relative, so running it from inside this directory fails every line. A clean run
prints 27 OK and nothing else. It also carries the source and build tree hashes from
`scripts/evidence-meta.mjs` as comment lines, which for this generation match the
`sourceSha256`/`buildSha256` recorded inside each artifact, with the local dispatch pair as the
one documented exception. Rebuilding changes the hashed
`dist/` asset filenames, so regenerate the sheet after any `node --run build`; the sheet is the last
thing to refresh before publishing, not the first.

Do not call the local CDP client a model. Do not call `127.0.0.1` hosted. Do not treat the
synthetic fixtures as real-user validation. Do not call the simulated panel a user study. Withheld
remains `E4 NOT ACHIEVED` until every required external gate is independently completed.
