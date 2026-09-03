#!/usr/bin/env node
/**
 * An MCP stdio server that puts a client's own model in front of this page's tools, in a real
 * browser, without reimplementing a single one of them.
 *
 * `scripts/webmcp-invoke.mjs` establishes that the agent-side path works: Chromium's WebMCP domain
 * dispatches a call this page did not make, the handler runs, the guards hold, and the rendered page
 * moves. What that script cannot establish is a model doing the choosing, because it chose every
 * call itself and knew every revision to quote. This file closes that gap from the other side. It
 * speaks the protocol an MCP client speaks, so the choosing happens wherever that client's model
 * lives, and this process only carries the call across.
 *
 * There is no MCP SDK in this workspace and none was added. The protocol here is written by hand:
 * newline-delimited JSON-RPC 2.0 on stdin and stdout, six methods, and one headless Chromium behind
 * them driven over the DevTools Protocol.
 *
 * It is not a mock and it implements no tool of its own. `tools/list` is whatever the page
 * registered through `document.modelContext.registerTool`, read back out of the browser's registry
 * rather than out of the source, and `tools/call` is `WebMCP.invokeTool`, so the code that answers
 * is `src/tools/webmcp.ts`, and a refusal a client sees is the page's refusal with the page's code.
 *
 * One shape is worth stating plainly, because it differs from the sibling submission. Withheld's
 * handlers already answer in MCP shape: `reply()` in `src/tools/webmcp.ts` returns
 * `content:[{type:"text",…}]` alongside `structuredContent`, and `WebMCP.toolResponded` carries that
 * object through untouched, which is why `webmcp-invoke.mjs` reads `output.content[0].text`. So this
 * boundary passes `content` along when the page supplied it and wraps only when it did not. Wrapping
 * an already-wrapped answer would bury the payload one level below where any client looks.
 *
 * The nine tools need no walking in. They register when the app mounts, and the page has no boot
 * screen or brief in front of them, so the only wait here is for the mount and this file clicks
 * nothing. The buttons Withheld does have are actions a person takes, not gates.
 *
 * stdout carries protocol lines only. Every diagnostic goes to stderr through `note`, and the
 * transcript goes to WITHHELD_BRIDGE_LOG as JSONL.
 *
 * Env: WITHHELD_URL, WITHHELD_CDP_PORT, WITHHELD_BRIDGE_LOG, WITHHELD_CHROMIUM,
 * WITHHELD_CDP_TIMEOUT_MS (default 30000), WITHHELD_BOOT_ATTEMPTS (default 60). A production build
 * has to be served already: this file drives a browser, it does not start a preview server.
 */
import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const PAGE_URL = process.env.WITHHELD_URL ?? "http://127.0.0.1:4197/";
const CDP_PORT = Number(process.env.WITHHELD_CDP_PORT ?? 9561);
const LOG_PATH = process.env.WITHHELD_BRIDGE_LOG ?? "";
const BROWSER = process.env.WITHHELD_CHROMIUM ?? "/usr/bin/chromium";
const CDP_TIMEOUT = Number(process.env.WITHHELD_CDP_TIMEOUT_MS ?? 30_000);
const BOOT_ATTEMPTS = Number(process.env.WITHHELD_BOOT_ATTEMPTS ?? 60);
const PROTOCOL = "2025-06-18";

