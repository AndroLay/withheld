# Submission preflight

What the hackathon requires, what this package has, and what is left. One row per official
requirement, no aggregate score, and nothing marked ready that has not been checked.

The requirements below were read from <https://webmcp.devpost.com/rules> on 2026-09-01. Quoted
fragments are the rules' own words. Where this file and the rules disagree, the rules are right and
this file is stale.

## The deadline, in the zone it is set in

The window closes **2026-09-03 1:00 pm Pacific**, which is **20:00 UTC** and **2026-09-04 04:00
WITA**. Judging runs to 2026-09-21 5:00 pm PT, and the entry has to stay reachable that whole time —
this is a hosting commitment of three weeks, not of one evening.

Registration closes at the same moment as submission. An unregistered entrant at 12:59 pm PT has one
minute to do both.

## What every entry must contain

| requirement | the rules' words | status | whose call |
| --- | --- | --- | --- |
| Live URL | "a working live URL that judges can access using ChatGPT's in-app browser or Google Chrome with WebMCP enabled" | **staging verified** — [androlay.github.io/withheld](https://androlay.github.io/withheld/), HTTPS enforced, Pages source `gh-pages` | owner |
| Text description | four points: why the use case suits WebMCP, the UX gain, the human-plus-agent capability that was hard before, and how WebMCP was implemented | **drafted** — `docs/SUBMISSION-TEXT.md` now points to the staging URL and public repository; final form review remains | mine |
| Public repository | source, assets and instructions "required for the project to be functional" | **verified** — [AndroLay/withheld](https://github.com/AndroLay/withheld), public, main commit `4700df7` | owner |
| Open-source licence | "detectable and visible at the top of the repository page (in the About section)" | **verified** — public repository exposes MIT | both |
| A real registration | `document.modelContext.registerTool({...})` with name, description, inputSchema, execute | present — `src/tools/webmcp.ts:613-727`, nine tools | done |
| Video | "less than three (3) minutes", "a clear demo of your project functioning and with audio that covers what you built and how you used WebMCP", public on YouTube | **absent** | owner |
| Free, unrestricted access through judging | no login needed; credentials required only if the site is private | staging needs no account and makes no network request; keep the URL live through judging | owner |
| English | everything in English or translated | **present** — public source and submission-facing documentation are in English; internal audit notes and design references are excluded | mine |
| New work, dated | new in the window, or an existing project meaningfully extended, "documented with dated evidence such as commit history" | done — every commit for this package is 2026-09-01 or later, and each touches only `submissions/withheld/` | done |
| Eligibility and a Representative | tied to OpenAI's supported-countries list; a team or organisation names one authorised Representative | **unverified** — I have not checked the list, and the entrant is not me | owner |

## External status

The repository and staging host are now published by the owner. The remaining items below are the
outward-facing gates that still require the owner's account, identity, recording, or submission action.

1. **A public repository — complete.** [AndroLay/withheld](https://github.com/AndroLay/withheld) is
   public, MIT-licensed, and its `main` branch is at commit `4700df7`.
2. **Staging — complete.** GitHub Pages serves the build at
   [androlay.github.io/withheld](https://androlay.github.io/withheld/) from `gh-pages`; HTTPS is
   enforced. Clean flagged Chrome smoke checks passed 44/44 browser and 19/19 native WebMCP checks.
3. **The video.** Three minutes, with a voice on it. Nobody but the owner can record it.
4. **The Devpost form.** Registration, the four description points, the URLs, and the status reading
   `Submitted` — which is the only state that counts.
5. **Eligibility.** Confirming the entrant's country is on OpenAI's supported list, and being the
   named Representative.

## Mine, and still undone

- **The text description.** Drafted: `docs/SUBMISSION-TEXT.md` has all four points, judge instructions,
  the staging URL, the public repository URL, and the list of claims it must not make. Final form review
  remains the owner's responsibility.
- **The testing instructions** cover the local artifact, and a clean flagged Chrome 151 smoke run against
  the hosted URL passed 44/44 browser and 19/19 native WebMCP checks. The hosted run was CDP-selected,
  not a natural-language model replay; model replay, GATE-P2, and manual accessibility review remain open.
- **`GATE-P2`.** Ten minutes with one person who did not build the page, four written questions, and an
  honest record of what they said. The instrument is `docs/GATE-P2.md`; what it needs is a person.
  This is the weakest criterion in the whole entry — Potential Impact rests on a problem I have
  asserted and not measured, and `README.md` says so in as many words.
- **A pass over wording and over what a screen reader says, by eye and by ear.** Contrast is no longer
  on this list: it is measured in the browser on every session run, 443 pairs against the backgrounds
  they actually resolve to, and guarded from the other end by arithmetic over the palette. The
  accessibility tree is read too — every named control has a name, the headings descend in order. What
  is still missing is a listener: no screen reader has been run, so no one knows whether the page makes
  sense read aloud, and no person other than the author has read the wording.
- **Node 22 verification.** CI is pinned to it; every local run was Node 26. It has not run in this
  environment, so this remains open rather than a compatibility claim.
- **Blocked evidence is recorded.** `docs/evidence/` contains explicit blocked/not-run artifacts
  for hosted browser, hosted WebMCP, natural-language replay, GATE-P2, manual accessibility, and
  performance. These are not substitutes for the missing gates.

## The order these have to happen in

The dependencies are real, not preferences:

1. **`GATE-P2` first**, because it is the only item that can still change the page. If the person who
   reads it cannot say what the page is for, the description and the video would be built on a
   misunderstanding, and both are expensive to redo.
2. **Publish the repository — complete.** The public repository and MIT licence are now visible at
   [github.com/AndroLay/withheld](https://github.com/AndroLay/withheld).
3. **Host and open the hosted URL — complete for staging.** The site is served over HTTPS at
   [androlay.github.io/withheld](https://androlay.github.io/withheld/) from the `gh-pages` branch.
4. **Run WebMCP against the hosted URL — complete for staging.** Clean flagged Chrome 151 passed
   44/44 browser checks and 19/19 native WebMCP dispatch checks. These are CDP-selected runs, not
   natural-language model replay.
5. **Write the description and testing instructions.** The draft now contains the staging and
   repository URLs; final form review and video recording remain.
6. **Record the video** last, because it shows the URL and the flow, and both are settled by then.
7. **Fill the form**, verify the status reads `Submitted`, and keep the host up until 2026-09-21.

The staging checks are complete; model replay, GATE-P2, accessibility review by a person, video, and
submission remain dependent on external participants or the owner's account.

## What must not be said on the form

The page's argument is that a claim should be no wider than its evidence. That has to hold in the
submission copy too, and the four sentences below are the ones most easily written by accident:

- **Not** "an agent marks the class". A model has never driven these tools. What has happened is that
  Chromium's own `WebMCP` domain dispatched all nine into the page and the page moved —
  `docs/evidence/webmcp-invocation.json`, 19 checks. That is the surface working when called from
  outside, and it is not a replay.
- **Not** "tested in ChatGPT's in-app browser". No run has happened there. Every browser figure in
  this package is headless Chromium 151 on one Linux machine.
- **Not** "accessible" as a bare adjective. Focus order, live regions, named steps, contrast (443
  measured pairs) and the accessibility tree (no unnamed control, headings in order) are built and
  measured; what no screen reader announces is unknown, and no person other than the author has read
  the page.
- **Not** "recoverable" without saying what is. Four things can be taken back and a confirmed release
  cannot — `docs/DECISIONS.md` D-23.

## Five minutes before sending

- The hosted URL opens in a private window, with no console error, on the deadline day.
- The repository's About section shows the licence.
- The video is public, plays with audio, and is under three minutes.
- The four description points are all present, and each one is true of the hosted page.
- `docs/PROGRESS.md` and this file agree with what the form claims.
