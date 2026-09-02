import { type RefObject } from "react";

import { type Session } from "../domain/session.ts";
import { Icon } from "./Icon.tsx";

/**
 * The bar across the foot of the page, in three parts: whose authority this is, what staging does,
 * and the one control no tool can reach.
 *
 * It is pinned to the bottom because it is the point of the whole page. Withheld registers nine tools
 * and none of them reaches either button — there is no `confirm_release`, and the padlock on the right
 * is not a disabled state waiting for a permission, it is the absence of a tool.
 *
 * Both slots are always on screen, including the locked one, because a control that appears only once
 * it is usable cannot make a promise about what an agent is unable to do.
 *
 * The heading is programmatically focusable: `App` moves focus here when a release appears, and to the
 * heading rather than the send button, because an agent can stage a release and must not be able to
 * put an irreversible action one keystroke away from whoever is at the keyboard. It gains a clause
 * when a release is staged, so a reader whose focus has just been moved here is told why — the target
 * image draws the idle state, which is the state that keeps the heading's own two words.
 */
export function ActionBar({
  session,
  held,
  ready,
  stackMoved,
  headingRef,
  onStage,
  onSend,
  onDecline,
}: {
  session: Session;
  held: number;
  ready: number;
  stackMoved: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onStage: () => void;
  onSend: () => void;
  onDecline: () => void;
}) {
  const staged = session.releaseRequest !== null;

  return (
    <div className={staged ? "bar bar--waiting" : "bar"}>
      <div className="bar__who">
        <span className="bar__glyph" aria-hidden="true">
          <Icon name="shield" size={19} />
        </span>
        <h2 className="bar__title" id="gate-title" ref={headingRef} tabIndex={-1}>
          Human authority
          {staged ? <span className="bar__wait"> — a release is waiting</span> : null}
        </h2>
        <p className="bar__gloss">
          Only a person can hold answers and release marks. Nothing leaves this page until you
          confirm.
        </p>
      </div>

      <div className="bar__mid">
        <p className="bar__lede">
          <span className="num">{ready}</span> {ready === 1 ? "mark" : "marks"} would reach students
          and <span className="num">{held}</span> would stay on this page.
          {staged
            ? " A release is staged. Nothing has left yet."
            : " A release has to be staged first — by you, or by your agent."}
        </p>
        {stackMoved ? (
          <p className="bar__moved">
            The stack changed after the request was made, so the page has re-decided what is safe to
            send. The count above is the current one, not the requested one.
          </p>
        ) : null}

        {staged ? (
          <button type="button" className="btn" onClick={onDecline}>
            Decline the request
          </button>
        ) : (
          <button type="button" className="btn" disabled={ready === 0} onClick={onStage}>
            Stage release
          </button>
        )}
      </div>

      <div className={staged ? "bar__end bar__end--live" : "bar__end"}>
        <button type="button" className="btn btn--send" disabled={!staged} onClick={onSend}>
          <Icon name={staged ? "arrow" : "lock"} size={14} />
          {staged ? `Send ${ready} ${ready === 1 ? "mark" : "marks"}` : "Confirm release"}
          <span className="btn__only"> — human only</span>
        </button>
        <p className="bar__cap">
          {staged
            ? "Nothing can press this for you. There is no tool for it."
            : "Disabled until a release is staged. No tool can press it either way."}
        </p>
      </div>
    </div>
  );
}
