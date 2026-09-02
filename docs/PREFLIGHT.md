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
| Live URL | "a working live URL that judges can access using ChatGPT's in-app browser or Google Chrome with WebMCP enabled" | **absent** | owner |
| Text description | four points: why the use case suits WebMCP, the UX gain, the human-plus-agent capability that was hard before, and how WebMCP was implemented | **drafted** — `docs/SUBMISSION-TEXT.md`, two placeholders, never checked against a host | mine |
| Public repository | source, assets and instructions "required for the project to be functional" | **absent** — no remote exists | owner |
| Open-source licence | "detectable and visible at the top of the repository page (in the About section)" | file present, detection unverifiable until a repository exists | both |
| A real registration | `document.modelContext.registerTool({...})` with name, description, inputSchema, execute | present — `src/tools/webmcp.ts:536`, nine tools | done |
| Video | "less than three (3) minutes", "a clear demo of your project functioning and with audio that covers what you built and how you used WebMCP", public on YouTube | **absent** | owner |
| Free, unrestricted access through judging | no login needed; credentials required only if the site is private | the page needs no account and makes no network request; hosting is the open half | owner |
| English | everything in English or translated | done — every document in this package is English | done |
| New work, dated | new in the window, or an existing project meaningfully extended, "documented with dated evidence such as commit history" | done — every commit for this package is 2026-09-01 or later, and each touches only `submissions/withheld/` | done |
| Eligibility and a Representative | tied to OpenAI's supported-countries list; a team or organisation names one authorised Representative | **unverified** — I have not checked the list, and the entrant is not me | owner |

## Blocked on the owner, and only on the owner

Nothing below is started. Each is an outward-facing act, and the standing instruction in this
workspace is that publication is the owner's decision, per instance, in their own words.

1. **A public repository.** `gh repo create`, or a remote and a push. Four commits exist locally.
2. **Hosting.** GitHub Pages, Cloudflare Pages, Netlify, Vercel — any static host. The artefact is
   already subpath-safe: `vite.config.ts` sets `base: "./"` and `dist/index.html` emits
   `./assets/…`, so a project-page URL works without a rebuild.
3. **The video.** Three minutes, with a voice on it. Nobody but the owner can record it.
4. **The Devpost form.** Registration, the four description points, the URLs, and the status reading
   `Submitted` — which is the only state that counts.
5. **Eligibility.** Confirming the entrant's country is on OpenAI's supported list, and being the
   named Representative.

## Mine, and still undone

- **The text description.** Drafted, not finished: `docs/SUBMISSION-TEXT.md` has all four points, the
  judge's testing instructions and the list of things it must not claim, written against the page as
  built here. What it does not have is a live URL, a repository URL, or a single sentence checked
  against a hosted page. Both placeholders are marked, and step 5 below is when it stops being a
  draft.
- **The English testing instructions** a judge follows: which browser, which flag, what to click, what
  to expect, and the known limitations. Drafted in the same file, in the section addressed to a judge.
  `docs/RUNBOOK.md` remains the version for someone with the repository checked out.
- **`GATE-P2`.** Ten minutes with one person who did not build the page, four written questions, and an
  honest record of what they said. The instrument is `docs/GATE-P2.md`; what it needs is a person.
  This is the weakest criterion in the whole entry — Potential Impact rests on a problem I have
  asserted and not measured, and `README.md` says so in as many words.
- **A pass over wording and over what a screen reader says, by eye and by ear.** Contrast is no longer
  on this list: it is measured in the browser on every session run, 423 pairs against the backgrounds
  they actually resolve to, and guarded from the other end by arithmetic over the palette. The
  accessibility tree is read too — every named control has a name, the headings descend in order. What
  is still missing is a listener: no screen reader has been run, so no one knows whether the page makes
  sense read aloud, and no person other than the author has read the wording.
- **Node 22 verification.** CI is pinned to it; every local run was Node 26. Never run.

## The order these have to happen in

The dependencies are real, not preferences:

1. **`GATE-P2` first**, because it is the only item that can still change the page. If the person who
   reads it cannot say what the page is for, the description and the video would be built on a
   misunderstanding, and both are expensive to redo.
2. **Publish the repository**, because the licence requirement is about a repository page and the video
   will show a URL.
3. **Host, then open the hosted URL in a clean browser** — ChatGPT's in-app browser or Chrome 149+ with
   `chrome://flags/#enable-webmcp-testing`. A local run proves nothing about a host: the CSP travels in
   a meta tag, `base: "./"` has never been served from a subpath, and `document.modelContext` requires
   a secure context, which `127.0.0.1` grants and an `http://` host would not.
4. **Re-run `node --run webmcp` against the hosted URL** with `--url`, so the invocation evidence is
   about the thing judges will open rather than about `dist/` on this machine.
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
  `docs/evidence/webmcp-invocation.json`, 17 checks. That is the surface working when called from
  outside, and it is not a replay.
- **Not** "tested in ChatGPT's in-app browser". No run has happened there. Every browser figure in
  this package is headless Chromium 151 on one Linux machine.
- **Not** "accessible" as a bare adjective. Focus order, live regions, named steps, contrast (423
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

\n