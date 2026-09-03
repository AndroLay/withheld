# Screenshot index

The current canonical screenshots are retained one directory above because the existing browser
harness and evidence references use those paths:

- `../browser-1440-marked.png`
- `../browser-fold-1487.png`
- `../browser-1440-staged.png`
- `../browser-420-staged.png`

Their SHA256 values are recorded in `../checksums.txt`, in `../browser-session.json`, in
`../hosted-browser-session.json` and in `../manifest.json`, and all four sources agree.

These four files are, byte for byte, both the local production-build captures and what the hosted run
recorded on `https://androlay.github.io/withheld/` at 07:44 UTC on 2026-09-03 — the expected consequence
of one `buildSha256` and a fixed fixture, not a claim that either render was taken twice. Note that
`hosted-browser-session.json` names them under the temporary publication clone's paths because that is
where it ran; `../manifest.json` states that in `screenshotNote`. None of them is model-replay evidence.
