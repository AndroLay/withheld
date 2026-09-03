import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { HOLD_CHAIN, HOLD_TAG, HOLD_WORDING, gaugeStop, rubricMax } from "../src/ui/wording.ts";
import { MANY_COLUMNS } from "../src/ui/useOneColumn.ts";
import { SPOON_RUBRIC } from "../src/data/fixtures.ts";

/**
 * The stylesheet as a test subject.
 *
 * The production page is served under `style-src 'self'` with no `'unsafe-inline'`, so a proportional
 * bar cannot be drawn with `style={{ width }}` — the browser drops the attribute. The components
 * therefore ask for a class that `gaugeStop` computes, and a missing rule is silent: the bar renders
 * at zero width and claims a student scored nothing. Nobody would catch that by looking, because a
 * genuine zero looks exactly the same.
 *
 * So every class name a helper can emit is asserted against the sheet. Every family covered here is
 * one a human never types at the call site.
 */

const SHEET = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/** Every rule the sheet defines, as a set of bare class names. */
const DEFINED = new Set(Array.from(SHEET.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g), (m) => m[1]));

function assertDefined(className: string, why: string) {
  assert.ok(DEFINED.has(className), `.${className} is asked for by ${why} but has no rule`);
}

test("every stop gaugeStop can emit has a rule", () => {
  const asked = new Set<number>();

  // Over the whole plausible range, not just the fixtures: the rubric is data, and a total can sit
  // anywhere between nothing and the ceiling.
  for (let value = 0; value <= 200; value += 1) {
    for (const max of [1, 7, 50, 88, 97, 200]) {
      asked.add(gaugeStop(value, max));
    }
  }

  for (const stop of asked) {
    assertDefined(`bars__fill--${stop}`, "the audit's rails");
  }

  // The loop above is only as good as its coverage of the multiples of five.
  assert.equal(asked.size, 21, "expected every 5% stop from 0 to 100 to be reachable");
});

test("gaugeStop stays on the 5% grid it promises", () => {
  for (const [value, max] of [
    [0, 88],
    [1, 88],
    [48, 88],
    [50, 88],
    [88, 88],
    [200, 88],
    [3, 0],
    [-10, 88],
  ] as const) {
    const stop = gaugeStop(value, max);

    assert.ok(Number.isInteger(stop), `${value}/${max} gave a non-integer`);
    assert.equal(stop % 5, 0, `${value}/${max} gave ${stop}, off the 5% grid`);
    assert.ok(stop >= 0 && stop <= 100, `${value}/${max} gave ${stop}, off the rail`);
  }
});

test("both figures in the audit ride the same rail, and neither runs off the end", () => {
  // The audit draws two rows on identical rails: what the page credited, and where the pass mark
  // sits. Both come off `gaugeStop`, so what has to hold is that a fill is placeable at every stop
  // either row can reach, and that neither ever asks for more rail than there is.
  const max = rubricMax(SPOON_RUBRIC.lines);
  const boundary = gaugeStop(SPOON_RUBRIC.passBoundary, max);

  assert.ok(boundary <= 100, `the pass mark sits at ${boundary}% of the rail`);
  assertDefined(`bars__fill--${boundary}`, "the pass-mark row");

  for (let total = 0; total <= max; total += 1) {
    const credited = gaugeStop(total, max);

    assert.ok(credited <= 100, `${total}/${max} filled ${credited}% of the rail`);
    assertDefined(`bars__fill--${credited}`, "the credited row");
  }
});

