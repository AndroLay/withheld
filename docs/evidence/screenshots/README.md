# Screenshot index

The current canonical screenshots are retained one directory above because the existing browser
harness and evidence references use those paths:

- `../browser-1440-marked.png`
- `../browser-fold-1487.png`
- `../browser-1440-staged.png`
- `../browser-420-staged.png`

They are deterministic Chromium CDP captures. The latest refresh was taken against the hosted
staging URL; use the matching browser-session artifact for the URL, commit, browser, and evidence
class. They are not model-replay evidence. Their SHA256 values are recorded in `../checksums.txt`
and in the browser-session artifact.