const note = (line) => process.stderr.write(`[bridge] ${line}\n`);
const record = (direction, body) => {
  if (!LOG_PATH) return;
  appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), direction, body })}\n`);
};
const send = (message) => {
  record("out", message);
  process.stdout.write(`${JSON.stringify(message)}\n`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- CDP, the thin half ---------------------------------------------------------------------

let socket;
let session;
let frameId;
let nextId = 1;
const pending = new Map();
const listeners = new Map();

const on = (method, handler) => {
  const bucket = listeners.get(method) ?? [];
  bucket.push(handler);
  listeners.set(method, bucket);
};

function cdp(method, params = {}, sessionId = session) {
  const id = nextId++;
  socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
    }, CDP_TIMEOUT);
  });
}

function attach(url) {
  socket = new WebSocket(url);
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
      return;
    }
    for (const handler of listeners.get(message.method) ?? []) handler(message.params ?? {});
  };
  // Bounded, so that a socket which neither opens nor errors fails with a name instead of leaving
  // every `tools/list` waiting on a promise that will not settle.
  return new Promise((resolve, reject) => {
    const giveUp = setTimeout(() => reject(new Error("CDP socket never opened")), CDP_TIMEOUT);
    socket.onopen = () => {
      clearTimeout(giveUp);
      resolve();
    };
    socket.onerror = () => {
      clearTimeout(giveUp);
      reject(new Error("CDP socket failed"));
    };
  });
}

/** One expression in the page, awaited, with a value back or null. */
const evaluate = (expression) => cdp("Runtime.evaluate", {
  expression: `(async () => { ${expression} })()`,
  returnByValue: true,
  awaitPromise: true,
}).then((result) => result?.result?.value ?? null).catch(() => null);

/**
 * The page's own view of what it registered. `getTools()` is async, so it is awaited, and the
 * schemas are read here as well as the names: the browser's registry is the authority on what
 * exists, but if a descriptor arrives without a usable schema this is where the page's own is.
 */
const IN_PAGE_TOOLS = `
  const context = document.modelContext ?? null;
  if (!context || typeof context.getTools !== "function") return "[]";
  const tools = (await context.getTools()) ?? [];
  return JSON.stringify(tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? null,
    inputSchema: tool.inputSchema ?? null,
    annotations: tool.annotations ?? null,
  })));
