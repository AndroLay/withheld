# Submission preflight

What the hackathon requires, what this package has, and what is left. One row per official
requirement, no aggregate score, and nothing marked ready that has not been checked.

The requirements below were read from <https://webmcp.devpost.com/rules> on 2026-09-01. Quoted
fragments are the rules' own words. Where this file and the rules disagree, the rules are right and
this file is stale.

## The deadline, in the zone it is set in

The original window closed **2026-09-03 1:00 pm Pacific** (**2026-09-03 20:00 UTC** / **2026-09-04
04:00 WITA**). `OWNER-REPORTED` update: the deadline was extended by twelve hours and the current
working deadline is **2026-09-04 4:00 pm WITA** (**2026-09-04 08:00 UTC** / **2026-09-04 1:00 am
Pacific**). Confirm the extension in the live Devpost countdown or notice before submitting; this
note is not independent verification. Judging runs to 2026-09-21 5:00 pm PT, and the entry has to
stay reachable that whole time — this is a hosting commitment of three weeks, not of one evening.

Registration closes at the same moment as submission. An unregistered entrant at 12:59 pm PT has one
minute to do both.

## What every entry must contain

| requirement | the rules' words | status | whose call |
| --- | --- | --- | --- |
| Live URL | "a working live URL that judges can access using ChatGPT's in-app browser or Google Chrome with WebMCP enabled" | **present** — <https://androlay.github.io/withheld/>, HTTP 200 re-checked on 2026-09-03 at 10:05 UTC; two probes ran against it at 07:44 UTC, 43/43 and 19/19; and at 10:06 UTC all three served files were confirmed byte-identical to `dist/` as it stood then. The wide layout was rebuilt at 10:56 UTC, so the URL now serves the build **before** this checkout's; the difference is layout only and the same checks pass on both | done, with a republish pending the owner |
| Text description | four points: why the use case suits WebMCP, the UX gain, the human-plus-agent capability that was hard before, and how WebMCP was implemented | **drafted** — the copy to paste is `docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md`, which now carries the verified live URL and repository and leaves `[YOUTUBE_VIDEO_URL_PENDING_OWNER]` as its only placeholder; `docs/SUBMISSION-TEXT.md` is the retained longer draft and carries both URLs too | mine |
| Public repository | source, assets and instructions "required for the project to be functional" | **present** — `AndroLay/withheld`, `main` `b050f991`, `gh-pages` `58a3ff42`, read without credentials on 2026-09-03 at 09:01 UTC | done |
| Open-source licence | "detectable and visible at the top of the repository page (in the About section)" | file present in the published tree; whether GitHub's About panel displays it is for the owner to confirm on the repository page | both |
| A real registration | `document.modelContext.registerTool({...})` with name, description, inputSchema, execute | present — nine tools at `src/tools/webmcp.ts:355-606`, registered at `:762` | done |
| Video | "less than three (3) minutes", "a clear demo of your project functioning and with audio that covers what you built and how you used WebMCP", public on YouTube | **absent** | owner |
| Free, unrestricted access through judging | no login needed; credentials required only if the site is private | the page needs no account and makes no network request; hosting is the open half | owner |
| English | everything in English or translated | **partial** — submission-facing copy and target-image notes are English; the internal audit registers still contain Indonesian notes and should not be presented as submission copy | mine |
| New work, dated | new in the window, or an existing project meaningfully extended, "documented with dated evidence such as commit history" | done — every commit for this package is 2026-09-01 or later, and each touches only `submissions/withheld/` | done |
| Eligibility and a Representative | tied to OpenAI's supported-countries list; a team or organisation names one authorised Representative | **unverified** — I have not checked the list, and the entrant is not me | owner |

## Blocked on the owner, and only on the owner

Items 1 and 2 are done, by the owner, on 2026-09-03. What is left below is not started, and each is
an outward-facing act the owner reserves.

1. **A public repository.** Done. `AndroLay/withheld` is public: `main` `b050f991`, `gh-pages`
   `58a3ff42`, both read anonymously on 2026-09-03 at 09:01 UTC. The published source is commit
   `93eee30`, which is the `gitSha` inside the two hosted reports; `b050f991` is the commit that added
   those reports. This working package is still dirty against `df9608c4`, so it holds doc corrections
   that are not in the published tree yet.
