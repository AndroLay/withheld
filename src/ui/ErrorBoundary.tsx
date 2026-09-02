import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Keep one malformed render from turning the human control into a blank page. The fallback is
 * intentionally local and non-diagnostic: an exception must not expose fixture text or state.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // A fixed message is enough for local debugging without copying session or answer data into
    // a console report that a browser agent might also be able to observe.
    console.error("Withheld could not render; reload the page to recover.");
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="error-state" role="alert" aria-labelledby="error-title">
        <p className="lab">Withheld</p>
        <h1 id="error-title">The page could not render</h1>
        <p>
          Nothing was sent. Reload this page to restore the local marking session and its human-only
          release control.
        </p>
        <button type="button" className="btn btn--go" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </main>
    );
  }
}
