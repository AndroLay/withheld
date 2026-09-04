# Demo video — script and shot list

**Status: NOT RECORDED.** This file is the script. No recording exists, no file has been uploaded, and
`docs/evidence/manifest.json` lists the video as an open gate. If a submission ever cites a video, the
link belongs in `docs/SUBMISSION-TEXT.md` — the current form copy — and in
`docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md`, where it is the only placeholder left.

**Target: 2:44, against a 3:00 ceiling.** Sixteen seconds of headroom is deliberate; a demo that
overruns is disqualified on a technicality rather than on its merits.

## Setup, before recording

- **Target the hosted page**, not `localhost`: `https://androlay.github.io/withheld/`. The address bar
  must be legible in the first shot — it is half the delivery proof.
- **Chrome `151` or newer**, started with `--enable-experimental-web-platform-features` and
  `--enable-features=WebMCPTesting`. Without them `document.modelContext` is absent and shots 7 and 8
  fail.
- **A clean profile**, 1440×900 window. Two of the four screenshots in `docs/evidence/` were taken at
  exactly that viewport — `browser-1440-marked.png` and `browser-1440-staged.png` — so the recording and
  those two describe the same layout. The other two are deliberately a different size and are not
  something to match: `browser-420-staged.png` is a 420×4883 full-page capture of the narrow layout, and
  `browser-fold-1487.png` is a 1487×1058 fold probe. Until 2026-09-04 this line claimed 1440×900 was the
  viewport of every screenshot in the directory, which the four PNG headers contradict.
- **Refresh before rolling.** The session is in memory: a refresh returns the band to `14 / 0 / 0 / 0`.
- **Nothing personal on screen** — no bookmarks bar, no other tabs, no notifications, no terminal
  history. The fixtures are synthetic and alias-only; keep everything else out of frame too.
- **Do not run either harness during the recording.** `scripts/webmcp-invoke.mjs` is headless and
  overwrites `docs/evidence/webmcp-invocation.json`, so filming it would both fail and damage evidence.

## Hard rules for the narration

1. Never say or imply that a model chose a tool. It has not happened. Shot 9 says so out loud.
2. Never call the worked-example button an agent. It is a fixture in the page's own source, and the page
   prints that under the rows — read it aloud in shot 3.
3. Never state a figure the page owns. Point at it on screen instead; the page is allowed to say `88`,
   the narrator is not the page.
4. No music over the release beat. Shot 7 is the claim of the whole submission and wants silence.
5. If a take goes wrong, re-record it. Do not cut a refusal or an absence out to save seconds.

## Shot list

The order is deliberate. The video opens on one answer and the boundary drawn around it, not on an
empty page and not on a list of tool names: a judge who has watched the page refuse something already
knows why nine registrations matter, and the registry proof lands at shot 8 as confirmation rather than
as the hook. Every shot after the first stays on the same answer until the release beat.

### 1 — One answer, and the line addressed to the marker · 0:00–0:14

**On screen:** the hosted URL legible in the address bar. Click the queue row for `ans-11`; it opens on
the **Answer** tab by default, so the body and its caption fill the frame.

> "This is a marking workspace, live on the web. And this is a student's answer that stops answering the
> question and starts giving instructions to whoever marks it. Watch what the page hands an agent about
> it, and what it keeps."

**Must be visible:** the address bar, the answer in the student's hand, and the page's own caption —
*handed to an agent flagged as untrusted*.

### 2 — The contract, published in the page · 0:14–0:36

**On screen:** the right column. The nine registrations with the role the registry reports for each, and
under them the list of what never crosses.

> "The page publishes its half of the deal where you can read it. Nine tools: six that read, three that
> write. Beside them, the things no tool returns — no point value, no total, no pass mark, and not the
> width of the boundary band. And there is no tool that sends a mark. That absence is the design."

**Must be visible:** the nine names with their roles, and the list of what never crosses.

### 3 — One real state change, and who did the arithmetic · 0:36–0:54

**On screen:** close the row and press **Mark all from the worked example** at the foot of the queue.
Rows fill; the band's figures move in one step.

> "The worked example is a fixture in this page's source, and the page says so under the rows — it is not
> a recording of an agent. Thirteen answers take a mark. Five are held back for a person. Every one of
> those figures was computed here, from ideas named as rubric line ids and nothing else."

**Must be visible:** the page's own caption naming the fixture, and the figures changing in one step.

### 4 — The absence, drawn on one row · 0:54–1:14

**On screen:** reopen a *marked* row on its **Decision** tab and let the total sit in frame. Then press
**Agent's view** in the band and open the same row again, and one of the payload boxes in the right
column with it.

> "Your view, and the agent's view of the same answer. There is the total, and the boundary the page
> decided against. Here is the same row described by the same tools an agent would call — and the number
> is not there. Nothing is hidden by styling: these boxes open on the payloads the tools actually return,
> so the absence is checkable instead of promised."