test("every computed class family in the UI has a rule", () => {
  // Every family here is written by a template literal, so no search for the finished name finds it
  // and TypeScript has nothing to check: the state is a string and the class is a string.
  for (const state of ["sent", "held", "marked", "waiting"]) {
    assertDefined(`line--${state}`, "Stack's Row()");
    assertDefined(`line__state--${state}`, "the row's state word");
  }

  for (const who of ["tool", "hand"]) {
    assertDefined(`prov--${who}`, "the row's provenance tag");
  }

  for (const tone of ["on", "over", "under"]) {
    assertDefined(`delta--${tone}`, "the audit's distance badge");
  }

  for (const state of ["now", "done", "ahead"]) {
    assertDefined(`step--${state}`, "the policy column's numbered steps");
  }

  // The authority matrix answers in dots, and the three answers are three rules: filled, hollow, and
  // a ring around a padlock. A missing rule here is the worst kind of missing rule on this page — an
  // unstyled span draws nothing, and a cell that says "no" by drawing nothing looks like a cell that
  // says "yes" by drawing nothing. The word beside each dot is the reason that is a bug and not a
  // wrong answer, and `render.test.mts` counts those words.
  for (const answer of ["yes", "no", "only"]) {
    assertDefined(`dot--${answer}`, "the authority matrix");
  }

  for (const look of ["wait", "none", "live"]) {
    assertDefined(`conn--${look}`, "the agent column's connection box");
  }

  for (const kind of ["read", "write"]) {
    assertDefined(`tool--${kind}`, "the tool list");
  }

  for (const outcome of ["read", "wrote", "refused"]) {
    assertDefined(`act__row--${outcome}`, "the agent column's activity list");
  }

  for (const kind of ["sent", "ready", "held", "quar", "waiting"]) {
    assertDefined(`cell--${kind}`, "the band's spine");
  }
});

test("the sheet names no remote asset", () => {
  // `default-src 'self'` and `font-src 'self'` are only true claims while this holds.
  assert.equal(/@import|url\(\s*['"]?(https?:|\/\/)/.test(SHEET), false);
});

test("the breakpoint the script reads is the breakpoint the sheet uses", () => {
  // Two copies of one number, in two languages. `useOneColumn` folds the contract column into a
  // disclosure below this width; the sheet turns the grid into a single column at exactly the same
  // width. Drift either way is the bad kind of bug — a column folded while it still sits beside the
  // work, or a column a phone cannot get past — and neither shows up in a screenshot of one width.
  assert.ok(
    SHEET.includes(`@media ${MANY_COLUMNS} {`),
    `the sheet has no media block for ${MANY_COLUMNS}, which useOneColumn assumes is the layout's own`,
  );

  // And that the block it belongs to is the one that lays out the columns, not some later use of the
  // same width for something unrelated.
  const block = SHEET.slice(SHEET.indexOf(`@media ${MANY_COLUMNS} {`));
  assert.match(block.slice(0, 400), /\.app__cols\s*\{[^}]*grid-template-columns/);
});

test("the hosted policy still forbids the inline style this whole sheet exists to avoid", () => {
  // Read as text rather than imported: the config is a module that builds a plugin, and what
  // matters here is the string that reaches the meta tag. Someone reaching for `style={{ width }}`
  // would find it blocked, and the cheapest way out is to add `'unsafe-inline'` here — which works,
  // ships, and quietly retires every quantised class above along with the reason they exist.
  const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  const policy = config.slice(config.indexOf("const HOSTED_CSP"), config.indexOf("].join"));

  assert.match(policy, /"style-src 'self'"/);
  assert.equal(/unsafe-inline|unsafe-eval/.test(policy), false);

  // The rest of the nine, so a directive cannot be dropped without a test failing. `connect-src`
  // is the one that is a statement about the product rather than a restriction on it: the app makes
  // no network request, and this is the browser being asked to hold it to that.
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ]) {
    assert.ok(policy.includes(`"${directive}"`), `${directive} is no longer in the hosted policy`);
  }
});

test("all three hold wordings cover the same reasons", () => {
  // A reason added to one table and not the others renders an undefined tag on a live card, and
  // TypeScript cannot catch it: each is a `Record<HoldReason, …>` only until one is edited.
  const reasons = Object.keys(HOLD_TAG).sort();

  assert.deepEqual(Object.keys(HOLD_WORDING).sort(), reasons);
  assert.deepEqual(Object.keys(HOLD_CHAIN).sort(), reasons);
  assert.ok(reasons.length >= 4);

  for (const [reason, sentence] of Object.entries(HOLD_WORDING)) {
    assert.ok(sentence.length > 20, `${reason} has no real explanation`);
    assert.ok(HOLD_TAG[reason as keyof typeof HOLD_TAG].length > 0);
  }

  for (const [reason, chain] of Object.entries(HOLD_CHAIN)) {
    assert.equal(chain.length, 3, `${reason} is not three links`);

    // The last link is where the answer ended up, and for every reason that is a person. A chain
    // that ended anywhere else would be describing a page that decides on its own.
    assert.match(chain[2]!, /for you$/);
  }
});
