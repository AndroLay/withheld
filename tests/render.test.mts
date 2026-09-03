import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { after, test } from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  DEMO_FINDINGS,
  SPOON_ANSWERS,
  SPOON_QUESTION,
  SPOON_RUBRIC,
} from "../src/data/fixtures.ts";
import {
  EMPHASIS_ORDER,
  confirmRelease,
  createSession,
  holdsFor,
  proposeMarks,
  releasableAnswerIds,
  requestRelease,
  setMarkingEmphasis,
  type Session,
} from "../src/domain/session.ts";
import { agentVisibleHolds } from "../src/domain/views.ts";
import { agentFacingPayloads, toolSurfaceFacts } from "../src/tools/webmcp.ts";

/**
 * Every part of the page, rendered to static markup.
 *
 * These renders used to be a script run by hand and deleted afterwards, which made the strongest
 * claims in `docs/PROGRESS.md` rest on the weakest kind of evidence: true on the day it was run,
 * unenforced every day after. They are tests now.
 *
 * Two things they establish. First, that no tree throws — a component that reaches for
 * `session.marks[id].total` on an unmarked answer is a blank page, and nothing else in this suite
 * would catch it, because nothing else here builds an element. Second, and this is the load-bearing
 * one: that the markup carries no inline `style` attribute and asks for no class the stylesheet
 * lacks. The production page is served under `style-src 'self'` with no `'unsafe-inline'`, so an
 * inline width is dropped by the browser and a class with no rule renders a zero-width bar — a
 * student who scored nothing, drawn from a mark that was fine. Neither failure is visible by
 * looking, because a genuine zero looks exactly the same.
 *
 * What they do not establish: anything about a browser. Static markup has no layout, no cascade, no
 * focus order and no screen reader. `renderToStaticMarkup` runs no effect either, so the tool
 * registration in `useMarkingSession` and the focus move in `App` are not exercised here. See
 * `docs/PROGRESS.md` for the standing list of what has and has not been watched.
 *
 * Vite is the loader because Node's `--experimental-strip-types` erases types and cannot transform
 * JSX. The server runs in middleware mode, never listens on a port, and is closed in `after`.
 */

const SHEET = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/**
 * Every rule the sheet defines, as bare class names, taken from the sheet with its comments removed.
 *
 * `styles.test.mts` extracts the same way and keeps the prose, which does no harm when the question is
 * "does this rendered name have a rule". Backwards it does harm: the sheet's comments cite files, and a
 * pattern that cannot tell a selector from a sentence reads `tests/render.test.mts` as three rules
 * named `mts`, `test` and `ts`. Stripping first means this set holds rules and not writing about them.
 */
const DEFINED = new Set(
  Array.from(
    SHEET.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g),
    (match) => match[1],
  ),
);

const renderCacheDir = mkdtempSync(join(tmpdir(), "withheld-vite-render-"));
const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  cacheDir: renderCacheDir,
  logLevel: "silent",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await server.close();
  rmSync(renderCacheDir, { recursive: true, force: true });
});

/** One exported component, loaded through Vite so its JSX is transformed. */
async function load(module: string, name: string) {
  const loaded = await server.ssrLoadModule(module);
  assert.equal(typeof loaded[name], "function", `${name} is not exported by ${module}`);
  return loaded[name] as (props: Record<string, unknown>) => ReactElement;
}

const [ActionBar, AgentPanel, App, Audit, Compare, Intro, Rail, Stack, TopBar] = await Promise.all([
  load("/src/ui/ActionBar.tsx", "ActionBar"),
  load("/src/ui/AgentPanel.tsx", "AgentPanel"),
  load("/src/App.tsx", "App"),
  load("/src/ui/Audit.tsx", "Audit"),
  load("/src/ui/Compare.tsx", "Compare"),
  load("/src/ui/Intro.tsx", "Intro"),
  load("/src/ui/Rail.tsx", "Rail"),
  load("/src/ui/Stack.tsx", "Stack"),
  load("/src/ui/TopBar.tsx", "TopBar"),
]);
const { ErrorBoundary } = await server.ssrLoadModule("/src/ui/ErrorBoundary.tsx");

const FRESH = createSession(SPOON_RUBRIC, SPOON_ANSWERS, { question: SPOON_QUESTION });

// The worked example, applied through the same write path a teacher's ticks take. Every count below
// is derived from these two sessions rather than pinned to a number someone typed, so a change to
// the fixtures moves the expectation with the page instead of failing here for no reason.
const applied = proposeMarks(FRESH, DEMO_FINDINGS, FRESH.revision);
assert.ok(applied.ok, "the worked example must apply to a fresh session");
const MARKED = applied.session;

const requested = requestRelease(MARKED, MARKED.revision);
assert.ok(requested.ok, "a release must be stageable once the stack is marked");
const STAGED = requested.session;

// Careful, then sent. Two things happen to this session that happen to no other: it is asked to be
// stricter — the only direction a tool may push it — and then a teacher confirms what survived. Each
// half puts markup on the page nothing else reaches: a policy row that can no longer be chosen, and an
// answer closed for marking. Until this existed, the rules for both looked like dead ones.
const raised = setMarkingEmphasis(MARKED, "cautious", MARKED.revision);
assert.ok(raised.ok, "raising the emphasis one step must be allowed");
const CAREFUL = raised.session;

const staged = requestRelease(CAREFUL, CAREFUL.revision);
assert.ok(staged.ok, "a stricter pass must still leave something releasable");
const SENT = confirmRelease(staged.session);
assert.ok(SENT.releasedAnswerIds.length > 0, "confirming a staged release must send something");
assert.equal(SENT.releaseRequest, null, "confirming a release must consume the request");

const FIRST_MARKED = SPOON_ANSWERS.find((answer) => MARKED.marks[answer.id] !== undefined);
assert.ok(FIRST_MARKED, "the worked example must mark something");

/**
 * The same worked example, applied the way the WebMCP port applies it: with an operation key.
 *
 * Not one mark differs from `MARKED`. The key is the whole difference, and it is what `markProvenance`
 * reads to tell a tool's work from a teacher's — so this session is the only one that puts a `prov--tool`
 * tag on the page, and rendering it is what keeps that rule from looking like a dead one.
 */
const byTool = proposeMarks(FRESH, DEMO_FINDINGS, FRESH.revision, "op-render-provenance");
assert.ok(byTool.ok, "the worked example must apply through the tool path as well");
const TOOL_MARKED = byTool.session;

/**
 * A release staged the way `request_release` stages one, with an operation key on the receipt.
 *
 * The gate reads that key to say who asked. Nothing else on the page changes between this session and
 * `STAGED` — the same answers are staged, by the same function — so the one sentence that differs is
 * the whole subject of the test below, and the rule behind it is not a dead one.
 */
