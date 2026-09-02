/**
 * The agent boundary.
 *
 * Withheld's whole claim is that the agent cannot compute or forge the escalation
 * decision, because it is never given the arithmetic: not a rubric line's point value,
 * not the pass boundary, not a total. That claim is only as good as the weakest tool
 * output, and a leak is easy to introduce by accident — a helpful error message, a
 * receipt that quotes a total, a list ordered by closeness to the boundary.
 *
 * So the boundary is enforced here rather than trusted. Every tool result is passed
 * through `assertAgentSafe` before it leaves the page, and the rule is structural: a
 * numeric value may appear in a tool result only at a path that has been explicitly
 * allowed below. Adding a number anywhere else fails the test suite rather than shipping.
 *
 * Fail closed. A new numeric field is a decision, not a detail.
 */

/**
 * Paths where a number is allowed to cross to the agent, and why each is safe.
 *
 * - `revision`      the agent must send `expectedRevision` back, so it must know it.
 *                   It says nothing about marks.
 * - `*Count`        cardinalities. How many answers are marked, held, or ready to go is
 *                   visible on screen anyway, and a count carries no per-line value and no
 *                   boundary. A count is not free of inference — SECURITY.md sets out the
 *                   one-bit signal `heldCount` still leaks and why it does not add up to
 *                   the boundary — but it is the price of the agent knowing a person is
 *                   needed at all.
 * - `characters`    answer length, used by the long-answer-with-no-ideas rule. Length
 *                   is a property of the student's text, not of the rubric.
 */
export const AGENT_SAFE_NUMERIC_PATHS: readonly string[] = [
  "revision",
  "answerCount",
  "markedCount",
  "heldCount",
  "releasableCount",
  "releasedCount",
  "rubricLineCount",
  "answers[].characters",
];

/** Walk a value and return the dotted path of every number in it, indices collapsed. */
export function numericPaths(value: unknown, base = ""): string[] {
  if (typeof value === "number") return [base];

  if (Array.isArray(value)) {
    const prefix = `${base}[]`;
    return value.flatMap((item) => numericPaths(item, prefix));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      numericPaths(child, base ? `${base}.${key}` : key),
    );
  }

  return [];
}

/** Numeric paths in `payload` that are not on the allowlist. */
export function forbiddenNumericPaths(
  payload: unknown,
  allowed: readonly string[] = AGENT_SAFE_NUMERIC_PATHS,
): string[] {
  const permitted = new Set(allowed);
  const seen = new Set<string>();

  for (const path of numericPaths(payload)) {
    if (!permitted.has(path)) seen.add(path);
  }

  return [...seen].sort();
}

/**
 * Every tool result goes through this. Throws rather than returning a flag, because a
 * leaking tool result must not be reachable by any code path, including an error path.
 */
export function assertAgentSafe<T>(
  payload: T,
  allowed: readonly string[] = AGENT_SAFE_NUMERIC_PATHS,
  options: AgentBoundaryOptions = {},
): T {
  const leaks = forbiddenNumericPaths(payload, allowed);
  if (leaks.length > 0) {
    throw new Error(
      `tool result would leak page-owned arithmetic at: ${leaks.join(", ")}. ` +
        "Either remove the number or add its path to AGENT_SAFE_NUMERIC_PATHS with a reason.",
    );
  }

  if (options.forbiddenNumbers !== undefined) {
    const textLeaks = forbiddenNumbersInText(
      payload,
      options.forbiddenNumbers,
      options.ignoredTextPaths,
    );
    if (textLeaks.length > 0) {
      // Do not put the leaked values in this error. The guarded tool wrapper turns this into a
      // generic recovery envelope, and the secret must not become part of that path either.
      throw new Error("tool result would leak page-owned arithmetic as text");
    }
  }

  return payload;
}

export type AgentBoundaryOptions = {
  /** Page-owned numeric values to reject when they appear inside generated prose. */
  forbiddenNumbers?: Iterable<number>;
  /** Explicitly untrusted text paths, such as the student's answer body. */
  ignoredTextPaths?: readonly string[];
};

function textValues(
  value: unknown,
  base: string,
  ignored: ReadonlySet<string>,
  values: string[],
): void {
  if (typeof value === "string") {
    if (!ignored.has(base)) values.push(value);
    return;
  }

  if (Array.isArray(value)) {
    const prefix = `${base}[]`;
    for (const item of value) textValues(item, prefix, ignored, values);
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      // JSON serialisation exposes object keys too. Include them in the canary so a generated id
      // or dynamically named field cannot smuggle a page-owned value around the value walker.
      values.push(key);
      textValues(child, base ? `${base}.${key}` : key, ignored, values);
    }
  }
}

function escapedForRegExp(value: number): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Canary for the demo fixtures, which use deliberately distinctive point values. Catches
 * a secret that escaped as text — inside generated prose, an id, or a reason string — where the
 * structural check cannot see it because it is not a number any more. Explicitly untrusted paths
 * are skipped: a student's answer is content the agent must read, not page arithmetic.
 */
export function forbiddenNumbersInText(
  payload: unknown,
  forbidden: Iterable<number>,
  ignoredTextPaths: readonly string[] = [],
): number[] {
  const values: string[] = [];
  textValues(payload, "", new Set(ignoredTextPaths), values);
  const hits: number[] = [];

  for (const secret of forbidden) {
    const pattern = new RegExp(`(?<!\\d)${escapedForRegExp(secret)}(?!\\d)`);
    if (values.some((value) => pattern.test(value))) hits.push(secret);
  }

  return hits;
}