2. **Hosting.** Done. `https://androlay.github.io/withheld/` answers HTTP 200, serving a 988-byte
   `index.html` last modified 2026-09-03 at 07:43:21 UTC. The subpath assumption held with no rebuild:
   `vite.config.ts` sets `base: "./"`, `dist/index.html` emits `./assets/…`, and the hosted browser
   report records 4 requests with none off-site. One follow-up sits here now: the page has been
   rebuilt twice since publishing — the app shell at 10:56 UTC and four pieces of copy at 12:16 UTC —
   so the URL serves a build two behind this tree until the owner republishes.
3. **The video.** Three minutes, with a voice on it. Nobody but the owner can record it. The shot
   list, timings and spoken lines are written in `docs/VIDEO-SCRIPT.md`, against the hosted URL.
4. **The Devpost form.** Registration, the four description points, the URLs, and the status reading
   `Submitted` — which is the only state that counts.
5. **Eligibility.** Confirming the entrant's country is on OpenAI's supported list, and being the
   named Representative.

### What the rules do not ask for

Read the table above as the complete official bar. Three things this package treats as gates are
**self-imposed and above that bar**, and their absence is not a rule violation:

- **Independent non-builder validation (`docs/GATE-P2.md`).** An internal gate of ours. The rules ask
  for a working URL, a description, a repository, a licence and a video — not for a user study.
- **Natural-language model replay.** Not in the rules either. The rules ask that WebMCP be
  implemented and demonstrated, which `docs/evidence/webmcp-invocation.json` and the hosted dispatch
  report cover.
- **Screen-reader, real-device and performance sessions.** Good practice, not entry requirements.

Judges score *Potential Impact* as whether the entry makes a credible, specific case for a real
problem and a real audience, and whether the demo shows the solution addressing it. They are not
required to run the app at all. So the work that moves that score is the clarity of the problem, the
persona, the before/after and the demo — not another gate. Keeping these three open is an honesty
decision about what we can prove, and the internal `E4` bar stays unachieved while they are open;
neither fact lowers the entry below what the rules require.

## Mine, and still undone

- **The text description.** `docs/SUBMISSION-TEXT.md` has all four points, the judge's testing
  instructions and the list of things it must not claim. The live URL and the repository URL are now
  in it and verified; the video link is the one placeholder left.
- **The testing instructions** are updated for the hosted artifact as well as the local one: browser
  flags, the 43-check session, the 17-check agent-view sweep, the 19-check WebMCP dispatch, the
  27-check failure/recovery journey, the concurrent-form conflict, and the human release path. Two of
  those runs — the 43-check session and the 19-check dispatch — have now been repeated against the
  live URL. The artifacts still say what they are: browser and CDP, never model.
- **`GATE-P2`.** Twenty minutes with one person who did not build the page — ten to ask, ten of
  session — four written questions, and an honest record of what they said. The instrument is
  `docs/GATE-P2.md`; what it needs is a person.
  This is the weakest criterion in the whole entry — Potential Impact rests on a problem I have
  asserted and not measured, and `README.md` says so in as many words.
- **A pass over wording and over what a screen reader says, by eye and by ear.** Contrast is no longer
  on this list: it is measured in the browser on every session run, 599 pairs against the backgrounds
  they actually resolve to with the worst at 4.8:1 against a 4.5:1 requirement, and guarded from the
  other end by arithmetic over the palette. The accessibility tree is read too — 1106 nodes, 57 named,
  none unnamed, and the headings descend in order. What
  is still missing is a listener: no screen reader has been run, so no one knows whether the page makes
  sense read aloud, and no person other than the author has read the wording.
- **Node 22 verification.** CI is pinned to it; every local run was Node 26. It has not run in this
  environment, so this remains open rather than a compatibility claim.
- **`docs/evidence/` is current, as of 2026-09-03 12:54–12:56 UTC.** All five run artifacts were
  regenerated against one production build — source `10fb7f7c…`, build `84eee099…` — which is the tree
  in this checkout, and `docs/evidence/checksums.txt` was regenerated after them and verifies clean
  (26 hashed paths OK, 0 failed, plus the 2 documented `source-tree`/`build-tree` pseudo-entries) from
  `submissions/withheld`. The figures are 136 unit tests, 43 browser checks, 19
  WebMCP dispatches, 27 failure/recovery checks, and 17 agent-view checks, all passing. Two standing
  cautions: the sheet hashes `dist/` by filename, so any rebuild breaks it and it must be the last
  thing regenerated before publishing; and the unit-test count moves whenever a test file does, so
  re-read it from `node --run test` rather than from this line.
