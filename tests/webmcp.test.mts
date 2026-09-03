import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  agentFacingPayloads,
  buildWithheldTools,
  installWithheldTools,
  toolSurfaceFacts,
  type Dispatch,
  type ModelContextLike,
  type SessionPort,
  type ToolRegistration,
  type ToolResult,
} from "../src/tools/webmcp.ts";
import { forbiddenNumbersInText, forbiddenNumericPaths } from "../src/tools/agent-boundary.ts";
import { createSession, type Session } from "../src/domain/session.ts";
import {
  DEMO_FINDINGS,
  PAGE_OWNED_NUMBERS,
  SPOON_ANSWERS,
  SPOON_QUESTION,
  SPOON_RUBRIC,
} from "../src/data/fixtures.ts";

const EXPECTED_TOOLS = [
  "describe_stack",
  "read_rubric",
  "read_answer",
  "list_held_answers",
  "explain_mark",
  "preview_unattended_outcome",
  "propose_marks",
  "set_marking_emphasis",
  "request_release",
];

function makePort(
  answers = SPOON_ANSWERS,
  question = SPOON_QUESTION,
): SessionPort & { current: () => Session } {
  let session = createSession(SPOON_RUBRIC, answers, { question });

  return {
    read: () => session,
    write: (next) => {
      session = next;
    },
    current: () => session,
  };
}

function byName(tools: ToolRegistration[], name: string): ToolRegistration {
  const tool = tools.find((candidate) => candidate.name === name);
  assert.ok(tool, `${name} should be registered`);
  return tool;
}

function payloadOf(result: ToolResult): Record<string, unknown> {
  assert.equal(result.content[0]?.type, "text");
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

test("the surface is exactly nine tools, in a stable order", () => {
  assert.deepEqual(buildWithheldTools(makePort()).map((tool) => tool.name), EXPECTED_TOOLS);
});

test("there is no tool that confirms a release, and this file never names the one that does", () => {
  const tools = buildWithheldTools(makePort());
  const source = readFileSync(fileURLToPath(new URL("../src/tools/webmcp.ts", import.meta.url)), "utf8");

  assert.equal(tools.some((tool) => /confirm|release_now|send_to_student/.test(tool.name)), false);
  assert.equal(source.includes("confirmRelease"), false);
});

test("every tool fits the documented description and name budgets", () => {
  for (const tool of buildWithheldTools(makePort())) {
    assert.ok(tool.name.length <= 30, `${tool.name} is over the name budget`);
    assert.ok(tool.description.length <= 500, `${tool.name} is over the description budget`);

    const properties = (tool.inputSchema["properties"] ?? {}) as Record<string, { description?: string }>;
    for (const [param, schema] of Object.entries(properties)) {
      const described = schema.description ?? "";
      assert.ok(described.length <= 150, `${tool.name}.${param} is over the parameter budget`);
    }
  }
});

test("every tool schema is closed, and bounded collections advertise their limits", () => {
  const tools = buildWithheldTools(makePort());

  for (const tool of tools) {
    assert.equal(tool.inputSchema["additionalProperties"], false, `${tool.name} accepts extra input`);
  }

  const propose = byName(tools, "propose_marks");
  const properties = propose.inputSchema["properties"] as Record<string, Record<string, unknown>>;
  const findings = properties["findings"];
  const item = findings["items"] as Record<string, unknown>;
  const itemProperties = item["properties"] as Record<string, Record<string, unknown>>;
  const operationId = properties["operationId"];

  assert.equal(findings["minItems"], 1);
  assert.equal(typeof findings["maxItems"], "number");
  assert.equal(item["additionalProperties"], false);
  assert.equal(itemProperties["foundLineIds"]["maxItems"] !== undefined, true);
  assert.equal(itemProperties["answerId"]["maxLength"], 64);
  assert.equal(operationId["maxLength"], 64);
  assert.deepEqual(propose.inputSchema["required"], ["findings", "expectedRevision", "operationId"]);
  for (const name of ["set_marking_emphasis", "request_release"]) {
    const tool = byName(tools, name);
    assert.ok((tool.inputSchema["required"] as string[]).includes("operationId"), `${name} needs operationId`);
  }
});

test("six tools read and three write, and the readers say so", () => {
  const tools = buildWithheldTools(makePort());
  const readOnly = tools.filter((tool) => tool.annotations?.["readOnlyHint"] === true);

  assert.equal(readOnly.length, 6);
  assert.deepEqual(readOnly.map((tool) => tool.name), EXPECTED_TOOLS.slice(0, 6));
});

test("the tool that returns a student's words marks them as untrusted", () => {
  const tools = buildWithheldTools(makePort());

  assert.equal(byName(tools, "read_answer").annotations?.["untrustedContentHint"], true);
  // Only that one: the hint means something because it is not on everything.
  assert.equal(
    tools.filter((tool) => tool.annotations?.["untrustedContentHint"] === true).length,
    1,
  );
});

test("no tool on the whole surface can leak a page-owned number", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);

  // Drive the surface the way an agent would: read, mark the stack, then read again so the
  // later results are computed from real marks and real holds rather than from an empty stack.
  const calls: [string, Record<string, unknown>][] = [
    ["describe_stack", {}],
    ["read_rubric", {}],
    ["read_answer", { answerId: "ans-04" }],
    ["propose_marks", { findings: DEMO_FINDINGS, expectedRevision: 1, operationId: "numbers-probe" }],
    ["describe_stack", {}],
    ["list_held_answers", {}],
    ["explain_mark", { answerId: "ans-04" }],
    ["explain_mark", { answerId: "ans-11" }],
    ["preview_unattended_outcome", {}],
    ["set_marking_emphasis", { emphasis: "cautious", expectedRevision: 2, operationId: "care-probe" }],
    ["request_release", { expectedRevision: 3, operationId: "release-probe" }],
    ["describe_stack", {}],
  ];

  for (const [name, args] of calls) {
    const payload = payloadOf(await byName(tools, name).execute(args));

    assert.deepEqual(forbiddenNumericPaths(payload), [], `${name} returned an unlisted number`);
    assert.deepEqual(
      forbiddenNumbersInText(payload, PAGE_OWNED_NUMBERS),
      [],
      `${name} leaked a page-owned number as text`,
    );
  }
});

