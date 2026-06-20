// @ts-nocheck
/* AUTO-GENERATED — DO NOT EDIT THE GENERATED COPIES.
 *
 * Single source of truth:
 *   - the rule text → rule/next-best-prompt.md
 *   - this template → shared/next-best-prompt.template.ts
 *
 * Regenerate both copies (src/ and remote/lib/) with:  npm run embed
 * Verify they are in sync with:                        npm run check-sync
 *
 * The same module is generated into both transports so each builds standalone
 * (no cross-package imports, no bundler) while staying byte-identical. The
 * `__NEXT_BEST_PROMPT_RULE_JSON__` token below is replaced by scripts/embed.mjs with the
 * JSON-encoded contents of rule/next-best-prompt.md.
 */

export const NEXT_BEST_PROMPT_RULE = __NEXT_BEST_PROMPT_RULE_JSON__;

const PROMPT_DESCRIPTION =
  "Return the next-best-prompts end-of-turn rule: end a substantive turn with " +
  "2-4 ranked, numbered, copy-paste-ready next moves the user can pick with one " +
  "digit — and skip entirely when there's no high-value next step.";

const TOOL_DESCRIPTION =
  "Return the next_best_prompt next-best-prompts rule as text — the same guidance this " +
  "server carries in its `instructions`, for clients that don't auto-load server " +
  "instructions.";

/**
 * Register next_best_prompt's surfaces on an MCP server. Transport-agnostic: the
 * `.prompt()` / `.tool()` API is identical between @modelcontextprotocol/sdk's
 * McpServer (stdio) and mcp-handler's server (Vercel Streamable HTTP), so one
 * function serves both entrypoints.
 */
export function registerNextBestPrompt(server) {
  // Invocable on demand (slash-command style) + fallback for clients that do
  // not surface the server `instructions` field.
  server.prompt("next_best_prompt", PROMPT_DESCRIPTION, () => ({
    messages: [
      { role: "user", content: { type: "text", text: NEXT_BEST_PROMPT_RULE } },
    ],
  }));

  // A tool so the server declares a `tools` capability (some bridges, e.g.
  // mcp-remote, error on tools/list otherwise) and so any client can fetch the
  // rule on demand even when it ignores server instructions.
  server.tool("get_next_best_prompts_rule", TOOL_DESCRIPTION, async () => ({
    content: [{ type: "text", text: NEXT_BEST_PROMPT_RULE }],
  }));
}