**Must be visible:** a total in your view, the same row without one in the agent's view, and an open
payload box with no figure in it. Switch back to **Your view** at the end of the shot so the figures
return — nothing is destroyed to hide it.

### 5 — The quarantine, and the reasons a person is needed · 1:14–1:32

**On screen:** the audit rail under the stack, the row for `ans-11`, then the held reasons beside it.

> "The answer we opened on claimed all four rubric lines in the worked example. The page quarantined it
> and gave it no mark at all — so an instruction planted in an answer costs that student their mark
> rather than earning one. The other holds name their reason, except the ones sitting on the boundary:
> the agent is told how many it cannot see, never which, and never which side."

**Must be visible:** the quarantine reason, and no mark on that row.
### 6 — The ratchet refuses · 1:32–1:50

**On screen:** in the left rail raise **Care level** from *Standard* to *Cautious*. The held figure rises.
Then move the pointer back toward *Standard* and let the camera sit on the refusal.

> "More care releases *fewer* marks, not better ones, and it re-decides every answer already marked. And
> it only ratchets — the lower settings lock, because a guard an agent can turn back down is how a held
> answer quietly stops being held."

**Must be visible:** the held count rising, and the lower setting refusing the pointer.

### 7 — Release, and the tool that does not exist · 1:50–2:16

**On screen:** press **Stage release** at the foot. Open DevTools and type:

```js
(await document.modelContext.getTools()).map((t) => t.name).includes("confirm_release")
```

Let `false` sit on screen for a beat. Close DevTools, press the human send control, and stay on the receipt.

> "A tool can stage a release. Now look for the tool that completes one." — *(pause on `false`)* — "There
> isn't one. Sending is a human act by absence rather than by permission." — *(press)* — "And that receipt
> records a person, not an agent."

**Must be visible:** `awaitingHuman` before the press, `false` in the console, and the receipt after.
No music under this shot.

### 8 — Nine real tools, from the browser's own registry · 2:16–2:34

**On screen:** reopen DevTools on the hosted page. Type it live rather than pasting:

```js
(await document.modelContext.getTools()).map((t) => t.name)
```

> "Everything you just watched was refused, held or sent by a page that publishes nine tools — and that
> is Chromium's own registry answering, not a mock and not a screenshot. Six read, three write, and no
> tenth name anywhere in the array."

**Must be visible:** nine names in the returned array, and no `confirm_release` among them.

### 9 — What is not claimed · 2:34–2:44

**On screen:** the finished page, whole, no cursor movement.

> "All of that ran inside the tab: no backend, no network call, no student data, and the answers are
> synthetic. And no language model chose any of these tools — the nine were dispatched by a script that
> already knew their names. That is written down in the evidence rather than left out of the video."

## After recording, before the link goes anywhere

- Watch it once at full length with a stopwatch. Over 3:00 is a fail, not a rounding error.
- Confirm no shot shows a figure the narrator stated, no take implies a model, and no frame contains a
  path, a token, a profile name or a notification.
- **Upload Public** — not Unlisted, not Scheduled. Until 2026-09-04 this line read "unlisted is fine"; it
  was withdrawn because the form accepts an unlisted or still-scheduled link without complaining, so a
  link a judge cannot open fails the mandatory-requirement check with no warning at submission time.
  Paste the URL, then open it in a private window with no account signed in before the form goes.
- Then, and only then, fill the video field in `docs/SUBMISSION-TEXT.md` — that is the copy the form is
  pasted from — and replace `[YOUTUBE_VIDEO_URL_PENDING_OWNER]` in
  `docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md`. Both live under `docs/`, which `scripts/evidence-meta.mjs`
  does not hash, so neither edit moves the source or the build hash.
- Leave `docs/evidence/manifest.json` alone until the form is submitted. Moving the video row out of
  `openGates` edits a hashed path, which means recomputing that line in `docs/evidence/checksums.txt` and
  re-running the verify command; a half-updated sheet in the last hour is worse than an honestly open
  gate. Move the row afterwards.
- Check the recording against the build the URL serves that minute. At 19:25:19 UTC on 2026-09-03 the
  three served files hashed byte-identical to `dist/`; if `dist/` moves after the recording, either
  republish or re-record, because a video of wording the page no longer shows is the mismatch §7.2 asks
  about.

## What this script cannot show, and where it lives instead

Three of the strongest guards are invisible from the interface, because they are refusals to calls the UI
never makes: `stale-revision`, `duplicate-operation`, and an unknown rubric line earning nothing. They are
recorded in `docs/evidence/webmcp-invocation.json` (19/19), repeated against the live URL in
`docs/evidence/hosted-webmcp-invocation.json` (19/19), and walked end to end in
`docs/evidence/failure-recovery.json` (27/27). The harness that produces them is headless by
construction, so it cannot be filmed. Cite the artefacts on a title card if the video needs to mention
them; do not re-enact them.