test("a refusal comes back as a result with a code, not as a thrown error", async () => {
  const tools = buildWithheldTools(makePort());
  const payload = payloadOf(
    await byName(tools, "propose_marks").execute({
      findings: DEMO_FINDINGS,
      expectedRevision: 99,
      operationId: "stale-probe",
    }),
  );

  assert.equal(payload["refused"], true);
  assert.equal(payload["code"], "stale-revision");
  assert.equal(payload["revision"], 1);
});

test("arguments are checked in code, not trusted from the schema", async () => {
  const tools = buildWithheldTools(makePort());
  const rubbish: [string, Record<string, unknown>][] = [
    ["read_answer", {}],
    ["read_answer", { answerId: 4 }],
    ["explain_mark", { answerId: "" }],
    ["propose_marks", { findings: "all of them", expectedRevision: 1, operationId: "bad-findings" }],
    ["propose_marks", { findings: [{ answerId: "ans-01" }], expectedRevision: 1, operationId: "missing-lines" }],
    ["propose_marks", { findings: [{ answerId: "ans-01", foundLineIds: [7] }], expectedRevision: 1, operationId: "number-line" }],
    ["propose_marks", { findings: [{ answerId: "ans-01", foundLineIds: ["rubric-not-present"] }], expectedRevision: 1, operationId: "unknown-rubric-line" }],
    ["propose_marks", { findings: DEMO_FINDINGS, expectedRevision: 1, operationId: "extra-field", extra: true }],
    ["propose_marks", { findings: [{ answerId: "ans-01", foundLineIds: [] }, { answerId: "ans-01", foundLineIds: [] }], expectedRevision: 1, operationId: "duplicate-answer" }],
    ["propose_marks", { findings: DEMO_FINDINGS, expectedRevision: "1", operationId: "string-revision" }],
    ["propose_marks", { findings: DEMO_FINDINGS, expectedRevision: 1 }],
    ["propose_marks", { findings: DEMO_FINDINGS, expectedRevision: 1, operationId: "" }],
    ["describe_stack", { extra: true }],
    ["set_marking_emphasis", { emphasis: "lenient", expectedRevision: 1, operationId: "bad-emphasis" }],
    ["set_marking_emphasis", { emphasis: "standard", expectedRevision: 1, operationId: "extra-care", extra: true }],
    ["request_release", {}],
    ["request_release", { expectedRevision: 1, operationId: "x".repeat(65) }],
    ["request_release", { expectedRevision: 1, operationId: "extra-release", extra: true }],
  ];

  for (const [name, args] of rubbish) {
    const payload = payloadOf(await byName(tools, name).execute(args));
    assert.equal(payload["refused"], true, `${name} accepted ${JSON.stringify(args)}`);
  }
});

