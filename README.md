# next_best_prompt — next-best-prompts

A pointer to your best next moves. **next_best_prompt** is a tiny MCP server that carries
one rule: after a substantive turn, end your reply with a short, ranked menu of
**next-best-prompts** — the 2–4 highest-leverage things to do next, each a
copy-paste-ready prompt you can trigger by replying with a single digit — and
**skip entirely when there's no high-value next move.** It also appends a compact
chat handoff label showing whether the agent is working, the user owes a
response, an external dependency is pending, or the request is complete.

Pure guidance: **no secrets, no network calls, no side-effecting tools.** Safe to
install anywhere, against any project or chat.

## One rule, two transports

The rule lives in [`rule/next-best-prompt.md`](rule/next-best-prompt.md) (single source of truth)
and is code-generated into a shared module that both transports import:

- **stdio** (`src/`) — published to npm as `@danzimon/next-best-prompt-mcp`. For local
  clients: **Claude Code** and **Claude Desktop** (local install).
- **HTTP** (`remote/`, Next.js + [`mcp-handler`](https://www.npmjs.com/package/mcp-handler))
  — deployed to Vercel as a remote connector. For **Claude.ai web + mobile** and
  any client that takes a hosted MCP URL.

Both expose identical surfaces: the `instructions` field, a `next_best_prompt` prompt, and
a `get_next_best_prompts_rule` tool.

## Install

### Claude Code

```bash
claude mcp add next_best_prompt -- npx -y @danzimon/next-best-prompt-mcp
```

Claude Code auto-injects the server `instructions`, so the rule applies every
turn automatically. (Optional belt-and-suspenders: also wire the SessionStart
hook in [`hook/sessionstart-next-best-prompt.sh`](hook/sessionstart-next-best-prompt.sh).)

### Claude Desktop

Either point it at the local stdio server…

```jsonc
// claude_desktop_config.json
{ "mcpServers": { "next_best_prompt": { "command": "npx", "args": ["-y", "@danzimon/next-best-prompt-mcp"] } } }
```

…or use the hosted endpoint as a remote connector (see below). Fully quit and
relaunch Desktop after editing the config.

### Claude.ai web + mobile (hosted connector)

Mobile can't run a local server — use the hosted endpoint. On **claude.ai**
(web): **Settings → Connectors → Add custom connector**, URL:

```
https://next-best-prompt-mcp-remote.vercel.app/api/mcp
```

It's account-scoped, so it appears in the **mobile app** automatically. Requires
a plan that supports custom connectors (Pro / Max / Team / Enterprise).

### Self-host the hosted endpoint

```bash
cd remote
npm install
npm run dev        # local
# or deploy remote/ to Vercel; the MCP endpoint is /api/mcp
```

## Always-on everywhere

Only **Claude Code** auto-fires the rule every turn. On Desktop, web, and mobile,
next_best_prompt is available as an on-demand prompt/tool — for automatic every-turn
behavior, paste the condensed rule into your account preferences or a project's
custom instructions. See [`ALWAYS-ON.md`](ALWAYS-ON.md).

## Development

```bash
npm install
npm run embed        # rule/next-best-prompt.md + shared/next-best-prompt.template.ts -> generated modules
npm run check-sync   # fail if the generated copies drifted from source
npm run build        # tsc -> dist/ (prebuild runs embed)
```

Edit the rule in `rule/next-best-prompt.md` or the prompt/tool wiring in
`shared/next-best-prompt.template.ts`, then `npm run embed`. `check-sync` (run on
`prepublishOnly`) guarantees the stdio and HTTP builds never drift.

## License

[MIT](LICENSE) © 2026 Dan Zimon
