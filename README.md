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

## closure_scheduler v0.5.4 canary

The repository also carries a separate, stdio-only `closure_scheduler` candidate.
It keeps the incumbent and hosted behavior unchanged while the execution-board
contract is evaluated.

Its startup instructions are a 260-byte bootstrap that requires one
`get_next_best_prompts_rule` call. The full rule is returned by that call instead
of being duplicated in both startup instructions and the tool result. The local
wrapper also resolves a numeric nvm default directly, avoiding a full nvm startup
when possible.

Unlike v0.5.2, v0.5.4 requires at least one selectable next suggested prompt
after every substantive response, including completed, gated, and in-flight
turns. When no alternative is genuinely useful, it emits one honest optional
follow-up rather than omitting the board or padding the menu.

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
cover the observed regressions and valid counterexamples. The root test enforces
the original 15,655-byte rule ceiling.

The canary also exposes `check_state_readiness`, a read-only local gate that
classifies the continuity stack as `PASS`, `DEGRADED`, or `BLOCK`. It checks the
handoff TTL, live-file size budgets, project hot/log chronology and freshness,
active-action freshness, and the project workspace-state section. `DEGRADED`
quarantines named sources; `BLOCK` permits only state reconciliation until a
recheck passes. Missing wikis, size hygiene, future timestamps, and ordinary
hot/log lag are `DEGRADED`, not hard stops. `BLOCK` is reserved for invalid or
ambiguous project identity, contradictory within-section chronology, or a hot
head more than 14 days behind usable durable history. Output is severity-ordered
and capped at five findings and 1,000 bytes.

Project identity is derived from one validated enclosing Git checkout, then the
first workspace path segment. Conflicting nested checkout identities `BLOCK`
until `--project-name` resolves the ambiguity. Linked-worktree metadata is
trusted only when its target, common directory, and checkout back-pointer all
validate inside the workspace. Wiki resolution matches the workspace loader:
canonical `_wikis/<project>/wiki`, legacy sibling `<project>-wiki/wiki`, then
common suffix-stripped variants.

The same engine is available without MCP:

```bash
closure-state-readiness --project-cwd /absolute/project/path
closure-state-readiness --project-cwd /absolute/project/path --json
closure-state-readiness --project-cwd /absolute/worktree --project-name canonical-project
```

Exit codes are `0` for `PASS`, `2` for `DEGRADED`, `1` for `BLOCK`, and `64`
for invalid invocation. The rendered-output validator accepts `stateReadiness`
and `stateReadinessExcludedSources` context fields. Under `BLOCK` it enforces a
nonempty board, `Program: GATED`, and an exact clearing owner; the rule itself
governs whether the actions are genuinely state reconciliation.

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
