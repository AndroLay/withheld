# Demo video — script and shot list

**Status: NOT RECORDED.** This file is the script. No recording exists, no file has been uploaded, and
`docs/evidence/manifest.json` lists the video as an open gate. If a submission ever cites a video, the
link belongs in `docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md` — currently the only placeholder left in it.

**Target: 2:44, against a 3:00 ceiling.** Sixteen seconds of headroom is deliberate; a demo that
overruns is disqualified on a technicality rather than on its merits.

## Setup, before recording

- **Target the hosted page**, not `localhost`: `https://androlay.github.io/withheld/`. The address bar
  must be legible in the first shot — it is half the delivery proof.
- **Chrome `151` or newer**, started with `--enable-experimental-web-platform-features` and
  `--enable-features=WebMCPTesting`. Without them `document.modelContext` is absent and shot 3 fails.
- **A clean profile**, 1440×900 window. That is the viewport every screenshot in `docs/evidence/` was
  taken at, so the recording and the artefacts describe the same layout.
- **Refresh before rolling.** The session is in memory: a refresh returns the band to `14 / 0 / 0 / 0`.
- **Nothing personal on screen** — no bookmarks bar, no other tabs, no notifications, no terminal
  history. The fixtures are synthetic and alias-only; keep everything else out of frame too.
- **Do not run either harness during the recording.** `scripts/webmcp-invoke.mjs` is headless and
  overwrites `docs/evidence/webmcp-invocation.json`, so filming it would both fail and damage evidence.

## Hard rules for the narration

1. Never say or imply that a model chose a tool. It has not happened. Shot 8 says so out loud.
2. Never call the worked-example button an agent. It is a fixture in the page's own source, and the page
   prints that under the rows — read it aloud in shot 4.
3. Never state a figure the page owns. Point at it on screen instead; the page is allowed to say `88`,
   the narrator is not the page.
4. No music over the release beat. Shot 7 is the claim of the whole submission and wants silence.
5. If a take goes wrong, re-record it. Do not cut a refusal or an absence out to save seconds.

## Shot list

### 1 — The problem · 0:00–0:10

**On screen:** the hosted URL in the address bar, the page on arrival, band in frame.

> "Marking a class of short answers is two jobs wearing one coat. Reading fourteen answers against a
> rubric is bulk work. Deciding what a mark *is*, and sending it to a student, is not."

### 2 — The claim, on the page · 0:10–0:24

**On screen:** the intro band — one sentence, the fourteen-cell spine strip, the four live figures.

> "So this page hands a browser agent everything it needs to read them, and nothing it needs to decide
> one. Fourteen answers. None marked, none held, none staged."

**Must be visible:** all four figures at zero except the answer count.
### 3 — Nine real tools, from the browser's own registry · 0:24–0:42

**On screen:** DevTools console, docked right, on the hosted page. Type it live rather than pasting:

```js
(await document.modelContext.getTools()).map((t) => t.name)
```

> "Nine tools, registered by the page itself. Six read, three write. That is Chromium's own registry
> answering, not a mock and not a screenshot."

**Must be visible:** nine names in the returned array.

### 4 — One real state change · 0:42–1:02

**On screen:** close DevTools. Press **Mark all from the worked example** at the foot of the queue. Rows
fill; the band's figures move.

> "The worked example is a fixture in this page's source, and the page says so under the rows — it is not
> a recording of an agent. Thirteen answers take a mark. Five are held back for a person."

**Must be visible:** the page's own caption naming the fixture, and the figures changing in one step.

### 5 — The absence, drawn · 1:02–1:24

**On screen:** press **Agent's view** in the band. Then open one of the payload boxes in the right column.

> "Same session, drawn the way the tools describe it. Every total, every point value, the pass mark and
> the width of the band are gone — and these boxes open on the payloads those tools actually return, so
> you can check the claim instead of taking my word for it."

**Must be visible:** a total in the previous shot, and the same row without one here. Switch back to
**Your view** at the end of the shot so the figures return — nothing is destroyed to hide it.

### 6 — The injection · 1:24–1:44

**On screen:** the audit rail under the stack, the row for `ans-11`.

> "One of these answers tells the marker to ignore the rubric and award full marks. In the worked example
> the agent claims all four rubric lines for it. The page quarantines it with no mark at all — so an
> injection costs the student their mark rather than earning one."

**Must be visible:** the quarantine reason, and no mark on that row.
### 7 — The ratchet refuses · 1:44–2:04

**On screen:** in the left rail raise **Care level** from *Standard* to *Cautious*. The held figure rises.
Then move the pointer back toward *Standard* and let the camera sit on the refusal.

> "More care releases *fewer* marks, not better ones, and it re-decides every answer already marked. And
> it only ratchets — the lower settings lock, because a guard an agent can turn back down is how a held
> answer quietly stops being held."

**Must be visible:** the held count rising, and the lower setting refusing the pointer.

### 8 — Release, and the tool that does not exist · 2:04–2:30

**On screen:** press **Stage release** at the foot. Reopen DevTools and type:

```js
(await document.modelContext.getTools()).map((t) => t.name).includes("confirm_release")
```

Let `false` sit on screen for a beat. Close DevTools, press the human send control, and stay on the receipt.

> "A tool can stage a release. Now look for the tool that completes one." — *(pause on `false`)* — "There
> isn't one. Sending is a human act by absence rather than by permission." — *(press)* — "And that receipt
> records a person, not an agent."

**Must be visible:** `awaitingHuman` before the press, `false` in the console, and the receipt after.
No music under this shot.

### 9 — What is not claimed · 2:30–2:44

**On screen:** the finished page, whole, no cursor movement.

> "All of that ran inside the tab: no backend, no network call, no student data, and the answers are
> synthetic. And no language model chose any of these tools — the nine were dispatched by a script that
> already knew their names. That is written down in the evidence rather than left out of the video."

## After recording, before the link goes anywhere

- Watch it once at full length with a stopwatch. Over 3:00 is a fail, not a rounding error.
- Confirm no shot shows a figure the narrator stated, no take implies a model, and no frame contains a
  path, a token, a profile name or a notification.
- Public, unlisted is fine; private is not — a judge must be able to open it without an account.
- Then, and only then, replace `[YOUTUBE_VIDEO_URL_PENDING_OWNER]` in
  `docs/SUBMISSION-TEXT-WINNER-STYLE-DRAFT.md`, and move the video row in
  `docs/evidence/manifest.json` out of `openGates`.

## What this script cannot show, and where it lives instead

Three of the strongest guards are invisible from the interface, because they are refusals to calls the UI
never makes: `stale-revision`, `duplicate-operation`, and an unknown rubric line earning nothing. They are
recorded in `docs/evidence/webmcp-invocation.json` (19/19), repeated against the live URL in
`docs/evidence/hosted-webmcp-invocation.json` (19/19), and walked end to end in
`docs/evidence/failure-recovery.json` (27/27). The harness that produces them is headless by
construction, so it cannot be filmed. Cite the artefacts on a title card if the video needs to mention
them; do not re-enact them.


