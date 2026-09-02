import { Icon } from "./Icon.tsx";

/**
 * Why the page held an answer, as three links: what arrived, what rule it tripped, where it ended up.
 *
 * An ordered list rather than a row of boxes, so the order survives without the arrows — those are
 * decoration and are hidden from the accessibility tree.
 *
 * It is drawn in two places: on the focused answer in the queue, and against every held answer in the
 * audit below the fold. One component rather than a copy in each, because two renders of the same
 * graphic drift apart, and the stylesheet sweep in `tests/styles.test.mts` would then have to keep
 * both sets of class names alive to stay green.
 */
export function Chain({ steps }: { steps: readonly [string, string, string] }) {
  return (
    <ol className="chain">
      {steps.map((step, index) => (
        <li key={step} className="chain__link">
          {index > 0 ? (
            <span className="chain__arrow" aria-hidden="true">
              <Icon name="arrow" size={13} />
            </span>
          ) : null}
          <span className="chain__box">{step}</span>
        </li>
      ))}
    </ol>
  );
}