- **The live URL is two builds behind this tree, and that is the only open item on the delivery side.**
  The app shell was built at 10:56 UTC and four pieces of copy at 12:16 UTC; the URL still serves source
  `09974722…` / build `3700f7c5…`. The differences are the scrolling columns and five added sentences —
  no tool, contract or fixture changed — and both later builds pass the whole local suite, so nothing
  here is broken. But a judge opening the URL today sees the earlier arrangement without those
  sentences, and the two hosted reports in `docs/evidence/` describe that build rather than this one.
  Only the browser session and the WebMCP dispatch were ever repeated against the URL, so 43/43 and
  19/19 are true of both builds while 17/17 and 27/27 are local figures. Republishing is the owner's
  decision.
- **Blocked evidence is recorded.** `docs/evidence/` contains explicit blocked/not-run artifacts
  for hosted browser, hosted WebMCP, natural-language replay, GATE-P2, manual accessibility, and
  performance. These are not substitutes for the missing gates.

## The order these have to happen in

The dependencies are real, not preferences:

1. **`GATE-P2` first**, because it is the only item that can still change the page. If the person who
   reads it cannot say what the page is for, the description and the video would be built on a
   misunderstanding, and both are expensive to redo.
2. **Publish the repository** — done on 2026-09-03; the licence requirement is about a repository page
   and the video will show a URL.
3. **Host, then open the hosted URL in a clean browser** — done for headless Chrome 151; still open for
   ChatGPT's in-app browser. A local run proves nothing about a host: the CSP travels in a meta tag,
   `base: "./"` had never been served from a subpath, and `document.modelContext` requires a secure
   context, which `127.0.0.1` grants and an `http://` host would not. All three held on
   `https://androlay.github.io/withheld/`: the hosted report records the policy enforced, 4 requests
   with none off-site, and `document.modelContext` present with nine tools.
4. **Re-run `node --run webmcp` against the hosted URL** with `--url` — done at 07:44:25 UTC,
   19 checks, 19 passed, saved as `docs/evidence/hosted-webmcp-invocation.json`, so the invocation
   evidence is about the thing judges will open rather than about `dist/` on this machine.
5. **Write the description and the testing instructions** from what the hosted page did. The draft in
   `docs/SUBMISSION-TEXT.md` is written to be corrected here, not pasted before here.
6. **Record the video** last, because it shows the URL and the flow, and both are settled by then.
7. **Fill the form**, verify the status reads `Submitted`, and keep the host up until 2026-09-21.

Steps 1 and 2 are independent of each other; everything after 3 depends on 3.

## What must not be said on the form

The page's argument is that a claim should be no wider than its evidence. That has to hold in the
submission copy too, and the four sentences below are the ones most easily written by accident:

- **Not** "an agent marks the class". A model has never driven these tools. What has happened is that
  Chromium's own `WebMCP` domain dispatched all nine into the page and the page moved —
  `docs/evidence/webmcp-invocation.json`, 19 checks. That is the surface working when called from
  outside, and it is not a replay.
- **Not** "tested in ChatGPT's in-app browser". No run has happened there. Every browser figure in
  this package is headless Chromium 151 on one Linux machine.
- **Not** "accessible" as a bare adjective. Focus order, live regions, named steps, contrast (599
  measured pairs, worst 4.8:1) and the accessibility tree (1106 nodes, 57 named, no unnamed control,
  headings in order) are built and measured; what no screen reader announces is unknown, and no person
  other than the author has read the page.
- **Not** "recoverable" without saying what is. Four things can be taken back and a confirmed release
  cannot — `docs/DECISIONS.md` D-23.

## Five minutes before sending

- The hosted URL opens in a private window, with no console error, on the deadline day.
- The repository's About section shows the licence.
- The video is public, plays with audio, and is under three minutes.
- The four description points are all present, and each one is true of the hosted page.
- `docs/PROGRESS.md` and this file agree with what the form claims.