`;

const inPageTools = async () => {
  const raw = await evaluate(IN_PAGE_TOOLS);
  try {
    return JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
};

/**
 * The names the page prints for itself. `AgentPanel` builds that list from `toolSurfaceFacts()`
 * rather than from the registrations, so it is complete from the first render and it is the only
 * thing on the page that says how many tools there are supposed to be. It is read as a target for
 * the wait below, never as a substitute for the registry: a printed name that never registers is a
 * defect, and a bridge that listed it would be covering for one.
 */
const printedToolNames = async () => {
  const raw = await evaluate(
    `return JSON.stringify([...document.querySelectorAll(".tool__name")].map((node) => node.textContent.trim()));`,
  );
  try {
    const names = JSON.parse(raw ?? "[]");
    return Array.isArray(names) ? names.filter((name) => typeof name === "string" && name) : [];
  } catch {
    return [];
  }
};

// --- The browser, and the registry it hands back ---------------------------------------------

let browser;
let profile = null;
const responded = [];
const invoked = [];
const registry = new Map();
let pageTools = [];

async function boot() {
  profile = mkdtempSync(join(tmpdir(), "withheld-mcp-"));
  browser = spawn(BROWSER, [
    "--headless=new", `--remote-debugging-port=${CDP_PORT}`,
    // Without the second switch the WebMCP domain exists and reports an empty registry, which is a
    // different result from a page that failed to register and must never be mistaken for one.
    "--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting",
    `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-gpu", "--hide-scrollbars", "--window-size=1440,900",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.on("data", () => {});
  // A spawn that fails emits `error`, and an unhandled `error` event would take this process down
  // and the client's pipe with it. It is caught, named, and reported through the protocol instead,
  // which is the whole point of not awaiting the boot: a bad WITHHELD_CHROMIUM should answer.
  let spawnError = null;
  browser.on("error", (error) => { spawnError = String(error?.message ?? error); });

  let version;
  for (let attempt = 0; attempt < BOOT_ATTEMPTS && !version; attempt += 1) {
    await sleep(250);
    if (spawnError) throw new Error(`could not start ${BROWSER}: ${spawnError}`);
    try {
      version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
    } catch { /* not listening yet */ }
  }
  if (!version) throw new Error(`Chromium never opened ${CDP_PORT} — is something else holding it?`);
  note(`browser ${version.Browser}`);
  await attach(version.webSocketDebuggerUrl);

  const { targetId } = await cdp("Target.createTarget", { url: "about:blank" }, undefined);
  ({ sessionId: session } = await cdp("Target.attachToTarget", { targetId, flatten: true }, undefined));

  // `toolsAdded` arrives one tool at a time as the registrations run, so the registry is
  // accumulated by name and never replaced. Taking the last event would leave a one-tool
  // catalogue, which is how a bridge quietly hides eight ninths of a page.
  on("WebMCP.toolsAdded", (params) => {
    for (const tool of params.tools ?? []) registry.set(tool.name, tool);
  });
  // Chromium has named this list `tools` here and `toolNames` elsewhere across versions, and one
  // carries descriptors while the other carries strings, so both are unwrapped to a name.
  on("WebMCP.toolsRemoved", (params) => {
    for (const entry of params.tools ?? params.toolNames ?? params.names ?? []) {
      registry.delete(typeof entry === "string" ? entry : entry?.name);
    }
  });
  on("WebMCP.toolInvoked", (params) => invoked.push(params));
  on("WebMCP.toolResponded", (params) => responded.push(params));

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("WebMCP.enable");
  await cdp("Page.navigate", { url: PAGE_URL });

  // The mount is the only gate. `.app__cols` is the shell the whole page hangs off, and the
  // registrations run from the hook that renders inside it.
  let mounted = false;
  for (let attempt = 0; attempt < 80 && !mounted; attempt += 1) {
    mounted = (await evaluate("return document.querySelector('.app__cols') !== null;")) === true;
    if (!mounted) await sleep(150);
  }
  if (!mounted) throw new Error(`${PAGE_URL} never mounted — is the production build being served?`);

  // Then wait for the catalogue to finish arriving, which is harder than it sounds. The page
  // registers one tool at a time, so both the browser's registry and `getTools()` answer with
  // however many have landed so far, and comparing the two can agree early: three tools from the
  // browser against two from the page satisfied a naive check here and hid the other six. So the
  // wait ends on the names the page prints, and, if the markup ever stops printing them, on both
  // counts holding still for three polls running. No count is hard-coded, because a nine written
  // here would be wrong the day a tenth tool is registered.
  let printed = [];
  let previous = -1;
  let stable = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    pageTools = await inPageTools();
    printed = await printedToolNames();
    if (printed.length > 0 && printed.every((name) => registry.has(name)) && registry.size >= pageTools.length) break;
    const counted = registry.size + pageTools.length;
    stable = counted > 0 && counted === previous ? stable + 1 : 0;
    previous = counted;
    if (stable >= 3) break;
    await sleep(150);
  }
  if (!registry.size) {
    throw new Error("the WebMCP registry came back empty — is --enable-features=WebMCPTesting set?");
  }
  const missing = printed.filter((name) => !registry.has(name));
  if (missing.length > 0) throw new Error(`the page prints tools the browser never registered: ${missing.join(", ")}`);

  // Each descriptor carries the frame that registered it, which is the frame the invoke has to be
  // addressed to; the frame tree is the fallback for a build that omits it.
  frameId = [...registry.values()].find((tool) => tool.frameId)?.frameId
    ?? (await cdp("Page.getFrameTree")).frameTree.frame.id;

  note(`registry: ${registry.size} tools from the browser, ${pageTools.length} from `
    + `document.modelContext, ${printed.length} printed on the page`);
  record("registry", {
    hostTools: [...registry.keys()], inPageTools: pageTools.map((tool) => tool.name),
    printedTools: printed, frameId, url: PAGE_URL,
  });
}

/**
 * The catalogue, as MCP wants it read. Chromium reports the annotations under its own names —
 * `readOnly` and `untrustedContent` for what the page declared as `readOnlyHint` and
 * `untrustedContentHint` — so the spec's names are restored here, at the boundary, next to the
 * originals. A schema that arrives as a string is parsed, and one that does not arrive at all is
 * taken from the page's own registration before falling back to an empty object.
 */
