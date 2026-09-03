# Withheld target images

This folder stores the visual references used to build the page, not evidence about page
behaviour. Nothing here proves hosting, model invocation, marking fairness, or user validation.
Those claims have their own evidence in `docs/evidence/` and `docs/PROGRESS.md`.

## Folder contents

| File | Size | Role |
| --- | ---: | --- |
| `withheld.png` | 1710 × 3531 | pre-redesign page, captured full-length (the sticky footer therefore appears twice) |
| `withheld-v2-monochrome-generated.png` | 1487 × 1058 | first monochrome generation; abandoned and retained as provenance |
| `withheld-v3-monochrome-refined.png` | 1487 × 1058 | **current target**; the page is built against this image |

## v3 visual contract

- **Fully monochrome.** There is no hue. Sixteen colour tokens are all grey, and
  `tests/contrast.test.mts` rejects hex, `rgb()`, or `color-mix()` outside `:root`.
- **Capitalisation signals an action**, in the one direction that matters: a state is never set in
  capitals. Uppercase marks a control a person can press or the name of a section, but the queue's
  own controls stay in sentence case — the view select, the four tab labels, and the row summary
  that opens a row. There is no pager to be an exception any more; `docs/DECISIONS.md` D-31.
- **Three columns** measured as `322px 761px 357px` at 1440px, with one top bar, one band below
  it, and one sticky bar at the foot of the page.
- **Proportional numbers use classes, not `style`.** The production CSP does not permit inline
  styles, so every bar length comes from one of 21 `bars__fill--N` classes.

## Comparing it with the page

The only valid comparison frame is `docs/evidence/browser-fold-1487.png`, captured at
1487 × 1058 with `captureBeyondViewport: false`. A full-page capture cannot be compared with the
mockup because the sticky footer is printed in the middle of the document — see `withheld.png`
above for the exact example.

## Deliberate differences

The page is **not** identical to v3, and its eleven differences are recorded in
`docs/DECISIONS.md` **D-27**. Examples include: the band shows live session counts
(`14 / 0 / 0 / 0`) while the image draws `14 / 0 / 1 / 0`, a state that cannot occur because
holds are derived from marks; the tool list has nine rows rather than seven; and the second
release control in the top bar remains an anchor because only one control on this page sends marks.

The previous target was a pair of blue/amber SVGs (1440 × 900 and 390 × 844). They are no
longer in this folder; the page's differences from that earlier target are recorded as **D-21**.
