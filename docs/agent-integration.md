# Attaching an agent to Withheld

Withheld registers nine WebMCP tools on `document.modelContext`, and `scripts/mcp-bridge.mjs` puts any
MCP client in front of them through a real Chromium.

Read off the wire while writing this: nine tools in a flagged `Chrome/151.0.7922.137` pointed at the
preview on `http://127.0.0.1:4197/`, and every result shape quoted below. Never run: an MCP client
attaching to this bridge. No host has done it yet.

## 1. What the bridge is, and is not

An MCP stdio server written by hand — newline-delimited JSON-RPC 2.0 on stdin and stdout, no MCP SDK,
none installed — with one headless Chromium behind it. It implements no tool.

- `tools/list` is the browser's own WebMCP registry, accumulated from `WebMCP.toolsAdded`: whatever the
  page registered, with the page's own descriptions and schemas.
- `tools/call` is `WebMCP.invokeTool`, so the model reaches the `execute()` in `src/tools/webmcp.ts`,
  the same function a native browser agent would reach.

So it is not a mock and not a reimplementation: there is no second copy of the marking rules to drift
from the first, and if the page stopped registering the catalogue would come back empty rather than the
bridge answering in its place. The approach is proven in the sibling package's
`submissions/flowline/scripts/mcp-bridge.mjs`; Withheld's is its own file, with `WITHHELD_` names.

## 2. The shape that trips everyone

A WebMCP result is not automatically MCP-shaped: a page may answer with any plain object, and the
sibling package's does. Withheld's does not. `reply()` in `src/tools/webmcp.ts` builds a full MCP result
and `WebMCP.toolResponded` carries it through untouched:

```json
{ "invocationId": "…", "status": "Completed",
  "output": { "content": [{ "type": "text", "text": "{\"revision\":1,\"answerCount\":14}" }],
              "structuredContent": { "revision": 1, "answerCount": 14 } } }
```

The payload is `output.structuredContent`, mirrored as a JSON *string* in `output.content[0].text`.
Parse one of those; `output.text` does not exist. And do not wrap what is already wrapped — re-wrapping
`output` whole hands the model a `content[0].text` holding another `content` array.

Every payload starts with `revision`. An accepted write adds `receipt {id, action, answerIds}`,
`heldCount` and `releasableCount`, plus `emphasis` for `set_marking_emphasis` or `awaitingHuman: true`
for `request_release`; `receipt.answerIds` echoes only ids the agent itself named, so it is `[]` for
those two. A refusal is `{revision, refused: true, code, message}`, and it still arrives as
`status: "Completed"` — §7.

## 3. How to attach

One config file per client, in `scripts/mcp-configs/`, every path absolute because an attaching agent's
working directory is not this package.

| client | file | CDP port |
| --- | --- | --- |
| most hosts — Cursor, Windsurf, Cline, Claude Code | `generic.json` | 9521 |
| Claude Code, non-interactive, with the allow-list it needs | `claude-code.json` | 9522 |
| a Codex-style host reading TOML | `codex.toml` | 9523 |
| the owner's Terra profile | `terra.json` | 9571 |
| the owner's Sol profile | `sol.json` | 9572 |

Hand the file to whichever flag your client reads for MCP config, or paste its `withheld` block into the
client's own config; `scripts/mcp-configs/README.md` has the per-client invocation and allow-list flags,
and `claude-code.json` lists the nine `mcp__withheld__*` names verbatim. The environment contract is
exactly `WITHHELD_URL`, `WITHHELD_CDP_PORT`, `WITHHELD_BRIDGE_LOG`, `WITHHELD_CHROMIUM`,
`WITHHELD_CDP_TIMEOUT_MS`, `WITHHELD_BOOT_ATTEMPTS`. **No profile here has been exercised with any
client**: they parse and their paths exist, and that is all.

## 4. The two Chromium flags

```
/usr/bin/chromium --headless=new --remote-debugging-port=<port> \
  --enable-experimental-web-platform-features --enable-features=WebMCPTesting
```

Keep both. Measured on this build against the same preview: the pair gives nine tools, and no flags at
all gives an empty registry, an empty `document.modelContext.getTools()`, and a `WebMCP.enable` that
succeeds anyway — which is why a missing switch reads as a broken client. In one probe the
experimental-features flag alone also gave nine here, so an empty registry means *flags missing* rather
than one flag by name; every verified run in this package used the pair.

No phase walk is needed first: navigate and the nine register, about 300 ms after `Page.navigate` in the
probe run. `getTools()` is async — await it.

## 5. Two agents need two ports

