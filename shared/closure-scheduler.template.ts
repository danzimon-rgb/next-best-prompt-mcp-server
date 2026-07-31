// @ts-nocheck
/* AUTO-GENERATED — DO NOT EDIT THE GENERATED COPIES.
 *
 * Single source of truth:
 *   - the rule text → rule/closure-scheduler.md
 *   - this template → shared/closure-scheduler.template.ts
 *
 * Regenerate with:  npm run embed
 * Verify sync with: npm run check-sync
 *
 * Deliberately a SEPARATE template from next-best-prompt.template.ts rather than
 * a shared parameterized one. The two rules ship on their own schedules and the
 * incumbent's generated module has to stay byte-identical while both exist. One
 * shared template would couple their descriptions and make that impossible.
 *
 * Since 2026-07-30 this module is generated into BOTH transports — the stdio
 * entrypoint (src/) and the hosted HTTP server (remote/lib/) — so they are
 * byte-identical by construction. scripts/check-sync.mjs enforces it.
 *
 * The `__CLOSURE_SCHEDULER_RULE_JSON__` token below is replaced by
 * scripts/embed.mjs with the JSON-encoded contents of rule/closure-scheduler.md.
 */

export const CLOSURE_SCHEDULER_RULE = __CLOSURE_SCHEDULER_RULE_JSON__;

// Keep startup context small. The full rule is returned once, by the required
// session-start tool call, rather than duplicated in both server instructions
// and the tool result.
export const CLOSURE_SCHEDULER_BOOTSTRAP =
  "At the beginning of every session, call `get_next_best_prompts_rule` and " +
  "treat the returned rule as active instructions for the session. Follow it " +
  "after every substantive response. Call again only after reconnecting or when " +
  "the server identity/version changes.";

const PROMPT_DESCRIPTION =
  "Return the closure-scheduler end-of-turn rule: classify the turn, act before " +
  "offering, then render an execution board of 1-3 digit-selectable actions with " +
  "explicit dispatch semantics (RUN HERE / PASTE TO / EXTERNAL), plus QUEUE and " +
  "IN FLIGHT sections and a request/program handoff. Skip the board when there is " +
  "no valuable next move, and say so.";

const TOOL_DESCRIPTION =
  "Return the closure_scheduler rule as text — the same guidance this server " +
  "carries in its `instructions`, for clients that don't auto-load server " +
  "instructions.";

/**
 * Register closure_scheduler's surfaces on an MCP server. Transport-agnostic:
 * the `.prompt()` / `.tool()` API is identical between @modelcontextprotocol/sdk's
 * McpServer (stdio) and mcp-handler's server (Vercel Streamable HTTP).
 *
 * The TOOL name is deliberately `get_next_best_prompts_rule`, identical to the
 * incumbent's. CLAUDE.md instructs the agent to call that tool by name at session
 * start; keeping the name means switching between the two servers stays a
 * one-line config change instead of silently breaking that instruction.
 */
export function registerClosureScheduler(server) {
  server.prompt("closure_scheduler", PROMPT_DESCRIPTION, () => ({
    messages: [
      { role: "user", content: { type: "text", text: CLOSURE_SCHEDULER_RULE } },
    ],
  }));

  server.tool("get_next_best_prompts_rule", TOOL_DESCRIPTION, async () => ({
    content: [{ type: "text", text: CLOSURE_SCHEDULER_RULE }],
  }));
}