function catalogue() {
  const bySchema = new Map(pageTools.map((tool) => [tool.name, tool]));
  return [...registry.values()].map((tool) => {
    const raw = tool.annotations ?? {};
    const hints = { ...raw };
    if (raw.readOnly === true) hints.readOnlyHint = true;
    if (raw.untrustedContent === true) hints.untrustedContentHint = true;
    let schema = tool.inputSchema ?? bySchema.get(tool.name)?.inputSchema ?? null;
    if (typeof schema === "string") {
      try { schema = JSON.parse(schema); } catch { schema = null; }
    }
    return {
      name: tool.name,
      description: tool.description ?? bySchema.get(tool.name)?.description ?? "",
      inputSchema: schema ?? { type: "object", properties: {}, additionalProperties: false },
      ...(Object.keys(hints).length > 0 ? { annotations: hints } : {}),
    };
  });
}

/**
 * One tool call, end to end. `WebMCP.invokeTool` answers with an invocationId while the result
 * arrives as a separate `toolResponded` event, and that event can land before the command reply, so
 * the buffer is checked as well as awaited.
 */
async function invokeTool(toolName, input) {
  const before = responded.length;
  const ack = await cdp("WebMCP.invokeTool", { frameId, toolName, input });
  const id = ack?.invocationId ?? ack?.id ?? null;
  if (ack && ack.output !== undefined) {
    return { output: ack.output, status: ack.status ?? null, invocationId: id, via: "command reply" };
  }
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const index = responded.findIndex((event, i) => (id ? event.invocationId === id : i >= before));
    if (index >= 0) {
      const [event] = responded.splice(index, 1);
      return {
        output: event.output,
        status: event.status ?? null,
        invocationId: event.invocationId ?? id,
        via: "toolResponded",
      };
    }
    await sleep(100);
  }
  throw new Error(`No toolResponded for ${toolName}`);
}

/**
 * What the page actually said, dug out of whichever half of its answer carries it. A refusal is
 * `{revision, refused, code, message}` and a read is its payload; either way this is the object the
 * log records and the flag `isError` is decided from.
 */
function payloadOf(output) {
  if (output && typeof output === "object") {
    if (output.structuredContent && typeof output.structuredContent === "object") {
      return output.structuredContent;
    }
    const text = output.content?.[0]?.text;
    if (typeof text === "string") {
      try { return JSON.parse(text); } catch { return { message: text }; }
    }
    if (!Array.isArray(output.content)) return output;
  }
  return {};
}

/** The page's answer, as MCP content: passed through when it is already shaped, wrapped when not. */
function contentOf(output) {
  const given = output?.content;
  if (Array.isArray(given) && given.length > 0) return given;
  return [{ type: "text", text: JSON.stringify(output ?? null) }];
}

// --- MCP, by hand --------------------------------------------------------------------------

let order = 0;

/**
 * Booting takes five to seven seconds: a browser has to start and a page has to mount before
 * anything is registered. Waiting for that before reading stdin is what makes a client give up on
 * the handshake and proceed with an empty catalogue, and a model handed an empty catalogue answers
 * from its own memory instead of calling the page. So stdin is wired up first, the handshake is
 * answered immediately, and only the two methods that genuinely need a browser wait for one. A boot
 * failure is recorded rather than thrown, because a process that dies here takes the pipe with it.
 */