test("oversized and duplicate findings are refused before arithmetic runs", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);
  const oversized = Array.from({ length: 50_000 }, () => ({ answerId: "ans-01", foundLineIds: [] }));

  const result = await byName(tools, "propose_marks").execute({
    findings: oversized,
    expectedRevision: 1,
    operationId: "oversized-findings",
  });
  const payload = payloadOf(result);

  assert.equal(payload["refused"], true);
  assert.equal(payload["code"], "invalid-argument");
  assert.equal(port.current().revision, 1);
  assert.deepEqual(port.current().marks, {});
});

test("an accepted operation id is single-use, even when a retry has the current revision", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);
  const first = await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
    operationId: "one-write-only",
  });
  const afterFirst = port.current();

  const duplicate = await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: afterFirst.revision,
    operationId: "one-write-only",
  });

  assert.equal(payloadOf(first)["refused"], undefined);
  assert.equal(payloadOf(duplicate)["refused"], true);
  assert.equal(payloadOf(duplicate)["code"], "duplicate-operation");
  assert.equal(port.current().revision, afterFirst.revision);
  assert.equal(port.current().receipts.length, afterFirst.receipts.length);
  assert.equal(port.current().receipts[0]?.operationId, "one-write-only");
});

test("raw answer numbers are allowed only on the explicitly untrusted body path", async () => {
  const answers = SPOON_ANSWERS.map((answer) =>
    answer.id === "ans-01" ? { ...answer, body: "A note containing the number 17." } : answer,
  );
  const payload = payloadOf(
    await byName(buildWithheldTools(makePort(answers)), "read_answer").execute({
      answerId: "ans-01",
    }),
  );

  assert.equal((payload["answer"] as { body: string }).body, "A note containing the number 17.");
  assert.deepEqual(
    forbiddenNumbersInText(payload, PAGE_OWNED_NUMBERS, ["answer.body"]),
    [],
  );
});

test("a generated page string containing owned arithmetic fails closed", async () => {
  const tools = buildWithheldTools(makePort(SPOON_ANSWERS, "Question contains 17."));
  const payload = payloadOf(await byName(tools, "describe_stack").execute({}));

  assert.equal(payload["refused"], true);
  assert.equal(payload["code"], "internal-error");
  assert.doesNotMatch(JSON.stringify(payload), /17/);
});

test("unexpected tool failures return a recovery envelope instead of throwing", async () => {
  const tools = buildWithheldTools({
    read: () => {
      throw new Error("private implementation detail");
    },
    write: () => {},
  });

  const payload = payloadOf(await byName(tools, "describe_stack").execute({}));

  assert.deepEqual(payload, {
    refused: true,
    code: "internal-error",
    message: "the tool could not complete; read the stack again and retry",
  });
});

test("a write lands through the port and moves the revision on", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);

  const payload = payloadOf(
    await byName(tools, "propose_marks").execute({
      findings: DEMO_FINDINGS,
      expectedRevision: 1,
      operationId: "write-lands",
    }),
  );

  assert.equal(port.current().revision, 2);
  assert.equal(payload["revision"], 2);
  assert.equal((payload["receipt"] as { id: string }).id, "rcp-2");
  assert.equal(payload["heldCount"], 5);
  assert.equal(payload["releasableCount"], 9);
});

test("no sequence of tool calls can put a mark in front of a student", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);

  await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
    operationId: "mark-before-release",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await byName(tools, "request_release").execute({
      expectedRevision: port.current().revision,
      operationId: `release-attempt-${attempt}`,
    });
  }

  // Nine answers are ready and a request is on the page. Nothing has gone anywhere.
  assert.deepEqual(port.current().releasedAnswerIds, []);
  assert.ok(port.current().releaseRequest);
});

function fakeContext() {
  const seen: string[] = [];
  const context: ModelContextLike = {
    registerTool: async (tool) => {
      seen.push(tool.name);
    },
  };

  return { context, seen };
}

