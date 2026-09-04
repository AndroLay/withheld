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
| Live URL | "a working live URL that judges can access using ChatGPT's in-app browser or Google Chrome with WebMCP enabled" | **present** — <https://androlay.github.io/withheld/>, HTTP 200 re-checked on 2026-09-03 at 19:25:19 UTC, and all three served files confirmed byte-identical to `dist/` in this checkout at that minute, so the URL serves this tree's build `84eee099…`. Both probes were re-run against the URL after the republish: 43/43 at 18:59:34 UTC and 19/19 at 19:06:44 UTC, on that build, each reporting a clean tree | done |
| Text description | four points: why the use case suits WebMCP, the UX gain, the human-plus-agent capability that was hard before, and how WebMCP was implemented | **drafted** — the copy to paste is `docs/SUBMISSION-TEXT.md`, laid out field by field against the form, revised 2026-09-03 22:58 WITA with every figure re-derived against this tree, and leaving the demo video as its only blank; it supersedes `docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md`, which is retained as the prose-shaped alternative and carries both URLs too. Until 2026-09-04 this row named the WINNER-STYLE draft as the paste source, which contradicted `docs/SUBMISSION-TEXT.md:3-5` and three other rows in this package | mine |
| Public repository | source, assets and instructions "required for the project to be functional" | **present** — `AndroLay/withheld`, `main` `7e404d36`, `gh-pages` `15baf8f0`, read back anonymously on 2026-09-03 at 19:25:19 UTC; `gh-pages` is the ref the site serves and doc commits after that minute move `main` only | done |
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

1. **A public repository.** Done. `AndroLay/withheld` is public: `gh-pages` `15baf8f0` is the ref the
   site serves and `main` was `7e404d36` when the refs were last read without credentials, at
   2026-09-03 19:25:19 UTC. Both hosted reports carry `gitSha` `bb4c82ad`, the monorepo commit this
   package's tree was at when they ran; doc commits after that minute move `main` only.
2. **Hosting.** Done. `https://androlay.github.io/withheld/` answers HTTP 200, serving a 988-byte
   `index.html` last modified 2026-09-03 at 18:02:45 UTC. The subpath assumption held with no rebuild:
   `vite.config.ts` sets `base: "./"`, `dist/index.html` emits `./assets/…`, and the hosted browser
   report records 4 requests with none off-site. The follow-up that used to sit here is closed: the
   republish at 18:02:45 UTC put this tree's build on the URL, and at 19:25:19 UTC all three served files
   hashed byte-identical to `dist/` here.
3. **The video.** Three minutes, with a voice on it. Nobody but the owner can record it. The shot
   list, timings and spoken lines are written in `docs/VIDEO-SCRIPT.md`, against the hosted URL.
4. **The Devpost form.** Registration, the four description points, the URLs, and the status reading
   `Submitted` — which is the only state that counts.
5. **Eligibility.** Confirming the entrant's country is on OpenAI's supported list, and being the
   named Representative.

### What the rules do not ask for

Read the table above as the complete official bar. Three things this package treats as gates are
**self-imposed and above that bar**, and their absence is not a rule violation:

- **Independent non-builder validation (`docs/GATE-P2.md`).** An internal gate of ours, now retired.
  The rules ask
  for a working URL, a description, a repository, a licence and a video — not for a user study. On
  2026-09-04 the owner withdrew it on exactly that ground; `docs/GATE-P2-SIMULATION.md` records the
  historical limitation, while `docs/MULTI-AGENT-SIMULATION.md` and its 20/20 artifact replace it
  for the internal workflow gate. The replacement does not stand in for a real person.
- **Natural-language model replay.** Not in the rules either. The rules ask that WebMCP be
  implemented and demonstrated, which `docs/evidence/webmcp-invocation.json` and the hosted dispatch
  report cover. This one has since been run anyway, twice, on 2026-09-04 — local and hosted,
  `docs/MODEL-REPLAY.md` — which leaves the video as the gate that is both open and self-imposed.
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
- **`GATE-P2`. Withdrawn 2026-09-04, never run.** Twenty minutes with one person who did not build the
  page — ten to ask, ten of session — four written questions, and an honest record of what they said.
  The instrument stays at `docs/GATE-P2.md` for anyone who finds the person; what stands in the
  package now is `docs/MULTI-AGENT-SIMULATION.md`, with `docs/evidence/multi-agent-simulation.json`
  reporting 20/20 deterministic checks. This improves workflow evidence, not impact evidence: the
  problem remains a deliberately narrow author-described prototype claim, and no user validation or
  time-saving claim follows from the simulation.
- **A pass over wording and over what a screen reader says, by eye and by ear.** Contrast is no longer
  on this list: it is measured in the browser on every session run, 599 pairs against the backgrounds
  they actually resolve to with the worst at 4.8:1 against a 4.5:1 requirement, and guarded from the
  other end by arithmetic over the palette. The accessibility tree is read too — 1106 nodes, 57 named,
  none unnamed, and the headings descend in order. What
  is still missing is a listener: no screen reader has been run, so no one knows whether the page makes
  sense read aloud, and no person other than the author has read the wording.
