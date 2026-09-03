/**
 * Which of the two readers the page is drawing for.
 *
 * `"yours"` is the page as a teacher reads it, arithmetic included. `"agent"` is the same session with
 * every page-owned value gone — and *gone* is meant literally. The agent's view is not the teacher's
 * view with a stylesheet over it: the components re-read the session through the same projections the
 * tools return (`agentVisibleHolds`, and the reason map App hands down), so a number that is missing
 * from the screen is missing because nothing in the agent's half of the page ever had it. A judge who
 * opens the inspector in this mode finds no total to find, which is the difference between a claim and
 * a demonstration.
 *
 * The toggle changes nothing but what is drawn. Writes still land, the revision still moves, and a
 * form is still usable in agent view — the lens is a way of reading the page, not a mode it runs in.
 */
export type Lens = "yours" | "agent";

/**
 * A value the page keeps: one dash in the slot the number would have taken.
 *
 * The slot is kept rather than collapsed because the row it sits in is a fixed grid — a score cell
 * that vanished would move the five cells after it, and a reader toggling back and forth to see what
 * changed would be reading a page that also moved. The dash is `aria-hidden` and the words beside it
 * are not, so a screen reader in this mode hears what is missing rather than a punctuation mark.
 */
export function Redacted() {
  return (
    <span className="rd">
      <span className="rd__dash" aria-hidden="true">
        —
      </span>
      <span className="vh">withheld from your agent</span>
    </span>
  );
}