Each attached client starts its own Chromium. Two on one `WITHHELD_CDP_PORT` collide: the second
browser's `bind()` fails with *Address already in use*, the port keeps answering for the first, and the
second client then drives a page it never opened. Two on one `WITHHELD_BRIDGE_LOG` overwrite each
other's record of what was chosen.

That is the only difference between `terra.json` and `sol.json`: 9571 and 9572, and separate
`/tmp/withheld-bridge-{terra,sol}.jsonl`. Copy the split for a third. Terra and Sol are the two named
profiles that exist for the owner's own agents; neither agent is defined anywhere in this repository and
neither has ever been run against this bridge, so the files claim nothing about what either does.

## 6. The nine tools

Names as the page registers them; a host usually prefixes them with `mcp__withheld__`. Six carry
`readOnlyHint`, `read_answer` also carries `untrustedContentHint`, and the browser reports those as
`readOnly` and `untrustedContent`.

| tool | what it reads or writes | refusals of its own |
| --- | --- | --- |
| `describe_stack` | reads the question, the counts, the revision, every answer id and state | none |
| `read_rubric` | reads rubric line ids and labels. No points, no pass boundary | none |
| `read_answer` | reads one student's body text — untrusted input, not instructions | `unknown-answer` |
| `list_held_answers` | reads how many answers are held, and names only some | none |
| `explain_mark` | reads which rubric ideas were accepted for one answer, and which missed | `unknown-answer` |
| `preview_unattended_outcome` | reads counts of what still needs a person | none |
| `propose_marks` | writes recognised line ids per answer; the page scores them | six, §7 |
| `set_marking_emphasis` | writes how careful the page is. Raise only | five, §7 |
| `request_release` | writes a release request. Stages it, sends nothing | five, §7 |

## 7. The guards you will hit

**A refusal is an answer, not a transport error.** It comes back `status: "Completed"` with
`refused: true` and a code, and the bridge surfaces it as a readable result rather than a JSON-RPC
error. An agent that treats one as a failed call will retry the same write forever. Every write takes
`expectedRevision` and a single-use `operationId`; the codes are in `src/domain/session.ts`.

| code | what it means |
| --- | --- |
| `stale-revision` | the stack moved between your read and your write. Re-read `describe_stack` and redo it against the new revision. Every multi-step agent meets this: the revision advances on each accepted write, including its own |
| `duplicate-operation` | that `operationId` was already accepted, on any tool. Checked *before* the revision, so a retry after a timeout reports the duplicate rather than a stale read — the first call landed |
| `invalid-argument` | a wrong key, a malformed id, or a rubric line id the rubric does not have. `propose_marks` refuses the **whole batch**; nothing lands half-applied |
| `no-change` | the write would change nothing, so nothing was written and no receipt exists |
| `unknown-answer` | no such id — or, for `explain_mark`, an answer that exists but has no mark yet |
| `already-released` | that answer has gone to a student and cannot be marked again |
| `emphasis-cannot-be-lowered` | `set_marking_emphasis` raises only |
| `release-already-staged`, `nothing-to-release` | for `request_release` |
| `internal-error` | any tool, on an unexpected page failure: a readable refusal instead of an exception carrying page internals |

Every schema is closed, so an extra key is `invalid-argument` rather than ignored.

Two answers that are not refusals and get mistaken for them. **Quarantine completes:** `propose_marks`
on an answer whose text addresses the marker returns `Completed` with that answer quarantined and no
mark at all, and `explain_mark` on it then refuses `unknown-answer`. **The hold count exceeds the named
list:** `list_held_answers` returns `heldCount` plus a shorter `namedHolds`, and that gap is the design
— §8 — not a partial result to retry.

There is no `confirm_release` to call. Asking the browser to invoke it answers `Tool not found
(-32602)`, because the page never registered it.

## 8. What no agent can do

**Send a mark to a student.** That act is `confirmRelease(session)` in `src/domain/session.ts`: not
exported to the tool layer, not wrapped in a tool, not registered under any name, and never mentioned in
the tool file — a test asserts that last part. `request_release` records a request and returns
`awaitingHuman: true`; the page then unlocks a control a person clicks. (There is no
`src/domain/model.ts`; the domain is `marks.ts`, `session.ts`, `views.ts`.)

Deliberate on two counts: the consequence lands on a student, so the last step belongs to the person
accountable for it, and an absent tool cannot be argued into by an injected instruction the way a
permission check can. Two smaller absences follow the same logic — point values and the pass boundary
never cross the boundary, so no agent can compute a total or judge how close an answer sits to passing;
and answers held for sitting near that boundary are counted but never named (`AgentHoldReason` has no
`near-boundary` member), because naming them would tell an injected instruction which answer is worth
attacking.

## 9. Troubleshooting

