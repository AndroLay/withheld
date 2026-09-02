import { type Session } from "../domain/session.ts";
import { Icon } from "./Icon.tsx";

/**
 * The bar across the top: what this page is, and which revision it is on. Two facts that are true of
 * the whole page rather than of any one column, which is why they are not in one.
 *
 * The two controls on the right are anchors and not buttons. They move the reader to the audit rail
 * and to the release gate; neither performs anything. The target image draws the second one as a
 * filled black button, and a second copy of the release control is the one thing this page cannot
 * afford: the argument it makes is that exactly one control sends a mark and it is at the foot of the
 * page. So the anchor points at that control instead of standing in for it, and
 * `tests/render.test.mts` asserts this bar renders no `<button>` at all.
 *
 * The revision is the session's only clock. There is no wall time anywhere on this page.
 */
export function TopBar({ session }: { session: Session }) {
  return (
    <header className="top">
      <span className="top__mark" aria-hidden="true">
        <Icon name="lock" size={17} />
      </span>

      <span className="top__name">Withheld</span>

      <span className="top__rule" aria-hidden="true" />

      <span className="top__what">Marking workspace</span>

      <p className="top__rev">
        revision <span className="num">{String(session.revision).padStart(2, "0")}</span>
      </p>

      <a className="top__act" href="#audit-title">
        Held for review
      </a>

      <a className="top__act top__act--hard" href="#gate-title">
        <Icon name="lock" size={13} />
        Human release
      </a>
    </header>
  );
}
