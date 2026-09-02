import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The palette as a test subject.
 *
 * `docs/PROGRESS.md` said for a long time that contrast on this page was unexamined, which was true
 * and is the kind of sentence that stays true for ever unless something measures it. This file
 * measures the half that arithmetic can settle: every pair of tokens the sheet writes text in, and
 * every pair where a shape rather than a word carries the meaning.
 *
 * What it cannot settle is composition — which pair actually lands on which pixel once the cascade
 * has run. That is measured in the browser instead, by the contrast probe in
 * `scripts/browser-session.mjs`, which walks every rendered text node and computes the ratio against
 * the background it really has. The two are complements: this one guards the palette, that one
 * guards the page. Neither is a judgement about wording, and neither knows what a screen reader says.
 *
 * The maths is WCAG 2.1's, and nothing more: relative luminance per 1.4.3, 4.5:1 for body text,
 * 3:1 for large text and for graphics that carry information (1.4.11). Borders are not swept: a
 * hairline round a box is not what identifies the control inside it — the control's own label is,
 * and every label on this page is measured below.
 */

const SHEET = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/** The sheet with its comments taken out, for questions about what it *does* rather than what it says. */
const RULES = SHEET.replace(/\/\*[\s\S]*?\*\//g, "");

const ROOT = (SHEET.match(/:root\s*\{[^}]*\}/) ?? [""])[0];

/** The `:root` block, as a map from token name to hex. Read from the sheet so a palette edit lands. */
const TOKENS = new Map(
  Array.from(
    ROOT.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g),
    (found) => [found[1], found[2]] as const,
  ),
);

function channel(value: number): number {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function bytes(token: string): [number, number, number] {
  const hex = TOKENS.get(token);
  assert.ok(hex, `--${token} is not in the :root block`);
  const packed = Number.parseInt(hex.slice(1), 16);
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
}

function luminance(token: string): number {
  const [red, green, blue] = bytes(token);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** The WCAG ratio between two tokens, rounded down to two places so a report never flatters. */
function ratio(front: string, back: string): number {
  const first = luminance(front);
  const second = luminance(back);
  const raw = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  return Math.floor(raw * 100) / 100;
}

function assertRatio(front: string, back: string, floor: number, why: string) {
  const found = ratio(front, back);
  assert.ok(
    found >= floor,
    `--${front} on --${back} is ${found}:1, under the ${floor}:1 that ${why} needs`,
  );
}

/** The greys the sheet writes text in on the lit side, and every lit surface it declares. */
const INKS = ["ink", "ink-2", "ink-3", "muted"] as const;
const GROUNDS = ["card", "page", "band"] as const;

/**
 * The same question on the agent's side, which is drawn in reverse. Two inks, two near-blacks: the
 * column itself, and the slightly lifted row used for a tool entry and a timeline step.
 */
const REVERSE_INKS = ["on-black", "muted-2"] as const;
const REVERSE_GROUNDS = ["ink", "black-row"] as const;

test("the palette reads: every ink is legible on every ground the sheet declares", () => {
  // A sweep rather than a list of components, because the sweep cannot be wrong about usage. If a
  // combination is unusable then it is a trap the next rule can fall into, whether or not it has yet.
  for (const ink of INKS) {
    for (const ground of GROUNDS) {
      assertRatio(ink, ground, 4.5, "body text");
    }
  }

  // The weakest pair, named, so a palette edit that spends the margin has to change this line.
  assert.equal(ratio("muted", "band"), 4.8, "the thinnest margin on the lit side has moved");
});

test("the agent's column reads too, and it is the same arithmetic in reverse", () => {
  // The inversion is the page's one strong visual claim — that side of the boundary is not this one —
  // so it is also the side where a pale grey on near-black is easiest to get wrong by eye.
  for (const ink of REVERSE_INKS) {
    for (const ground of REVERSE_GROUNDS) {
      assertRatio(ink, ground, 4.5, "body text in the agent's column");
    }
  }

  assert.equal(ratio("muted-2", "black-row"), 6.91, "the thinnest margin in reverse has moved");
});

test("a control that cannot be pressed still says why, legibly", () => {
  // WCAG exempts disabled controls, and this page declines the exemption: a locked care setting and a
  // send button with nothing to send are both arguments the reader is meant to read, not grey mush.
  assertRatio("off-ink", "off", 4.5, "the label on a disabled control");
});

test("the filled controls carry their labels", () => {
  // The two buttons that commit something are filled with `--ink` and lettered in `--on-black`. They
  // are the only controls on the page that write, so they are the ones that must not be a guess.
  assertRatio("on-black", "ink", 4.5, "the label on the send button");
});

test("the shapes that carry information clear 3:1, and the focus ring clears it everywhere", () => {
  // The audit draws two figures as lengths — what was credited, and where the pass mark sits — on
  // rails of `--line`. Both are stated again as printed numbers beside them, but a length that cannot
  // be seen against its rail is still a fact the page failed to give.
  assertRatio("ink", "line", 3, "the credited bar against its rail");
  assertRatio("ink-3", "line", 3, "the pass-mark bar against its rail");

  // The connection glyph in the agent's column dims when no agent is there. The words beside it say
  // so as well; the glyph still has to be visible enough to be read as deliberately dim.
  assertRatio("muted", "ink", 3, "the dimmed connection glyph");

  // `:focus-visible` draws a 2px outline and it is the only thing that says where the keyboard is. On
  // the lit side it is `--ink`; the agent's column inverts it to `--on-black`. Both have to clear 3:1
  // on every surface the keyboard can reach, which is all of them.
  for (const ground of GROUNDS) {
    assertRatio("ink", ground, 3, "the focus outline");
  }

  for (const ground of REVERSE_GROUNDS) {
    assertRatio("on-black", ground, 3, "the inverted focus outline");
  }
});

test("the sheet is monochrome, which is a claim about every hex in it", () => {
  // The header of `src/styles.css` opens by saying the greyscale carries the argument rather than
  // decorating it, and that a reader who cannot tell two hues apart loses nothing. That is only true
  // while no token has a hue: a pass drawn in green and a hold in amber would say something this page
  // has no business saying in a channel some readers cannot receive.
  for (const [name] of TOKENS) {
    const [red, green, blue] = bytes(name);
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

    assert.ok(spread <= 10, `--${name} is ${spread} steps off grey, which is a hue`);
  }

  // And that the tokens are the whole story: a hex, an `rgb()` or a named colour written straight into
  // a rule would sit outside every sweep above and be measured by nothing. Asked of the sheet with its
  // comments gone, and with `:root` cut out by pattern rather than by string — the token block has
  // comments of its own, so the copy read above does not appear here verbatim.
  const outside = RULES.replace(/:root\s*\{[^}]*\}/, "");

  assert.equal(outside.match(/#[0-9a-fA-F]{3,8}/g), null, "a rule names a raw hex");
  assert.equal(/\b(rgba?|hsla?|color-mix|oklch)\(/.test(outside), false, "a rule computes a colour");
});

test("the palette is the size the sheet says it is, and every token parses", () => {
  // Guards the parser rather than the design: a `:root` written in `rgb()` or `hsl()` would slip
  // through the regex above and every test in this file would silently measure a smaller palette.
  const declared = ROOT.match(/--[\w-]+:/g) ?? [];
  const colours = declared.filter((name) => !/--(sans|mono|r|r-sm|r-lg):/.test(name));

  assert.equal(TOKENS.size, colours.length, "a colour token in :root is not a plain six-digit hex");
  assert.ok(TOKENS.size >= 16, `only ${TOKENS.size} colour tokens parsed`);
});