let bootError = null;
const ready = boot().then(
  () => {
    note("ready; MCP on stdin/stdout");
    // A client that already read an empty catalogue has no reason to ask again unless it is told
    // the list changed. This is that telling, sent once.
    send({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
  },
  (error) => {
    bootError = String(error?.message ?? error);
    note(`boot failed: ${bootError}`);
  },
);

async function handle(message) {
  const reply = (result) => send({ jsonrpc: "2.0", id: message.id, result });
  const fail = (code, text) => send({ jsonrpc: "2.0", id: message.id, error: { code, message: text } });
  switch (message.method) {
    case "initialize":
      return reply({
        // Echoed when the client states one, because a client told a version it did not ask for
        // has to decide whether to argue about it during its own handshake.
        protocolVersion: message.params?.protocolVersion ?? PROTOCOL,
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: "withheld-webmcp-bridge", version: "0.1.0" },
      });
    case "ping":
      return reply({});
    // Answered as empty rather than as an unknown method: several clients ask for both during the
    // handshake, and a -32601 there reads as a broken server.
    case "resources/list":
      return reply({ resources: [] });
    case "prompts/list":
      return reply({ prompts: [] });
    case "tools/list":
      await ready;
      // An empty list when the browser never came up. There is no page to speak for, and a
      // hand-written catalogue here would be the one thing this file promises not to be.
      return reply({ tools: bootError ? [] : catalogue() });
    case "tools/call": {
      await ready;
      if (bootError) {
        return fail(-32000, `No browser, so no tool can be called: ${bootError}. Either the served `
          + `build at ${PAGE_URL} is not answering, or Chromium started without `
          + `--enable-features=WebMCPTesting, or port ${CDP_PORT} is already held.`);
      }
      const name = message.params?.name;
      const input = message.params?.arguments ?? {};
      order += 1;
      const startedAt = Date.now();
      try {
        const { output, status, invocationId, via } = await invokeTool(name, input);
        const payload = payloadOf(output);
        // The page reports a refusal in the payload; the browser reports a dispatch that never
        // completed in the status. Both are `ok: false`, and they are distinguishable by `code`.
        const refused = payload?.refused === true;
        const ok = !refused && (status === null || status === "Completed");
        record("choice", {
          order, tool: name, arguments: input, invocationId, via, ms: Date.now() - startedAt,
          ok, code: payload?.code ?? (ok ? null : (status ?? "no-status")),
          summary: payload?.message ?? payload?.summary ?? null, output,
        });
        note(`${order}. ${name} → ${refused ? `REFUSED ${payload?.code}: ${payload?.message}` : (status ?? "answered")}`);
        // A refusal is a real answer from the page, not a transport failure, so it comes back as an
        // isError result the model can read and act on rather than as a JSON-RPC error. Losing the
        // code into an error string is what teaches a model to retry something fail-closed.
        return reply({
          content: contentOf(output),
          ...(output?.structuredContent ? { structuredContent: output.structuredContent } : {}),
          isError: !ok,
        });
      } catch (error) {
        record("choice", {
          order, tool: name, arguments: input, invocationId: null, via: "none",
          ms: Date.now() - startedAt, ok: false, code: "transport",
          summary: String(error?.message ?? error), output: null,
        });
        return fail(-32000, String(error?.message ?? error));
      }
    }
    default:
      // A message with no id is a notification and a notification must not be answered at all;
      // `notifications/initialized` and `notifications/cancelled` both land here.
      if (message.id !== undefined) return fail(-32601, `Unknown method ${message.method}`);
      return undefined;
  }
}

let closing = false;
const shutdown = (why) => {
  if (closing) return;
  closing = true;
  if (why) note(why);
  // SIGKILL rather than SIGTERM: the debugging port has to be free the moment this process is, and
  // a browser asked politely to leave takes its time writing a profile nothing here wants. The
  // throwaway profile goes next, best effort — Chromium's network service can flush a file or two
  // after the browser process is gone, so a small stub sometimes survives the delete. The next run
  // makes its own directory either way.
  try { browser?.kill("SIGKILL"); } catch { /* already gone */ }
  try { socket?.close(); } catch { /* never opened */ }
  try { if (profile) rmSync(profile, { recursive: true, force: true }); } catch { /* fine */ }
  process.exit(why ? 1 : 0);
};

const lines = createInterface({ input: process.stdin });
lines.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try { message = JSON.parse(line); } catch { return note(`unparseable line: ${line.slice(0, 80)}`); }
  record("in", message);
  try { await handle(message); } catch (error) { note(`handler threw: ${error?.message ?? error}`); }
});
lines.on("close", () => shutdown());
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
// A browser left running holds its debugging port, and the next run then fails for a reason that
// looks nothing like the one that caused it. So it is killed on the ugly exits too.
process.on("uncaughtException", (error) => shutdown(`uncaught: ${error?.message ?? error}`));
process.on("unhandledRejection", (error) => shutdown(`unhandled rejection: ${error?.message ?? error}`));
