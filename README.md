# next_best_prompt — next-best-prompts

A pointer to your best next moves. **next_best_prompt** is a tiny MCP server that carries
one rule: after a substantive turn, end your reply with a short, ranked menu of
**next-best-prompts** — the 2–4 highest-leverage things to do next, each a
copy-paste-ready prompt you can trigger by replying with a single digit — and
**skip entirely when there's no high-value next move.** It also appends a compact
execution handoff that records the exact stopping point, next actor and action,
and whether a named human intervention is required.

Pure guidance: **no secrets, no network calls, no side-effecting tools.** Safe to
install anywhere, against any project or chat.

## Two rules, two transports

Each rule lives in `rule/` (single source of truth) and is code-generated into a
module that the transports serving it import:

- **stdio** (`src/`) — two entrypoints. `src/index.ts` is the v0.3
  `next_best_prompt` incumbent, published to npm as
  `@danzimon/next-best-prompt-mcp`. `src/closure-scheduler-index.ts` is
  `closure_scheduler` v0.5.7. **Enable exactly one of them in a given client.**
  For local clients: **Claude Code** and **Claude Desktop** (local install).
- **HTTP** (`remote/`, Next.js + [`mcp-handler`](https://www.npmjs.com/package/mcp-handler))
  — deployed to Vercel as a remote connector, serving `closure_scheduler` v0.5.7
  byte-identically with the stdio candidate. For **Claude.ai web + mobile** and
  any client that takes a hosted MCP URL.

Both closure_scheduler transports expose identical surfaces: the `instructions`
field (a compact bootstrap), a `closure_scheduler` prompt, and a
`get_next_best_prompts_rule` tool. The tool name is deliberately the same one the
incumbent uses, so switching a client between them needs no other change.

## closure_scheduler v0.5.7

The `closure_scheduler` line has been live on stdio since 2026-07-28 and
canonical since `5a5ba9d`. **As of 2026-07-30 the hosted endpoint serves that
same line**, so claude.ai web and mobile run the same rule as Claude Code.

That reverses [PR #6](https://github.com/danzimon-rgb/next-best-prompt-mcp-server/pull/6),
which deliberately pinned the hosted target to the incumbent so the remote
surface would never change behaviour underneath anyone. The guarantee was
written while closure_scheduler was an untested draft. Once it had run on stdio
for days, keeping it was the bigger hazard: the terminal and the web/mobile apps
were following two different end-of-turn rules — exactly the split-brain the
"enable exactly one" note forbids, spread across surfaces rather than within one
session. ⚠ Existing claude.ai and mobile sessions changed behaviour at their next
reconnect. Rollback is `git revert` of the merge plus the automatic redeploy.

Its startup instructions are a 260-byte bootstrap that requires one
`get_next_best_prompts_rule` call. The full rule is returned by that call instead
of being duplicated in both startup instructions and the tool result. The local
wrapper also resolves a numeric nvm default directly, avoiding a full nvm startup
when possible.

Unlike v0.5.2, v0.5.3 requires at least one selectable next suggested prompt
after every substantive response, including completed, gated, and in-flight
turns. When no alternative is genuinely useful, it emits one honest optional
follow-up rather than omitting the board or padding the menu.

v0.5.5 adds two prompt-only safeguards: after two independent review `BLOCK` verdicts
in one subsystem, it prefers parking or redesign unless another patch introduces
a new discriminating invariant; and when the user names an agent window,
session, or artifact, it reads that exact source instead of substituting another
active session or the globally newest transcript.

v0.5.6 makes terminal closure visible. A completed program leads with `Loop
closed` and observable proof; a request that finishes while its program remains
active or gated cannot use that acknowledgement. The sole post-closure action is
explicitly new optional scope, and a closed loop reopens only for changed input,
failed completion proof, or a genuinely new defect class.

v0.5.7 tightens the existing no-courier rule without growing the served prompt:
when an in-scope agent result is readable, the current agent reads the named
source directly instead of asking the operator to paste or relay it. If the
source is unreadable, the existing checkpoint-and-never-infer path still applies.

Rendered responses can be checked without adding runtime prompt tokens:

```bash
npm run validate:closure -- response.md
npm run validate:closure -- --context scenario.json response.md
npm run test:closure-validator
```

The optional context JSON supports `defensiblePriority`,
`alreadyAuthorizedActionPatterns`, `operatorCourierPatterns`, and
`requiredAgentDispatchOwners`. It also supports `completionDeliveryRequired`,
which makes blocking `IN FLIGHT` work name how its terminal result reaches the
user and requires a concrete `AFTER` action. `requiredAgentDispatchOwners` names
cross-surface agents whose required work must appear as either a self-contained
`PASTE TO` action or a verified `IN FLIGHT` checkpoint. The committed fixtures
cover the observed regressions and valid counterexamples. Terminal workflows use
`terminalClosureRequired`, `terminalClosureForbidden`, and
`postClosureOptional`. `readableAgentResult` plus `directReadSourcePatterns`
exercise the direct-read/no-courier boundary. The root smoke rejects rule growth
past the 17,330-byte v0.5.6 baseline, warns above 17,408 bytes, and fails above
the deliberate 18,432-byte hard ceiling.

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

```text
https://next-best-prompt-mcp-remote.vercel.app/api/mcp
```

It's account-scoped, so it appears in the **mobile app** automatically. Requires
a plan that supports custom connectors (Pro / Max / Team / Enterprise).

This endpoint serves **`closure_scheduler` v0.5.7**, the same rule the local
stdio candidate serves. The Vercel project name (`next-best-prompt-mcp-remote`)
and the tool name (`get_next_best_prompts_rule`) are unchanged, so an existing
connector needs no edit. To confirm what a host is actually serving:

```bash
npm run smoke:remote                                   # production endpoint
npm run smoke:remote -- http://localhost:3000/api/mcp  # a local `next dev`
```

### Self-host the hosted endpoint

```bash
cd remote
npm install
npm run dev        # local
# or deploy remote/ to Vercel; the MCP endpoint is /api/mcp
```

## Always-on everywhere

Only **Claude Code** auto-fires the rule every turn. On Desktop, web, and mobile,
the server is available as an on-demand prompt/tool — for automatic every-turn
behavior, paste the block from [`ALWAYS-ON.md`](ALWAYS-ON.md) into your account
preferences or a project's custom instructions.

That block is 2,559 bytes in two parts: a **bootstrap** telling the agent to call
`get_next_best_prompts_rule` and follow whatever it returns, plus a compact
**fallback** for surfaces where the tool is unavailable. Since the hosted
connector serves v0.5.7, the bootstrap is the live path and the fallback rarely
governs — which is exactly why it does not need to restate all 17,270 bytes.

## Development

```bash
npm install
npm run embed           # rule/*.md + shared/*.template.ts -> generated modules
npm run check-sync      # fail if the generated copies drifted from source
npm run check-always-on # fail if ALWAYS-ON.md's condensed block drifted
npm run build           # tsc -> dist/ (prebuild runs embed)
npm test                # both drift checks + build + stdio smokes + fixtures
npm run smoke:remote    # live handshake against the hosted endpoint (network)
```

Edit a rule in `rule/` or the prompt/tool wiring in the matching
`shared/*.template.ts`, then `npm run embed`. `check-sync` (run on
`prepublishOnly`) guarantees the stdio and HTTP builds never drift; it covers
every target in `scripts/embed.mjs`, including `remote/lib/`.

`ALWAYS-ON.md`'s paste block is the one copy of the rule written by hand rather
than generated, because a 15 KB rule cannot go in a preferences field.
`check-always-on` guards it by asserting the byte counts the file states about
itself and about the rule are both currently true — so any change to the rule
fails the build and forces a human to re-read the condensed copy. It cannot
prove the condensed wording is still *faithful*; treat a failure as "go re-read
both", not "fix the number".

It also cannot see the copy that actually matters — the one pasted into a
person's account settings. Nothing in this repo can reach that, so when the block
changes, re-pasting it is a manual step with no automated check behind it.

`npm test` is hermetic; `smoke:remote` is the only script that touches the
network.

## License

[MIT](LICENSE) © 2026 Dan Zimon