test("with no model context the page installs nothing and says so", async () => {
  const installation = await installWithheldTools(makePort(), { context: null });

  assert.equal(installation.available, false);
  assert.deepEqual(installation.registered, []);
});

test("all nine register against a model context", async () => {
  const { context, seen } = fakeContext();
  const installation = await installWithheldTools(makePort(), { context });

  assert.equal(installation.available, true);
  assert.deepEqual(installation.registered, EXPECTED_TOOLS);
  assert.deepEqual(seen, EXPECTED_TOOLS);
  assert.deepEqual(installation.failures, []);
});

test("a StrictMode second mount does not hand the agent two of every tool", async () => {
  const { context, seen } = fakeContext();

  const first = await installWithheldTools(makePort(), { context });
  const second = await installWithheldTools(makePort(), { context });

  assert.equal(first.alreadyInstalled, false);
  assert.equal(second.alreadyInstalled, true);
  assert.deepEqual(second.registered, []);
  assert.equal(seen.length, EXPECTED_TOOLS.length);
});

test("after teardown the tools can be installed again", async () => {
  const { context, seen } = fakeContext();
  const controller = new AbortController();

  await installWithheldTools(makePort(), { context, signal: controller.signal });
  controller.abort();
  const again = await installWithheldTools(makePort(), { context });

  assert.equal(again.alreadyInstalled, false);
  assert.deepEqual(again.registered, EXPECTED_TOOLS);
  assert.equal(seen.length, EXPECTED_TOOLS.length * 2);
});

test("a signal already aborted registers nothing and reports the abort", async () => {
  const { context, seen } = fakeContext();
  const installation = await installWithheldTools(makePort(), {
    context,
    signal: AbortSignal.abort(),
  });

  assert.equal(installation.aborted, true);
  assert.deepEqual(installation.registered, []);
  assert.deepEqual(seen, []);
});

test("one tool failing to register does not hide the other eight", async () => {
  const context: ModelContextLike = {
    registerTool: async (tool) => {
      if (tool.name === "explain_mark") throw new Error("blocked by policy");
    },
  };

  const installation = await installWithheldTools(makePort(), { context });

  assert.equal(installation.registered.length, 8);
  assert.deepEqual(installation.failures, [{ name: "explain_mark", reason: "blocked by policy" }]);
});

test("a partial registration exposes a retry without duplicating the successful tools", async () => {
  let failedOnce = false;
  const seen: string[] = [];
  const context: ModelContextLike = {
    registerTool: async (tool) => {
      if (tool.name === "explain_mark" && !failedOnce) {
        failedOnce = true;
        throw new Error("temporary registration failure");
      }
      seen.push(tool.name);
    },
  };

  const first = await installWithheldTools(makePort(), { context });
  assert.equal(first.failures.length, 1);
  assert.equal(typeof first.retry, "function");

  const second = await first.retry!();
  assert.deepEqual(second.failures, []);
  assert.deepEqual(second.registered, EXPECTED_TOOLS);
  assert.equal(seen.length, EXPECTED_TOOLS.length - 1 + EXPECTED_TOOLS.length);
});




// The page renders the tool surface and four of its payloads for a reader who has no agent. Both
// come from this module rather than from a hand-written copy, and these three tests are what makes
// that worth anything: a drawing of the boundary would drift from the boundary silently.

test("the surface the page shows is the surface that registers", () => {
  const facts = toolSurfaceFacts();
  const registered = buildWithheldTools(makePort());

  assert.deepEqual(facts.map((fact) => fact.name), EXPECTED_TOOLS);
  assert.deepEqual(
    facts.map((fact) => fact.readOnly),
    registered.map((tool) => tool.annotations?.["readOnlyHint"] === true),
  );
  assert.equal(facts.filter((fact) => fact.readOnly).length, 6);
  assert.equal(facts.filter((fact) => !fact.readOnly).length, 3);
});

test("building the surface reads no session, so the page can list it before one exists", () => {
  // The port here throws on read. If any tool body ran at build time this would be the failure.
  const inert: SessionPort = {
    read: () => {
      throw new Error("read at build time");
    },
    write: () => {},
  };

  assert.deepEqual(buildWithheldTools(inert).map((tool) => tool.name), EXPECTED_TOOLS);
  assert.doesNotThrow(() => toolSurfaceFacts());
});

