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

function introOf(session: Session) {
  return createElement(Intro, { session, held: holdsFor(session).length, onMark: noop });
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
 * asks for is indistinguishable from a dead one until something renders it. The three extra stacks are
 * there for the same reason and are the only renders on this list handed a hold map that is not the
 * page's own — an answer already sent, an answer ready to go, and a view with nothing in it are three
 * shapes of the queue that the fixtures cannot reach while anything is being held back.
 */
const RENDERS: Record<string, string> = {
  "the top bar": renderToStaticMarkup(
    createElement(TopBar, { session: MARKED, held: holdsFor(MARKED).length }),
  ),
  "the introduction, nothing marked": renderToStaticMarkup(introOf(FRESH)),
  "the introduction, marked": renderToStaticMarkup(introOf(MARKED)),
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
  "the agent panel, nothing marked": renderToStaticMarkup(panelOf(FRESH, null)),
  "the agent panel, marked": renderToStaticMarkup(panelOf(MARKED, null)),
  "the agent panel, no agent in this browser": renderToStaticMarkup(panelOf(MARKED, AWAY)),
  "the agent panel, an agent connected": renderToStaticMarkup(panelOf(MARKED, CONNECTED)),
  "the agent panel, folded for one column": renderToStaticMarkup(panelOf(MARKED, null, true)),
  "the policy comparison": renderToStaticMarkup(createElement(Compare, { session: MARKED })),
  "the policy comparison, a release sent": renderToStaticMarkup(
    createElement(Compare, { session: SENT }),
  ),
  "the audit rail": renderToStaticMarkup(
    createElement(Audit, { session: MARKED, holds: holdsFor(MARKED) }),
  ),
  "the action bar, idle": renderToStaticMarkup(barOf(MARKED)),
  "the action bar, a release staged": renderToStaticMarkup(barOf(STAGED)),
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

  assert.equal(Object.keys(RENDERS).length, 23);
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
 * The band under the bar: one sentence, and the whole stack in four figures.
 *
 * None of the four is typed. The target image draws `14 / 0 / 1 / 0` — one answer held back before
 * anything has been marked — and that state cannot exist here, because a hold is derived from a mark.
 * The band also performs nothing: the worked-example button lives at the foot of the queue, beside the
 * answers it marks.
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

  assert.equal(occurrences(html, /<button/g), 0, "the band states, it does not act");
  assert.equal(occurrences(html, /<a /g), 0);
  assert.equal(occurrences(html, /<h1/g), 0, "the page's one h1 belongs to the queue");
  assert.ok(html.includes('role="status"'), "the live region is in the markup before it has text");
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

test("the queue pages the class, opens one answer, and draws no bar of its own", () => {
  const html = renderOf("the stack, marked from the worked example");
  const marked = Object.keys(MARKED.marks).length;
  const rows = times(html, "line__box");

  assert.equal(times(html, "focus"), 1, "exactly one answer is open in full");
  assert.ok(rows > 0 && rows < SPOON_ANSWERS.length, "the queue pages rather than printing the class");
  assert.ok(
    html.includes(
      `>1</span>–<span class="num">${rows}</span> of <span class="num">${SPOON_ANSWERS.length}</span>`,
    ),
    "the foot's count disagrees with the rows above it",
  );

  assert.equal(occurrences(html, /<form/g), rows + 1, "a mark form in every row, and in the card");
  assert.equal(
    occurrences(html, /type="checkbox"/g),
    (rows + 1) * SPOON_RUBRIC.lines.length,
    "every rubric line is tickable on every answer on screen",
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
  assert.equal(occurrences(html, /<details/g), holds.length);
  assert.equal(occurrences(html, / open=""/g), 1, "the first hold is open and the rest are shut");
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
