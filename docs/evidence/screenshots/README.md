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
re-rendered from `https://androlay.github.io/withheld/` at 18:59:34 UTC on 2026-09-03 — one
`buildSha256` and a fixed fixture producing the same pixels from the served page as from the local
preview. `hosted-browser-session.json` names them under this repository's own
`docs/evidence/` paths, because that is where it ran, and its `artifactSha256` block holds the same four
hashes `../checksums.txt` does. None of them is model-replay evidence.