test("what the page prints as the agent's view is what the tools return", async () => {
  const port = makePort();
  const tools = buildWithheldTools(port);

  await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
    operationId: "payload-parity",
  });

  const session = port.current();
  const firstMarked = session.answers.find((answer) => session.marks[answer.id] !== undefined);
  assert.ok(firstMarked, "the worked example should mark something");

  const shown = agentFacingPayloads(session, firstMarked.id);
  assert.deepEqual(
    shown.map((entry) => entry.tool),
    ["read_rubric", "list_held_answers", "explain_mark", "preview_unattended_outcome"],
  );

  for (const entry of shown) {
    const args = entry.tool === "explain_mark" ? { answerId: firstMarked.id } : {};
    const fromTool = payloadOf(await byName(tools, entry.tool).execute(args));

    assert.deepEqual(entry.payload, fromTool, `${entry.tool} drifted from its tool`);
  }
});

test("the printed payloads carry no page-owned number, exactly as the tool results do not", () => {
  // The panel is a second reader of the same projections. If it ever showed a total it would be
  // making the page's central claim while contradicting it on screen.
  const port = makePort();
  const shown = agentFacingPayloads(port.current(), null);

  assert.deepEqual(shown.map((entry) => entry.tool), [
    "read_rubric",
    "list_held_answers",
    "preview_unattended_outcome",
  ]);

  for (const entry of shown) {
    assert.deepEqual(forbiddenNumericPaths(entry.payload), []);
    assert.deepEqual(forbiddenNumbersInText(entry.payload, PAGE_OWNED_NUMBERS), []);
  }
});

test("every call that arrives is reported once, reads and refusals included", async () => {
  // The panel's activity list is the only record of a call that changed nothing, so the report has to
  // arrive for reads and refusals too. A timeline of accepted writes cannot answer "was this used?".
  const seen: Dispatch[] = [];
  const port = makePort();
  const tools = buildWithheldTools({ ...port, observe: (one) => seen.push(one) });

  await byName(tools, "describe_stack").execute({});
  await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 1,
    operationId: "activity-first",
  });
  await byName(tools, "propose_marks").execute({
    findings: DEMO_FINDINGS,
    expectedRevision: 2,
    operationId: "activity-first",
  });
  await byName(tools, "set_marking_emphasis").execute({
    emphasis: "cautious",
    expectedRevision: 1,
    operationId: "activity-stale",
  });

  assert.deepEqual(
    seen.map((one) => [one.tool, one.code, one.moved]),
    [
      ["describe_stack", null, false],
      ["propose_marks", null, true],
      ["propose_marks", "duplicate-operation", false],
      ["set_marking_emphasis", "stale-revision", false],
    ],
  );

  // The revision on the record is where the session actually stands, not what the caller asked for:
  // the refused pair report the revision the accepted write left behind.
  assert.deepEqual(seen.map((one) => one.revision), [1, 2, 2, 2]);
});

test("a dispatch record carries four fields and none of them came from an argument", () => {
  // An argument may contain student text. The record is what the page did, so its shape is closed:
  // anything wider would make the activity list a second place answer text can surface.
  const seen: Dispatch[] = [];
  const port = makePort();
  const tools = buildWithheldTools({ ...port, observe: (one) => seen.push(one) });

  return byName(tools, "read_answer")
    .execute({ answerId: SPOON_ANSWERS[0]?.id })
    .then(() => {
      assert.equal(seen.length, 1);
      assert.deepEqual(Object.keys(seen[0] ?? {}).sort(), ["code", "moved", "revision", "tool"]);
      assert.equal(seen[0]?.moved, false);
    });
});

test("an observer that throws cannot fail a tool call", async () => {
  // A listener is not a participant. If the page's own bookkeeping breaks, the agent still gets the
  // result that was already built rather than an internal-error envelope it cannot act on.
  const port = makePort();
  const tools = buildWithheldTools({
    ...port,
    observe: () => {
      throw new Error("the page's own bookkeeping is broken");
    },
  });

  const payload = payloadOf(await byName(tools, "describe_stack").execute({}));
  assert.equal(payload["refused"], undefined);
  assert.equal(payload["revision"], 1);
});