const stagedByTool = requestRelease(MARKED, MARKED.revision, "op-render-gate");
assert.ok(stagedByTool.ok, "a tool must be able to stage the marked stack");
const TOOL_STAGED = stagedByTool.session;

/**
 * The same sent session, arranged so the card opens on an answer that has already gone out.
 *
 * Two rules — the focused card's "sent" badge and the by-hand form's closed notice — are reachable
 * only when the answer the card holds open is one a teacher has already released. In every session
 * above the card opens on a held answer instead, because that is what a teacher needs to see first,
 * and while a hold exists no ordering of the list changes that. So this one leads with a released
 * answer and is handed no holds: a class whose first answer went out and whose rest tripped no rule.
 * Nothing about that state is impossible — it is only not what these fixtures happen to be.
 */
const SENT_FIRST: Session = {
  ...SENT,
  answers: [...SENT.answers].sort(
    (left, right) =>
      Number(SENT.releasedAnswerIds.includes(right.id)) -
      Number(SENT.releasedAnswerIds.includes(left.id)),
  ),
};

/** A class with nothing in it, which is the only state the queue draws its empty box for. */
const NOTHING: Session = { ...FRESH, answers: [] };

const noop = () => {};

function reasons(session: Session) {
  return new Map(holdsFor(session).map((hold) => [hold.answerId, hold.reason]));
}

function railOf(session: Session, step: number) {
  return createElement(Rail, { session, step, onEmphasis: noop });
}

/**
 * An agent that connected and registered everything. There has never been a run in which this state
 * was reached in a browser, which is exactly why it is rendered here: the live branch of the status
 * line is the one no session has ever exercised.
 */
const CONNECTED = {
  available: true,
  registered: toolSurfaceFacts().map((tool) => tool.name),
  failures: [],
  alreadyInstalled: false,
  aborted: false,
};

const PARTIAL = {
  available: true,
  registered: ["describe_stack"],
  failures: [{ name: "read_rubric", reason: "browser detail is not shown" }],
  alreadyInstalled: false,
  aborted: true,
  retry: async () => CONNECTED,
};

/**
 * An agent that is not there. Every real browser run has been in this state — no `navigator.modelContext`
 * in Chrome 151 — and it is the branch the status line spends its life in, so it is rendered too.
 */
const AWAY = {
  available: false,
  registered: [],
  failures: [],
  alreadyInstalled: false,
  aborted: false,
};

function panelOf(session: Session, installation: unknown, oneColumn = false) {
  return createElement(AgentPanel, { session, installation, oneColumn });
}

/**
 * The activity list, which is only drawn once something has actually called a tool.
 *
 * All three outcomes are in it on purpose: a read that moved nothing, a write that moved the
 * revision, and a refusal. The refusal is the row that has to exist — the session records refusals
 * nowhere, so this list is the only place one is kept, and a render that omitted it would leave the
 * only copy of that claim untested. `total` is ahead of the rows to draw the trimmed-list note.
 */
const ARRIVALS = [
  { tool: "describe_stack", revision: 1, code: null, moved: false },
  { tool: "propose_marks", revision: 2, code: null, moved: true },
  { tool: "propose_marks", revision: 2, code: "duplicate-operation", moved: false },
  { tool: "set_marking_emphasis", revision: 2, code: "stale-revision", moved: false },
];

function activePanelOf(session: Session) {
  return createElement(AgentPanel, {
    session,
    installation: CONNECTED,
    activity: { total: ARRIVALS.length + 2, recent: ARRIVALS },
    oneColumn: false,
  });
}

function partialPanelOf(session: Session) {
  return createElement(AgentPanel, {
    session,
    installation: PARTIAL,
    oneColumn: false,
    onRetry: noop,
  });
}

function barOf(session: Session, stackMoved = false) {
  return createElement(ActionBar, {
    session,
    held: holdsFor(session).length,
    ready: releasableAnswerIds(session).length,
    stackMoved,
    onStage: noop,
    onSend: noop,
    onDecline: noop,
  });
}

/**
 * The band, in either view. The hold map is built the way `App` builds it — the teacher's view gets
 * every hold, the agent's view gets `agentVisibleHolds` — because the strip's states are derived from
 * that map and handing the agent's view the full one would draw holds no tool would have named.
 */
function introOf(session: Session, lens: "yours" | "agent" = "yours") {
  const heldReason =
    lens === "agent"
      ? new Map(agentVisibleHolds(session).map((hold) => [hold.answerId, hold.reason]))
      : reasons(session);

  return createElement(Intro, {
    session,
    held: holdsFor(session).length,
    heldReason,
    lens,
    onLens: noop,
  });
}

/** The queue in the agent's view, handed the same filtered map for the same reason. */
function agentStackOf(session: Session) {
  return createElement(Stack, {
    session,
    heldReason: new Map(agentVisibleHolds(session).map((hold) => [hold.answerId, hold.reason])),
    lens: "agent",
    onSave: noop,
    onMark: noop,
  });
}


/**
 * Every render, named. The sweeps below walk all of them; the tests after that reach for one.
 *
 * Both states of the panel and both of the bar are here on purpose: an absence is a state too, and
 * "the send button is locked" and "the send button is live" are different markup that the same test
 * run has to see. The panel is rendered five times for the same reason — no agent yet, an agent that
 * is not there at all, an agent with every tool registered, nothing marked yet, and the column folded
 * into a panel for one column are five different columns. The introduction is rendered twice because
 * its third figure swaps sentence at the first mark, and the unmarked branch is the one every arriving
 * reader sees.
 *
 * The three renders of a sent session are here because of the sweep below rather than the tests: after
 * a release the stack, the rail and the comparison each change shape, and a rule that only that state
 * asks for is indistinguishable from a dead one until something renders it. The four extra stacks are
 * there for the same reason, and three of them are the only renders on this list handed a hold map that
 * is not the page's own — an answer already sent, an answer ready to go, and a view with nothing in it
 * are three shapes of the queue that the fixtures cannot reach while anything is being held back. The
 * fourth is the same worked example with an operation key on it, which is the one state that tags a row
 * as a tool's work rather than a teacher's.
 *
 * Six more are the band's other view, and they are not this markup with a class on it: the agent's view
 * is built from the projections the tools return, so the queue, the audit and the comparison each
 * render a different tree there. Both of the band's sentences are on the list — the one that counts the
 * holds an agent cannot name, and the one for a session where there are none — and so is an audit whose
 * every hold is a boundary hold, which is the only way to reach a list with nothing in it under a
 * heading that still counts three.
 */
