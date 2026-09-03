# Attaching an agent to Withheld's nine tools

These are client profiles for one program: `/home/andro/dev/projects/webmcp-challenge/submissions/withheld/scripts/mcp-bridge.mjs`, an MCP stdio server that fronts the nine WebMCP tools this page registers in a real Chromium. The bridge implements no tool of its own — `tools/list` is what the page registered, and `tools/call` dispatches into the page's own handler over CDP.

Every path in every file here is absolute, because the working directory of an attaching agent is not this package.

## Point a client at one

| File | Shape | Port |
| --- | --- | --- |
| `generic.json` | plain `mcpServers` — Claude Code, Cursor, Windsurf, Cline, most hosts | 9521 |
| `claude-code.json` | same server plus the allow-list a non-interactive run needs | 9522 |
| `codex.toml` | `[mcp_servers.withheld]` TOML for a Codex-style host | 9523 |
| `terra.json` | the owner's Terra profile | 9571 |
| `sol.json` | the owner's Sol profile | 9572 |

Either hand the file to the flag your client reads for MCP config (Claude Code: `--mcp-config <file> --strict-mcp-config`), or paste the `withheld` block into the client's own config. Hosts ignore the extra top-level keys (`note`, `requires`, `doNot`, `agent`, `pairsWith`); if a strict host rejects them, keep `mcpServers` and drop the rest.

## Attaching is only half of it

The most common way an agent ends up seeing zero tools is not a broken server — it is a host that attached the server and then never allowed the tools. The flag differs per client, so check yours:

- Claude Code: `--allowedTools mcp__withheld__<tool> …` (the nine names are listed in `claude-code.json`), plus `--permission-mode dontAsk` for an unattended run. Do **not** pass `--tools ""` to silence the built-ins; on CLI 2.1.220 that empties the whole tool set, MCP tools included, and the model then answers from its own context without calling anything. Use `--disallowedTools` with the built-in names.
- Other hosts: some auto-approve MCP tools, some need each one ticked in a UI, some have a per-server "trust" toggle. If `tools/list` looked healthy and nothing was ever called, that toggle is where to look.

The nine names, as the page registers them (a host prefixes them, usually `mcp__withheld__`): `describe_stack`, `read_rubric`, `read_answer`, `list_held_answers`, `explain_mark`, `preview_unattended_outcome`, `propose_marks`, `set_marking_emphasis`, `request_release`. There is no `confirm_release` — sending a release is the human's control and the page never registers it as a tool.

## Two agents, two ports

Each attached client spawns its own headless Chromium. Two of them on one `WITHHELD_CDP_PORT` collide, and two of them on one `WITHHELD_BRIDGE_LOG` overwrite each other's record of what was chosen. That is the only difference between `terra.json` and `sol.json`: 9571/9572 and separate transcripts. Copy the same split for a third.

Terra and Sol, one per terminal, in any order — neither waits for the other:

```
claude --mcp-config /home/andro/dev/projects/webmcp-challenge/submissions/withheld/scripts/mcp-configs/terra.json \
  --strict-mcp-config \
  --allowedTools mcp__withheld__describe_stack mcp__withheld__read_rubric mcp__withheld__read_answer \
    mcp__withheld__list_held_answers mcp__withheld__explain_mark mcp__withheld__preview_unattended_outcome \
    mcp__withheld__propose_marks mcp__withheld__set_marking_emphasis mcp__withheld__request_release
```

Swap `terra.json` for `sol.json` in the second terminal. Add `--permission-mode dontAsk --print "<goal>"` for an unattended turn. Afterwards, `/tmp/withheld-bridge-terra.jsonl` and `/tmp/withheld-bridge-sol.jsonl` hold one `"direction":"choice"` line per call actually dispatched — that transcript, not the model's prose, is what says which tools were chosen.


## The page has to be reachable

The bridge navigates to `WITHHELD_URL`; if nothing answers there, it comes up with an empty registry and the client sees no tools. A production preview is already serving at <http://127.0.0.1:4197/> — it answered 200 when these files were written, and it is the default in every profile. Do not start a second one; if you need your own, run `node --run build && node --run preview-evidence` from inside this package (never from the workspace root, whose scripts recurse across every project). Plain `node --run preview` serves on vite's default 4173 instead, which is why the `preview-evidence` script exists — it pins 127.0.0.1:4197, the URL every profile here already points at.

The env contract is exactly: `WITHHELD_URL`, `WITHHELD_CDP_PORT`, `WITHHELD_BRIDGE_LOG`, `WITHHELD_CHROMIUM`, `WITHHELD_CDP_TIMEOUT_MS`, `WITHHELD_BOOT_ATTEMPTS`. The Chromium the bridge launches needs `--enable-features=WebMCPTesting`; without it the WebMCP registry comes back empty, which looks exactly like a bug in your client.

## What is verified and what is not

- **None of these five profiles has been exercised.** They are written and syntactically valid — every `.json` here parses, and every absolute path in them was stat'd: `/usr/bin/chromium` and the page are there, and the `/tmp/*.jsonl` transcripts are outputs the bridge creates on first run. No client has been attached with any of them.
- **The bridge itself is on disk and has answered.** It was landing while these files were written and is here now. The writer who landed it reported a handshake against it: nine tools listed, `describe_stack` returning `answerCount: 14` at `revision: 1`, and `read_answer {"answerId":"ans-99"}` refusing `unknown-answer` with `isError: true`. That is one measurement reported by its author, not a re-run — confirm the file exists and handshake it yourself before you depend on a profile.

- **Terra and Sol are names, not programs.** Neither is defined anywhere in this repository and no run has ever been made with either. They are two client profiles the owner points at whatever CLI they actually run; nothing here claims a capability for them.
- **`codex.toml` is documented, not verified** — no Codex client has been run against this bridge.
- **What is verified is the layer underneath.** `/home/andro/dev/projects/webmcp-challenge/submissions/withheld/scripts/webmcp-invoke.mjs` drives these same nine tools over CDP and passed 19 of 19 checks, recorded in `/home/andro/dev/projects/webmcp-challenge/submissions/withheld/docs/evidence/webmcp-invocation.json` (that file was read, not re-run, while writing this). That is a script calling the page, not a model choosing a tool — the model-in-the-loop claim stays separate, and `docs/PROGRESS.md` keeps it that way.