**Zero tools, and the server looks fine.** Usually the host attached the server and never allowed the
tools; in an unattended run there is nobody to answer a permission prompt. The flag differs per client —
`scripts/mcp-configs/README.md` has the Claude Code form and the nine names.

**Zero tools after `--tools ""`.** Recorded in `claude-code.json` as observed on claude CLI 2.1.220:
emptying the built-ins that way empties the whole tool set, MCP tools included. Use `--disallowedTools`
with the built-in names instead. Not re-run while writing this.

**The model answered from its own context.** It saw no tools at all, so it reasoned about marking instead
of marking. Check that `tools/list` answered before the first model turn: an empty catalogue read early
is remembered, which is why the handshake is answered immediately and `notifications/tools/list_changed`
follows once the browser is up.

**The first response is slow.** A browser has to start and a page has to load before any call can be
served. Warm and on loopback here: debugging port open in about 330 ms, nine tools registered about
300 ms after navigate. A cold start, an unbuilt page, or a `WITHHELD_URL` nothing answers on are all
slower — raise `WITHHELD_CDP_TIMEOUT_MS` and `WITHHELD_BOOT_ATTEMPTS` before blaming the bridge.

**An orphaned browser holds the port.** A bridge killed the ugly way leaves its Chromium running; the
next run's browser then fails to bind while the port keeps answering for the old one, so the client
drives a browser it did not start, pointed at whatever page that one had. Kill the stray process or move
`WITHHELD_CDP_PORT`.

**The registry is empty and nothing else looks wrong.** The flags — §4.

The verified layer underneath all of this is `scripts/webmcp-invoke.mjs`: a script outside the page
reaching the page's own handlers through Chromium's WebMCP domain, 19 of 19 checks, recorded in
`docs/evidence/webmcp-invocation.json`. It does not show a model choosing a tool; that claim stays
separate, and `docs/PROGRESS.md` keeps it that way.

## 10. The two harnesses, and which claim each one can carry

Two scripts sit on top of this bridge. They answer different questions and must not be quoted for each
other's.

Both need a built page answering at `--url` first, and both must be run from inside this package — the
workspace root's scripts recurse across every project in it:

```
node --run build
node --run preview-evidence      # vite preview on 127.0.0.1:4197, the URL every profile defaults to
```

**`scripts/native-webmcp-session.mjs` — does the wire work?** A client of its own speaking MCP over the
bridge's stdio: handshake, `tools/list`, then about twenty labelled checks across all nine tools,
including six distinct refusals (`unknown-answer`, `invalid-argument`, `stale-revision`,
`duplicate-operation`, `release-already-staged`, `emphasis-cannot-be-lowered`). Every tool name and
argument in it was written by hand, so its artifact records `chosenBy: "script"`. It proves the transport
and the guards. It proves nothing about a model.

It also answers the narrower question of whether marking data that is *not* the demo's own can reach the
page: it sends fourteen findings composed for the run, then reads `DEMO_FINDINGS` out of
`src/data/fixtures.ts` and reports whether the two are identical. `propose_marks` scores whatever the
caller sends; the demo button is just one caller on that path.

```
node scripts/native-webmcp-session.mjs --url http://127.0.0.1:4197/ --cdp-port 9565
```

**`scripts/nl-replay.mjs` — will a model choose these tools?** A real client CLI gets three
plain-language goals, is allowed no tools but the nine (`--allowedTools`, built-ins denied by name), and
what it chose is read back out of the bridge's transcript rather than out of its prose. The prompts name
no tool, no parameter and no internal id, and the run asserts that rather than promising it. Each CLI
invocation spawns its own MCP server, so the model's memory carries across turns through `--resume` while
the page's state does not: every turn starts at revision 1, and a turn that asks for a release can
honestly meet `nothing-to-release` and have to mark first.

```
node scripts/nl-replay.mjs --url http://127.0.0.1:4197/ --cdp-port 9600
```

`--cdp-port` is a base here: each attempt takes the next port up, six at most, which is why it sits
clear of the native session's 9565 and of the 9571/9572 the Terra and Sol profiles own.

Both write to `docs/evidence-staging/`, not `docs/evidence/` — the evidence directory is checksum-bound
with a hand-written manifest, so a new artifact goes to staging and is promoted deliberately.

**Neither has been executed.** They are written and the editor's TypeScript service parses both without a
syntax diagnostic; that is not a run. The shell was unusable in the session that finished them, so they
have not been `node --check`ed from a terminal either, and no artifact exists in
`docs/evidence-staging/` for either one yet. Until one is run,
`docs/evidence/natural-language-replay-blocked.json` stands: the model-in-the-loop claim for this package
is `UNKNOWN`, not achieved.