- **Node 22 verification.** CI is pinned to it; every local run was Node 26. It has not run in this
  environment, so this remains open rather than a compatibility claim.
- **`docs/evidence/` is current, as of 2026-09-03 19:19–19:25 UTC.** The browser session, agent-view
  sweep and failure/recovery journey were re-taken on the frozen source `b924a27a…`, the two hosted runs
  were re-taken against the live URL, the delivered bytes were compared again, and
  `docs/evidence/checksums.txt` was regenerated after all of them and verifies clean from
  `submissions/withheld` (27 of 27 hashed paths OK, exit 0, and since 2026-09-04 no warning at all: the
  `source-tree`/`build-tree` tree hashes are carried as comments rather than as bare pseudo-entries
  `sha256sum` reported as malformed). Every report binds build `84eee099…`. The
  figures are 136 unit tests, 43 browser checks, 19
  WebMCP dispatches, 27 failure/recovery checks, and 17 agent-view checks, all passing. One report is
  older than the rest and says so: the local dispatch pair still carries its 12:54:49 UTC run on source
  `10fb7f7c…`, because the re-take fails a request-origin check on a force-installed browser extension —
  `docs/evidence/local-dispatch-retake-2026-09-03.json`, `FAILED_RUN` / `ENVIRONMENT_BLOCKED`. Two
  standing cautions: the sheet hashes `dist/` by filename, so any rebuild breaks it and it must be the
  last thing regenerated before publishing; and the unit-test count moves whenever a test file does, so
  re-read it from `node --run test` rather than from this line.
- **The live URL serves this tree's build, and the delivery side is closed.** `gh-pages` `15baf8f0`
  replaced the earlier build at 18:02:45 UTC on 2026-09-03, and at 19:25:19 UTC all three files the URL
  returns hashed byte-identical to `dist/` here — build `84eee099…`, the build every artifact binds to.
  Both hosted probes were then re-run against that URL, 43/43 at 18:59:34 and 19/19 at 19:06:44 UTC, so
  they are delivery proof for the build now live rather than for a predecessor; 17/17 and 27/27 remain
  local figures. The four screenshots came back byte-identical from the live page, which is what ties the
  pictures, the local table and the URL to one release. The build served before 18:02 was `3700f7c5…`;
  the difference was the scrolling columns and five added sentences — no tool, contract or fixture
  changed.
- **Blocked evidence is recorded.** `docs/evidence/` contains explicit blocked/not-run artifacts
  for hosted browser, hosted WebMCP, natural-language replay, the historical GATE-P2 instrument,
  manual accessibility, and performance. Two of those have since been overtaken by runs and are kept
  as the record of the state before them: the hosted pair on 2026-09-03, and natural-language replay
  on 2026-09-04 (`docs/MODEL-REPLAY.md`, local and hosted). The multi-agent replacement is complete
  with limitations; it is not a substitute for the video, for a native third-party host, or for a person.

## The order these have to happen in

The dependencies are real, not preferences:

1. ~~**`GATE-P2` first**, because it is the only item that can still change the page.~~ **Dropped
   2026-09-04.** It was first because a stranger's misreading would have made the description and the
   video expensive to redo. No stranger was reachable, so the ordering constraint it imposed is gone
   and the copy is written from the page as built. `docs/GATE-P2-SIMULATION.md` explains what that
   costs: the description's problem framing is the author's, unconfirmed by anyone. The replacement
   workflow simulation is recorded in `docs/evidence/multi-agent-simulation.json` and passed 20/20.
2. **Publish the repository** — done on 2026-09-03; the licence requirement is about a repository page
   and the video will show a URL.
3. **Host, then open the hosted URL in a clean browser** — done for headless Chrome 151; still open for
   ChatGPT's in-app browser. A local run proves nothing about a host: the CSP travels in a meta tag,
   `base: "./"` had never been served from a subpath, and `document.modelContext` requires a secure
   context, which `127.0.0.1` grants and an `http://` host would not. All three held on
   `https://androlay.github.io/withheld/`: the hosted report records the policy enforced, 4 requests
   with none off-site, and `document.modelContext` present with nine tools.
4. **Re-run the dispatch harness against the hosted URL** with `--url` — done at 19:06:44 UTC,
   19 checks, 19 passed, saved as `docs/evidence/hosted-webmcp-invocation.json`, on the build the URL
   serves now, so the invocation
   evidence is about the thing judges will open rather than about `dist/` on this machine.
5. **Write the description and the testing instructions** from what the hosted page did. The draft in
   `docs/SUBMISSION-TEXT.md` is written to be corrected here, not pasted before here.
6. **Record the video** last, because it shows the URL and the flow, and both are settled by then.
7. **Fill the form**, verify the status reads `Submitted`, and keep the host up until 2026-09-21.

With step 1 dropped, step 2 waits on nothing; everything after 3 still depends on 3.

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