const RENDERS: Record<string, string> = {
  "the top bar": renderToStaticMarkup(
    createElement(TopBar, { session: MARKED, held: holdsFor(MARKED).length }),
  ),
  "the introduction, nothing marked": renderToStaticMarkup(introOf(FRESH)),
  "the introduction, marked": renderToStaticMarkup(introOf(MARKED)),
  "the introduction, a release sent": renderToStaticMarkup(introOf(SENT)),
  "the introduction, the agent's view": renderToStaticMarkup(introOf(MARKED, "agent")),
  "the introduction, the agent's view with nothing held": renderToStaticMarkup(
    introOf(FRESH, "agent"),
  ),
  "the left rail, nothing marked": renderToStaticMarkup(railOf(FRESH, 1)),
  "the left rail, a release waiting": renderToStaticMarkup(railOf(STAGED, 4)),
  "the left rail, a release sent": renderToStaticMarkup(railOf(SENT, 4)),
  "the stack, marked from the worked example": renderToStaticMarkup(
    createElement(Stack, {
      session: MARKED,
      heldReason: reasons(MARKED),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, marked by a tool call": renderToStaticMarkup(
    createElement(Stack, {
      session: TOOL_MARKED,
      heldReason: reasons(TOOL_MARKED),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, a release sent": renderToStaticMarkup(
    createElement(Stack, {
      session: SENT,
      heldReason: reasons(SENT),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, an answer already sent": renderToStaticMarkup(
    createElement(Stack, {
      session: SENT_FIRST,
      heldReason: new Map(),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, a ready answer open": renderToStaticMarkup(
    createElement(Stack, {
      session: MARKED,
      heldReason: new Map(),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, nothing in this view": renderToStaticMarkup(
    createElement(Stack, {
      session: NOTHING,
      heldReason: new Map(),
      onSave: noop,
      onMark: noop,
    }),
  ),
  "the stack, the agent's view": renderToStaticMarkup(agentStackOf(MARKED)),
  "the agent panel, nothing marked": renderToStaticMarkup(panelOf(FRESH, null)),
  "the agent panel, marked": renderToStaticMarkup(panelOf(MARKED, null)),
  "the agent panel, no agent in this browser": renderToStaticMarkup(panelOf(MARKED, AWAY)),
  "the agent panel, an agent connected": renderToStaticMarkup(panelOf(MARKED, CONNECTED)),
  "the agent panel, with calls that have arrived": renderToStaticMarkup(activePanelOf(TOOL_MARKED)),
  "the agent panel, folded for one column": renderToStaticMarkup(panelOf(MARKED, null, true)),
  "the policy comparison": renderToStaticMarkup(createElement(Compare, { session: MARKED })),
  "the policy comparison, a release sent": renderToStaticMarkup(
    createElement(Compare, { session: SENT }),
  ),
  "the policy comparison, the agent's view": renderToStaticMarkup(
    createElement(Compare, { session: MARKED, lens: "agent" }),
  ),
  "the audit rail": renderToStaticMarkup(
    createElement(Audit, { session: MARKED, holds: holdsFor(MARKED) }),
  ),
  "the audit rail, the agent's view": renderToStaticMarkup(
    createElement(Audit, { session: MARKED, holds: holdsFor(MARKED), lens: "agent" }),
  ),
  // A class held back only for sitting inside the band. Nothing about it is contrived — no long answer,
  // nothing that read as an instruction — and it is the one shape in which the audit's heading counts
  // holds while the list under it has nothing to show an agent.
  "the audit rail, the agent's view with nothing it can name": renderToStaticMarkup(
    createElement(Audit, {
      session: MARKED,
      holds: holdsFor(MARKED).filter((hold) => hold.reason === "near-boundary"),
      lens: "agent",
    }),
  ),
  "the action bar, idle": renderToStaticMarkup(barOf(MARKED)),
  "the action bar, a release staged": renderToStaticMarkup(barOf(STAGED)),
  "the action bar, a release staged by a tool call": renderToStaticMarkup(barOf(TOOL_STAGED)),
  "the action bar, the stack scrolled away": renderToStaticMarkup(barOf(STAGED, true)),
  "the whole page": renderToStaticMarkup(createElement(App, {})),
};

/** Every class name the markup asks for, one entry per use rather than per name. */
function classesIn(html: string): string[] {
  return Array.from(html.matchAll(/class="([^"]*)"/g))
    .flatMap((match) => (match[1] ?? "").split(/\s+/))
    .filter(Boolean);
}

function times(html: string, token: string): number {
  return classesIn(html).filter((name) => name === token).length;
}

function occurrences(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

function renderOf(what: string): string {
  const html = RENDERS[what];
  assert.ok(html, `no render named ${what}`);
  return html;
}

test("every part of the page renders without throwing", () => {
  for (const [what, html] of Object.entries(RENDERS)) {
    assert.ok(html.length > 400, `${what} rendered only ${html.length} characters`);
  }

  assert.equal(Object.keys(RENDERS).length, 33);
});

test("no render emits an inline style attribute", () => {
  for (const [what, html] of Object.entries(RENDERS)) {
    assert.equal(
      html.includes('style="'),
      false,
      `${what} carries an inline style, and style-src 'self' drops it in the hosted build`,
    );
  }
});

test("every class the page asks for has a rule in the stylesheet", () => {
  const asked = new Set(Object.values(RENDERS).flatMap(classesIn));
  const missing = Array.from(asked)
    .filter((name) => !DEFINED.has(name))
    .sort();

  assert.deepEqual(missing, [], "class names asked for with no rule behind them");

  // A floor under the sweep. Without it, a refactor that stopped rendering most of the page would
  // still pass this test, on a nearly empty set.
  assert.ok(asked.size > 150, `only ${asked.size} distinct class names rendered`);
});

/**
 * The same question backwards: a rule in the sheet that nothing on the page asks for.
 *
 * This direction cannot break the page, which is why it went unchecked by hand for so long and why
 * `docs/PROGRESS.md` had to say so. It still matters: dead CSS is a claim about the page that is no
 * longer true, and under a policy with no `'unsafe-inline'` the sheet is the only place a width or a
 * colour can live, so it is the file that accumulates.
 *
 * Most of what this found was not dead but unrendered — a sent answer, a locked policy row, a browser
 * with no agent in it — and the fix was to render those states above rather than to excuse them here.
 * What remains below is only what static markup cannot reach at all, with the reason written out. A
 * whitelist that grows is the smell; each line has to earn its place.
 */
const REACHED_ELSEWHERE = [
  {
    pattern: /^bars__fill--(\d{1,3})$/,
    why: "a quantised stop, proved reachable by tests/styles.test.mts",
  },
  {
    pattern: /^notice$/,
    why: "App's transient message, set by a handler and gone on the next action; no static render holds it",
  },
  {
    pattern: /^delta--on$/,
    why: "an answer landing exactly on the pass mark, which this rubric's points cannot sum to — see the test below",
  },
  {
    pattern: /^error-state$/,
    why: "ErrorBoundary's recovery screen, reachable only after a runtime render failure",
  },
  {
    pattern: /^tick__conflict$/,
    why: "the manual form's live revision-conflict state, reachable only after an external write",
  },
];

test("every rule in the stylesheet has something that asks for it", () => {
  const asked = new Set(Object.values(RENDERS).flatMap(classesIn));
  const orphans = Array.from(DEFINED)
    .filter((name) => !asked.has(name))
    .filter((name) => !REACHED_ELSEWHERE.some((family) => family.pattern.test(name)))
    .sort();

  assert.deepEqual(orphans, [], "rules in styles.css that nothing renders");
});

test("no answer can land exactly on the pass mark, which is why delta--on is excused", () => {
  // The excuse above is arithmetic, not an opinion, and this is the arithmetic. `delta--on` and the
  // words "on the mark" are reachable only when a held answer's credited total equals the boundary
  // exactly. With four rubric lines there are sixteen possible totals; if the fixtures ever change so
  // that one of them is the boundary, this fails and the whitelist entry has to go, replaced by a
  // render of that answer. A dead branch and an unrendered one deserve different treatment.
  const points = SPOON_RUBRIC.lines.map((line) => line.points);
  const totals = points.reduce<number[]>((sums, point) => sums.concat(sums.map((sum) => sum + point)), [
    0,
  ]);

  assert.equal(totals.length, 2 ** points.length, "a subset total was counted twice");
  assert.equal(
    totals.includes(SPOON_RUBRIC.passBoundary),
    false,
    `some subset of ${points.join(", ")} sums to the ${SPOON_RUBRIC.passBoundary} pass mark`,
  );
});

/**
 * The bar across the top, and the one thing it must not grow: a second control that sends a mark.
 *
 * The target image draws the release control up here, as a filled black button. Both of the bar's
 * controls are anchors instead, and this test is what keeps them anchors — the page's whole argument is
 * that exactly one control releases a mark and it is at the foot of the page.
 */
test("the top bar states the whole page's facts and performs nothing", () => {
  const html = renderOf("the top bar");

  assert.ok(html.includes("Withheld"));
  assert.ok(
    html.includes(`class="num">${String(MARKED.revision).padStart(2, "0")}</span>`),
    "the revision on the bar is the session's own",
  );

  assert.equal(occurrences(html, /<button/g), 0, "nothing in the bar acts");
  assert.equal(occurrences(html, /<a /g), 2, "two anchors: the audit, and the gate");
  assert.ok(html.includes('href="#audit-title"'));
  assert.ok(html.includes('href="#gate-title"'));
});

/**
 * The band under the bar: one sentence, the view toggle, the whole class as a strip, and four figures.
 *
 * None of the four is typed. The target image draws `14 / 0 / 1 / 0` — one answer held back before
 * anything has been marked — and that state cannot exist here, because a hold is derived from a mark.
 *
 * The band commits nothing, and the two buttons it does carry are why this test is worth keeping: they
 * choose whose view is drawn and touch neither the marks nor the holds. The strip's cells are anchors
 * down the page, in the bar's idiom, and the worked-example button lives at the foot of the queue beside
 * the answers it marks.
 */
test("the band prints the session's four figures and performs nothing", () => {
  const html = renderOf("the introduction, nothing marked");

  assert.equal(times(html, "count"), 4, "answers, marked, held, staged");

  for (const [value, label] of [
    [SPOON_ANSWERS.length, "answers"],
    [0, "marked"],
    [0, "held"],
    [0, "staged"],
  ] as const) {
    assert.ok(
      html.includes(`>${value}</span><span class="count__of">${label}</span>`),
      `the ${label} figure is not the session's own`,
    );
  }

  assert.equal(occurrences(html, /<button/g), 2, "the band's only controls are the two views");
  assert.equal(times(html, "lens__btn"), 2, "one button per view, and no third thing to press");
  assert.equal(
    occurrences(html, /aria-pressed="true"/g),
    1,
    "exactly one view is the one you are reading",
  );
  assert.equal(
    occurrences(html, /<a /g),
    SPOON_ANSWERS.length,
    "one anchor per cell, and nothing else in the band navigates",
  );
  assert.equal(occurrences(html, /<h1/g), 0, "the page's one h1 belongs to the queue");
  assert.ok(html.includes('role="status"'), "the live region is in the markup before it has text");
});

/**
 * The strip, which is the pager's replacement: every answer at once, in arrival order.
 *
 * Two things it must never get wrong. Its folio has to be the position in the whole class, matching
 * the row it points at, or the strip and the queue are two different orderings of the same students.
 * And a boundary hold has to be marked as one — not because the teacher needs the distinction, but
 * because the agent's view keys off that class to stop the strip handing over the identity that
 * `agentHoldReason` withholds.
 */
test("the strip carries every answer, points each one at its row, and marks the unnameable holds", () => {
  const fresh = renderOf("the introduction, nothing marked");
  const marked = renderOf("the introduction, marked");
  const sent = renderOf("the introduction, a release sent");
  const holds = holdsFor(MARKED);
  const secret = holds.filter((hold) => hold.reason === "near-boundary");

  assert.equal(times(fresh, "cell"), SPOON_ANSWERS.length);
  assert.equal(times(fresh, "cell--waiting"), SPOON_ANSWERS.length, "nothing marked is nothing shaded");
  assert.equal(
    occurrences(fresh, /data-who="/g),
    SPOON_ANSWERS.length,
    "every cell names its student, and does it without adding a word to the page's text",
  );

  for (const answer of SPOON_ANSWERS) {
    assert.ok(fresh.includes(`href="#line-${answer.id}"`), `${answer.id} has no cell pointing at it`);
    assert.ok(fresh.includes(`${answer.studentAlias}, not marked`), `${answer.id} has no label`);
  }

  // The folio in the first cell is the first answer's position in the class, padded the way the row
  // pads it. `Stack`'s own folio map is `index + 1` over the same array.
  assert.ok(fresh.includes('<span class="cell__folio num" aria-hidden="true">01</span>'));

  assert.ok(secret.length > 0, "the fixture must hold something it will not name to the agent");
  assert.equal(times(marked, "cell--secret"), secret.length);
  assert.equal(times(marked, "cell--held") + times(marked, "cell--quar"), holds.length);
  assert.equal(
    times(marked, "cell--ready"),
    Object.keys(MARKED.marks).length - holds.filter((hold) => MARKED.marks[hold.answerId]).length,
    "a ready cell is a marked answer with no hold on it",
  );

  // Filled black is the release path and nothing else, so it appears only once a person has confirmed.
  assert.equal(times(marked, "cell--sent"), 0);
  assert.equal(times(sent, "cell--sent"), SENT.releasedAnswerIds.length);
});

test("the band's figures move with the session", () => {
  const html = renderOf("the introduction, marked");
  const held = holdsFor(MARKED).length;
  const marked = Object.keys(MARKED.marks).length;

  assert.ok(held > 0, "the worked example must hold something back");
  assert.ok(html.includes(`>${marked}</span><span class="count__of">marked</span>`));
  assert.ok(html.includes(`>${held}</span><span class="count__of">held</span>`));
  assert.ok(
    html.includes(`${held} held back for you`),
    "the status region says what changed, for a reader standing above the queue",
  );
});

test("the rail marks exactly one step as the one you are in, and each step says where to look", () => {
  const html = renderOf("the left rail, nothing marked");

  assert.equal(occurrences(html, /aria-current="step"/g), 1);
  assert.equal(occurrences(renderOf("the left rail, a release waiting"), /aria-current="step"/g), 1);

  assert.equal(times(html, "step__badge"), 4, "four steps");
  assert.equal(times(html, "step__act"), 4, "each step names the act it is");
  assert.equal(times(html, "care__radio"), EMPHASIS_ORDER.length);
  assert.equal(
    occurrences(html, /disabled=""/g),
    0,
    "no care setting is unavailable at the standard setting",
  );
});

test("the queue shows the class as rows, opens details in place, and draws no bar of its own", () => {
  const html = renderOf("the stack, marked from the worked example");
  const marked = Object.keys(MARKED.marks).length;
  const rows = times(html, "line__box");
  const tabs = rows * 4;

  // Every student is on screen. The queue used to open one answer in a card above three rows and keep
  // the other ten behind a *Next 3* control, which also meant the open answer was on the page twice.
  // Nothing about a class of fourteen justified a pager. `docs/DECISIONS.md` D-31.
  assert.equal(rows, SPOON_ANSWERS.length, "every answer stays reachable in the queue");
  assert.equal(
    occurrences(html, /id="line-/g),
    rows,
    "every row is anchored, so the strip in the band has somewhere to point",
  );
  assert.ok(
    html.includes(`>${rows}</span> of <span class="num">${SPOON_ANSWERS.length}</span>`),
    "the head's count disagrees with the rows below it",
  );

  assert.equal(occurrences(html, /<form/g), rows, "a mark form in every row");
  assert.equal(
    occurrences(html, /type="checkbox"/g),
    rows * SPOON_RUBRIC.lines.length,
    "every rubric line is tickable on every answer",
  );

  // Four panels per row, all four in the markup, exactly one of them open. Which one is the cascade's
  // business — `:checked ~ .tabs__panel` switches it — so there is no state here that could disagree
  // with a half-finished mark, and a static render can still be swept for what all four panels ask for.
  assert.equal(times(html, "tabs__pick"), tabs, "each row exposes the four detail panels");
  assert.equal(times(html, "tabs__tab"), tabs, "every panel has a label to click");
  assert.equal(times(html, "tabs__panel"), tabs, "each row has one panel per tab");
  assert.equal(occurrences(html, /type="radio"/g), tabs, "the tabs are a radio group, not a script");
  assert.equal(
    occurrences(html, /class="tabs__pick"[^>]*checked=""/g),
    rows,
    "exactly one panel is open in each row",
  );

  // The queue states figures as figures — a total, a pass mark, a word — and draws no proportional
  // length anywhere. The audit below it owns the one bar on the page, next to the reasoning it belongs
  // to, so a reader is never asked to compare two bars that were drawn for different purposes.
  assert.equal(times(html, "bars__fill"), 0, "the queue is drawing a bar the audit already draws");

  assert.equal(
    marked,
    SPOON_ANSWERS.length - 1,
    "one answer addressed the marker, so it is quarantined and has no mark at all",
  );
});

test("a row says whether a tool or a person named its rubric lines", () => {
  const byHand = renderOf("the stack, marked from the worked example");
  const byTool = renderOf("the stack, marked by a tool call");
  const named = DEMO_FINDINGS.length;

  // One worked example, two write paths, and the only difference between them is the operation key the
  // WebMCP port hands in. Nothing was added to the domain to draw this: `commit` has been writing that
  // key onto receipts since the port existed, and `markProvenance` reads it back out.
  assert.equal(times(byHand, "prov--hand"), named, "a teacher's ticks are tagged as a person's");
  assert.equal(times(byHand, "prov--tool"), 0, "nothing in this session was written by a tool");
  assert.equal(times(byTool, "prov--tool"), named, "an accepted tool write is tagged as one");
  assert.equal(times(byTool, "prov--hand"), 0, "the tool path is not a teacher's");

  // The tag follows the receipt trail rather than the mark, so the quarantined answer carries one too:
  // something did name lines on it, and the page credited none of them.
  assert.ok(
    named > Object.keys(MARKED.marks).length,
    "the quarantined answer is named but not marked",
  );

  // And an agent cannot read its own fingerprint back: no tool result carries the operation key, which
  // `tests/webmcp.test.mts` holds, so this tag exists on the page and nowhere else.
  assert.equal(
    times(renderOf("the stack, nothing in this view"), "prov"),
    0,
    "an unwritten session has nothing to attribute",
  );
});

test("the panel lists exactly the registered surface", () => {
  const html = renderOf("the agent panel, marked");
  const tools = toolSurfaceFacts();

  assert.equal(times(html, "tool"), tools.length, "every registered tool, and no unavailable operation");
  assert.ok(html.includes("human-only gate is at the foot of the page"));

  for (const fact of tools) {
    assert.ok(html.includes(fact.name), `${fact.name} registers but is not on the page`);
  }

  assert.equal(times(html, "crosses__item"), 5, "five things no result can carry");
});

/**
 * The read/write split, counted from the registrations rather than read off the page. Each row carries
 * its own role as a word, and the note under the list carries the total — both are derived, because a
 * hand-typed six would survive a new tool being added and would then be a claim about a surface that
 * no longer exists.
 */
test("the panel counts the read and write tools the way the registrations do", () => {
  const html = renderOf("the agent panel, marked");
  const tools = toolSurfaceFacts();
  const reads = tools.filter((tool) => tool.readOnly).length;

  assert.equal(reads, 6);
  assert.equal(tools.length - reads, 3);
  assert.equal(times(html, "tool--read"), reads);
  assert.equal(times(html, "tool--write"), tools.length - reads);

  // The role word on every real row. A row without its word would be a name with no indication of
  // what calling it does.
  assert.equal(times(html, "tool__role"), tools.length);
  assert.equal(occurrences(html, />read</g), reads);
  assert.equal(occurrences(html, />write</g), tools.length - reads);

  assert.ok(
    html.includes(`>${tools.length}</span> registrations`),
    "the note under the list disagrees with the registrations it is counting",
  );
});

test("the error boundary fallback is fixed and non-diagnostic", () => {
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(new Error("private fixture detail")), {
    failed: true,
  });

  const boundary = new ErrorBoundary({ children: createElement("p", null, "healthy") });
  boundary.state = { failed: true };
  const html = renderToStaticMarkup(boundary.render());

  assert.ok(html.includes("The page could not render"));
  assert.ok(html.includes("Reload page"));
  assert.equal(html.includes("private fixture detail"), false);
});

/**
 * The two states of the status line that matter, and the one no run has ever reached.
 *
 * `installation: null` is the feature check still outstanding; a browser with no WebMCP settles into
 * "not available"; the live branch has only ever been rendered by this test. Rendering it here is the
 * whole reason it is trustworthy at all — it is not evidence that an agent has ever connected.
 */
test("the panel says whether an agent is here, without needing one to be", () => {
  const waiting = renderOf("the agent panel, marked");
  const live = renderOf("the agent panel, an agent connected");
  const partial = renderToStaticMarkup(partialPanelOf(MARKED));

  assert.equal(times(waiting, "conn--wait"), 1, "no installation yet is its own state");
  assert.equal(times(waiting, "conn--live"), 0);
  assert.ok(waiting.includes("Checking for a browser agent"));

  assert.equal(times(live, "conn--live"), 1);
  assert.equal(times(live, "conn--wait"), 0);
  assert.ok(live.includes("tools offered to your agent"));
  assert.ok(
    live.includes("None of them can send a mark"),
    "the live state is the one that most needs to say what the surface cannot do",
  );

  assert.ok(partial.includes("Tool registration is incomplete"));
  assert.ok(partial.includes("Retry registration"));
  assert.ok(!partial.includes("browser detail is not shown"));

  // Every state but the live one offers a way to get an agent here, and it is an anchor: a button
  // that cannot connect anything would be the one dishonest control in the column.
  assert.equal(times(waiting, "conn__act"), 1);
  assert.equal(times(live, "conn__act"), 0, "there is nothing to connect once one is connected");
});

/** The one control an agent has no tool for, pointed at without adding an agent-side control. */
test("the contract column points at the release gate instead of carrying a second one", () => {
  const html = renderOf("the agent panel, marked");

  assert.equal(times(html, "only"), 1);
  assert.ok(html.includes('href="#gate-title"'), "the foot of the column links to the gate");
  assert.equal(occurrences(html, /<button/g), 0, "the agent's column has no controls in it at all");
});

test("in one column the contract is a panel that opens; beside the work it is not one", () => {
  const folded = renderOf("the agent panel, folded for one column");
  const wide = renderOf("the agent panel, marked");

  // The browser's own disclosure, closed to begin with. No `open` attribute and no state of ours: on a
  // phone the reader should meet the stack and the gate first and reach this when they want it.
  assert.ok(folded.includes('<details class="fold">'), "the folded column is not a details element");
  assert.equal(folded.includes('class="fold" open'), false, "it must start closed");
  assert.ok(folded.includes('<summary class="fold__head">'), "there is nothing to press");

  // The title stays the column's name in both shapes, which is what `aria-labelledby` points at.
  assert.match(
    folded,
    /<summary class="fold__head">[\s\S]*?id="agent-title"[\s\S]*?<\/summary>/,
    "the heading has to be in the summary, or a closed panel is an unnamed one",
  );
  assert.ok(wide.includes('id="agent-title"'));
  assert.equal(wide.includes("fold__head"), false, "a wide screen must have no summary to press");

  // One body, two shells. Folding is about when the column is read, not about what it says, so
  // everything the wide shape argues has to be inside the folded one too.
  for (const part of ["propose_marks", "Only a person can send it", "proj__json"]) {
    assert.ok(folded.includes(part), `${part} is missing from the folded column`);
    assert.ok(wide.includes(part), `${part} is missing from the wide column`);
  }

  // Both labels ship and the sheet shows one, so the summary's accessible name is right in either
  // state without a script deciding it.
  assert.ok(folded.includes("fold__more fold__more--shut"));
  assert.ok(folded.includes("fold__more fold__more--open"));
});

test("the panel prints one projection per payload, and explains the empty state before anything is marked", () => {
  const marked = renderOf("the agent panel, marked");
  const fresh = renderOf("the agent panel, nothing marked");

  assert.equal(times(marked, "proj__box"), agentFacingPayloads(MARKED, FIRST_MARKED.id).length);
  assert.equal(occurrences(marked, /<pre/g), agentFacingPayloads(MARKED, FIRST_MARKED.id).length);
  assert.equal(times(marked, "empty"), 0);

  assert.equal(times(fresh, "proj__box"), agentFacingPayloads(FRESH, null).length);
  assert.equal(times(fresh, "empty"), 1);
  assert.ok(fresh.includes("explain_mark is not in the list above"));
});

test("the panel prints the held-versus-named gap only when there is one", () => {
  const held = holdsFor(MARKED).length;
  const named = agentVisibleHolds(MARKED).length;

  assert.ok(held > named, "the fixture must hold back something it will not name to the agent");
  assert.equal(times(renderOf("the agent panel, marked"), "gapline"), 1);

  // Nothing marked is nothing held, and a line reading "0 answers are held" would be noise.
  assert.equal(holdsFor(FRESH).length, 0);
  assert.equal(times(renderOf("the agent panel, nothing marked"), "gapline"), 0);
});

test("the comparison shows all three settings with exactly one of them selected", () => {
  const html = renderOf("the policy comparison");

  assert.equal(times(html, "grid__col"), EMPHASIS_ORDER.length);
  assert.equal(times(html, "tagpill"), 1, "exactly one column is badged Selected");
  assert.equal(times(html, "grid__row"), 5, "held, ready, pass, fail, and the sub-row under them");
});

test("the audit rail accounts for every hold, and prints an uncredited line as a dash", () => {
  const html = renderOf("the audit rail");
  const holds = holdsFor(MARKED);

  assert.equal(times(html, "entry__box"), holds.length);

  // One disclosure per hold, plus the account itself and the closed slab of things marking does not
  // settle at the foot of the column. The count is written as a sum rather than a literal so that a
  // further disclosure appearing in here has to be argued for in this file before the test goes green.
  assert.equal(occurrences(html, /<details/g), holds.length + 2);

  // Two of the three are open: the first hold, and the account around it. Nothing else is, and the
  // second one is load-bearing rather than decorative — `scripts/browser-session.mjs` measures the
  // width of every `.bars__fill` in the live layout, and a bar inside a closed `<details>` has no
  // layout to measure. A change that shuts this slab by default takes the page's only proportional
  // lengths out of the reach of the probe that proves they are drawn.
  assert.equal(occurrences(html, / open=""/g), 2, "the account and its first hold, and nothing else");
  assert.equal(times(html, "chain"), holds.length, "a causal chain per hold");

  const withMark = holds.filter((hold) => MARKED.marks[hold.answerId] !== undefined);
  assert.equal(times(html, "bars__row"), withMark.length * 2, "a credited rail and a pass-mark rail, per marked hold");

  // The uncredited span carries `aria-hidden`, so the attribute list is not always closed by the
  // class: a dash is decoration for a screen reader, and the label beside it already says "missed".
  const points = Array.from(
    html.matchAll(/class="lines__points num"[^>]*>([^<]*)</g),
    (match) => match[1],
  );
  const missed = withMark.reduce(
    (total, hold) =>
      total + SPOON_RUBRIC.lines.length - (MARKED.marks[hold.answerId]?.awardedLineIds.length ?? 0),
    0,
  );

  assert.equal(points.length, withMark.length * SPOON_RUBRIC.lines.length);
  assert.equal(points.filter((value) => value === "—").length, missed);
  assert.equal(
    points.includes("0"),
    false,
    "a line that earned nothing prints a dash; a zero would read as an awarded zero",
  );
});

/**
 * Every figure the page owns, gathered from the fixtures rather than typed: the rubric's point values,
 * the pass mark, what a perfect answer would total, and the total of every answer the worked example
 * marked.
 *
 * Small numbers are left out on purpose. A figure at or below the class size cannot be told apart from
 * a count the agent is entitled to — the number of answers, the number held, a folio in the strip — so
 * a canary that forbade `4` would be failing on `4 answers` and would have to be whitelisted into
 * uselessness. The floor is the fixture's own class size, not a number chosen to make this pass.
 */
const PAGE_OWNED_FIGURES = Array.from(
  new Set([
    ...SPOON_RUBRIC.lines.map((line) => line.points),
    SPOON_RUBRIC.passBoundary,
    SPOON_RUBRIC.lines.reduce((sum, line) => sum + line.points, 0),
    ...Object.values(MARKED.marks).map((mark) => mark.total),
  ]),
)
  .filter((value) => value > SPOON_ANSWERS.length)
  .sort((left, right) => left - right);

/**
 * The student's own words, which are the one thing on the page that is not the page's to withhold.
 * `read_answer` hands an agent the body verbatim, so a digit inside one is the student's arithmetic
 * and not a leak. Two regions carry it: the row's preview and the by-hand form's copy of the answer.
 */
const UNTRUSTED_REGIONS = [
  /<p class="line__peek"[^>]*>[\s\S]*?<\/p>/g,
  /<blockquote class="hand__body"[^>]*>[\s\S]*?<\/blockquote>/g,
];

/** An icon is geometry. Its path data is full of coordinates and none of them is a mark. */
function withoutIconGeometry(html: string): string {
  return html.replace(/<svg[\s\S]*?<\/svg>/g, "");
}

function figuresLeftIn(html: string): number[] {
  const prose = UNTRUSTED_REGIONS.reduce(
    (text, region) => text.replace(region, ""),
    withoutIconGeometry(html),
  );

  return PAGE_OWNED_FIGURES.filter((value) =>
    new RegExp(`(?<![\\d-])${value}(?![\\d])`).test(prose),
  );
}

/**
 * The load-bearing test of the band's second view: in it, no figure the page owns is anywhere in the
 * markup.
 *
 * Not hidden, not greyed, not covered over — absent. The mockup this layout follows redacts with CSS,
 * `color: transparent` and a dash drawn by `::after`, which leaves every total in the DOM, in
 * `innerText` and in the accessibility tree for anyone who opens an inspector. `visibility: hidden`
 * would be no better: a hidden box still returns client rects. So the components take the projection a
 * tool would have returned instead, and this test is the proof that nothing else came with it.
 *
 * The sweep runs over the whole of each render, attributes included, so a total smuggled into an
 * `aria-label` or a `data-` attribute fails here too. What it cannot see is anything a browser adds
 * after paint; `docs/RUNBOOK.md` records the sweep that watches for that.
 */
test("the agent's view of the page carries no figure the page owns", () => {
  assert.ok(
    PAGE_OWNED_FIGURES.length > 8,
    `only ${PAGE_OWNED_FIGURES.length} page-owned figures to look for`,
  );

  for (const what of [
    "the introduction, the agent's view",
    "the stack, the agent's view",
    "the audit rail, the agent's view",
    "the policy comparison, the agent's view",
  ]) {
    assert.deepEqual(
      figuresLeftIn(renderOf(what)),
      [],
      `${what} prints a figure the page owns`,
    );
  }

  // The same sweep over the teacher's view has to find plenty, or the test above is passing because the
  // pattern never matches anything rather than because the view is clean.
  assert.ok(
    figuresLeftIn(renderOf("the stack, marked from the worked example")).length > 4,
    "the teacher's queue must print the figures the agent's view drops",
  );
});

/**
 * The other half of the claim: the agent's view is not the teacher's list with rows deleted.
 *
 * A hold for sitting inside the boundary band is the one hold `list_held_answers` will not name, and it
 * is not merely unlabelled there — the row is drawn as what an agent believes it to be, which is an
 * answer that tripped no rule. The audit's heading keeps the true count beside a list that cannot show
 * it, and those two figures disagreeing on screen is the tool result's shape rather than a bug.
 */
test("a hold the page will not name is absent from the agent's view and still counted", () => {
  const holds = holdsFor(MARKED);
  const named = agentVisibleHolds(MARKED);
  const unnamed = holds.length - named.length;

  assert.ok(unnamed > 0, "the fixture must hold something back the agent is not told about");

  const queue = renderOf("the stack, the agent's view");
  const audit = renderOf("the audit rail, the agent's view");

  assert.equal(times(queue, "cell--secret"), 0, "the strip cannot mark what it was not handed");
  assert.equal(times(audit, "entry__box"), named.length, "one entry per hold a tool would name");
  assert.ok(
    audit.includes(`class="num">${holds.length}</span> waiting on you`),
    "the heading still counts every hold, including the ones it cannot list",
  );
  assert.ok(
    audit.includes(`class="num">${named.length}</span> named to your agent`),
    "and says how many of them a tool would name",
  );

  const nothingNameable = renderOf("the audit rail, the agent's view with nothing it can name");

  assert.equal(times(nothingNameable, "entry__box"), 0);
  assert.ok(nothingNameable.includes("Nothing your agent can name."));
});

test("the send button is locked until a person stages a release", () => {
  const idle = renderOf("the action bar, idle");
  const staged = renderOf("the action bar, a release staged");

  assert.equal(times(idle, "bar--waiting"), 0);
  assert.equal(times(idle, "bar__end--live"), 0);
  assert.equal(occurrences(idle, /disabled=""/g), 1, "the send button, and nothing else");
  assert.ok(
    idle.includes("No tool can press it either way."),
    "the locked cap has to say the lock is not a permission a tool could be given",
  );

  assert.equal(times(staged, "bar--waiting"), 1);
  assert.equal(times(staged, "bar__end--live"), 1);
  assert.equal(occurrences(staged, /disabled=""/g), 0);
  assert.ok(staged.includes("Decline the request"), "a staged request can be cleared");
  assert.ok(staged.includes("There is no tool for it."));

  const moved = renderOf("the action bar, the stack scrolled away");
  assert.ok(moved.includes("The request was for"), "a changed staged request needs an explicit diff");

  // The one control on the page that sends says so on itself, in both states, so the claim travels
  // with the button rather than living only in the caption under it.
  assert.equal(times(idle, "btn__only"), 1);
  assert.equal(times(staged, "btn__only"), 1);

  // Focus moves to the heading rather than to the send button: a release can be staged by an agent,
  // so an agent must not be able to leave an irreversible action one keystroke away.
  assert.ok(staged.includes('tabindex="-1"'));
});

test("the whole page renders as one tree", () => {
  const html = renderOf("the whole page");

  // One of each region, and three slabs below the fold. Counted as regions rather than as a single
  // card class: the redesign gave the three columns different shells on purpose, so a count of one
  // shared class would no longer be a statement about the page's shape.
  assert.equal(times(html, "app__cols"), 1);
  for (const region of ["work", "rail", "contract", "queue", "audit"]) {
    assert.equal(times(html, region), 1, `the page draws ${region} more than once, or not at all`);
  }
  assert.equal(times(html, "slab"), 3, "the audit, the comparison, and the limits");
  assert.ok(html.includes("No natural-language model has driven these tools here"));

  // One band, above the columns rather than inside one of them, and it did not take the page's `h1`
  // off the marking surface.
  assert.equal(times(html, "band"), 1);
  assert.equal(occurrences(html, /<h1/g), 1, "the queue keeps the only h1");
  assert.ok(html.indexOf('class="band"') < html.indexOf('id="stack-title"'));

  // App builds its own session, so this render is the page as it first arrives: nothing marked,
  // nothing held, and the tour standing on step one.
  assert.equal(occurrences(html, /aria-current="step"/g), 1);
});

test("the activity list keeps a refusal the session does not", () => {
  // A refusal changes nothing in the session, so the revision timeline below it cannot show one. If
  // this list did not keep it either, the page would have no record that a call was ever turned away.
  const html = renderOf("the agent panel, with calls that have arrived");

  assert.equal(html.includes("duplicate-operation"), true, "an accepted write replayed");
  assert.equal(html.includes("stale-revision"), true, "a write built from an old read");
  assert.equal(html.includes("read, nothing moved"), true, "a read that changed nothing");
  assert.match(html, /act__row--refused/, "a refused row is marked as one");

  // The count is ahead of the rows on purpose, so the trimmed-list note has to say so rather than
  // letting a reader believe the list is everything.
  assert.match(html, /calls have arrived/);
  assert.match(html, /The most recent/);
});

test("the timeline says which caller moved the session, and only where two callers are possible", () => {
  // Read out of the tag rather than searched for in the document: "by hand" is also panel prose,
  // where it means the page works without an agent, and a whole-document search reads that as a
  // provenance tag on a receipt it has nothing to do with.
  const tags = (html: string) =>
    Array.from(html.matchAll(/class="tl__who">([^<]*)</g), (match) => match[1]);

  // Same marks, same order, one operation key between them. That key is the whole difference.
  assert.deepEqual(tags(renderOf("the agent panel, with calls that have arrived")), [
    "by a tool call",
  ]);
  assert.deepEqual(tags(renderOf("the agent panel, marked")), ["by hand"]);

  // A human release names the person in its own wording, so a tag under it would be the page
  // repeating itself. This session holds both kinds: receipts a tool could have caused, and one only
  // a teacher can.
  const sent = renderToStaticMarkup(panelOf(SENT, CONNECTED));
  const callable = SENT.receipts.filter((receipt) => !receipt.action.startsWith("human_release"));
  assert.ok(SENT.receipts.length > callable.length, "the sent session must hold a human receipt");
  assert.ok(sent.includes("release confirmed by human"), "and must draw it");
  assert.equal(tags(sent).length, callable.length, "one tag per receipt with two possible callers");
});

test("the authority matrix is fifteen cells, and every one of them says its answer in a word", () => {
  const html = renderOf("the left rail, nothing marked");

  // Three rows against five columns. Counted from the markup rather than pinned to 15, so a column
  // added to the table has to be added to this line too.
  const columns = occurrences(html, /class="auth__col"/g);
  const rows = occurrences(html, /class="auth__who"/g);
  assert.equal(columns, 5);
  assert.equal(rows, 3);
  assert.equal(occurrences(html, /class="auth__cell"/g), columns * rows);

  // The dots are decoration. What a screen reader is given is the word beside each one, and there is
  // exactly one word per cell.
  const said = Array.from(html.matchAll(/class="vh">(yes|no|only you)</g), (match) => match[1]);
  assert.equal(said.length, columns * rows);
  assert.equal(said.filter((word) => word === "yes").length, 7);
  assert.equal(said.filter((word) => word === "no").length, 7);
  assert.deepEqual(
    said.filter((word) => word === "only you"),
    ["only you"],
    "sending is the one cell that belongs to a person",
  );

  // Both halves of the argument, in the two cells worth reading: the page holds, and only a person
  // sends. A dot with no rule behind it would draw as nothing at all, so the classes are checked too.
  assert.equal(times(html, "dot--yes"), 7);
  assert.equal(times(html, "dot--no"), 7);
  assert.equal(times(html, "dot--only"), 1);
});

test("the gate says when a tool asked, and stays quiet about it when a person did", () => {
  const idle = renderOf("the action bar, idle");
  const byHand = renderOf("the action bar, a release staged");
  const byTool = renderOf("the action bar, a release staged by a tool call");

  const asked = "Staged by a tool call.";
  assert.equal(byTool.includes(asked), true, "a request receipt carrying an operation key");
  assert.equal(byHand.includes(asked), false, "the same request, staged from the page");
  assert.equal(idle.includes(asked), false, "nothing staged at all");

  // The claim the sentence replaces has to survive somewhere in the other two, because it is the
  // page's own statement of the boundary and not a caption for one state of it.
  for (const html of [idle, byHand]) {
    assert.ok(html.includes("Nothing leaves this page until you confirm."));
  }

  // Reactive, not decorative: both staged renders are past the same gate, so the send control and the
  // count behave identically whichever caller asked.
  for (const html of [byHand, byTool]) {
    assert.equal(times(html, "bar--waiting"), 1);
    assert.equal(occurrences(html, /disabled=""/g), 0);
    assert.ok(html.includes("There is no tool for it."));
  }
});
