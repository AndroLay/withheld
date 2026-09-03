import { useSyncExternalStore } from "react";

/**
 * The width at which the page stops being one column, as the query itself rather than a number.
 *
 * This is the same string `src/styles.css` uses for the same threshold, and `tests/styles.test.mts`
 * asserts the sheet still has a media block behind it. Two copies of a breakpoint is a real hazard:
 * a page that folds a column the grid has already placed beside another is worse than a page that
 * never folded anything. The copies are held together by a test rather than by remembering.
 *
 * 78rem is measured, not chosen. Three columns leave the queue whatever is left after 322px and
 * 357px, and a marking row needs 424px before its answer preview is even one character wide. Below
 * this the row outgrew its own card — so the threshold is the width where the work fits, not the
 * width where the columns do. A 1280px window clears it with a scrollbar out; anything narrower
 * gets the single column, where the queue has the whole page and the contract folds into a
 * disclosure under it. `docs/DECISIONS.md` D-32 records the move.
 */
export const MANY_COLUMNS = "(min-width: 78rem)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(MANY_COLUMNS);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  return !window.matchMedia(MANY_COLUMNS).matches;
}

/**
 * True when the page is in its single-column layout: a phone, or a window dragged narrow.
 *
 * `useSyncExternalStore` rather than an effect that sets state, for two reasons. The first paint gets
 * the real answer, so a phone does not render the wide shape and then jump. And the subscription is a
 * live one — the browser session changes the viewport at runtime without reloading, so a page that
 * only read the width once would be measured in a shape it no longer had.
 *
 * The third argument is what a render with no window gets: `false`, the shape with everything in it,
 * which is what `renderToStaticMarkup` should produce. Nothing pretends to have a window in a test —
 * `tests/render.test.mts` renders the folded shape by passing the prop.
 */
export function useOneColumn(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
