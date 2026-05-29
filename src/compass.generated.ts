// @ts-nocheck
/* AUTO-GENERATED — DO NOT EDIT THE GENERATED COPIES.
 *
 * Single source of truth:
 *   - the rule text → rule/compass.md
 *   - this template → shared/compass.template.ts
 *
 * Regenerate both copies (src/ and remote/lib/) with:  npm run embed
 * Verify they are in sync with:                        npm run check-sync
 *
 * The same module is generated into both transports so each builds standalone
 * (no cross-package imports, no bundler) while staying byte-identical. The
 * `"# compass — next-best-prompts at end of turn\n\n`compass` points to the best next moves. After completing a substantive turn,\nend your response with a short, ranked menu of **next-best-prompts**: the 2–4\nhighest-leverage things the user could do next. The user replies with a single\ndigit to pick one; you then act on it.\n\n## Format\n\nEnd the message with a section exactly like this:\n\n**Next-best-prompts** (reply with the number):\n\n1. **[HIGH]** \"copy-paste-ready prompt text\" — one-line rationale\n2. **[MED]** \"copy-paste-ready prompt text\" — one-line rationale\n3. **[LOW]** \"copy-paste-ready prompt text\" — one-line rationale\n\nFormat rules:\n- **Number every option** (`1.`, `2.`, …) so the user can reply with just the digit.\n- Tag each **[HIGH] / [MED] / [LOW]** by leverage, highest first.\n- The quoted text is the actual prompt the user would send — written so they can\n  copy-paste it or simply reply with the number.\n- Give each a **one-line rationale** after an em-dash.\n- 2–4 options. Never more than 4.\n\n## When to apply\n\nAfter any substantive turn — work shipped, a question answered in depth, a\ndecision reached, an artifact produced.\n\n## When NOT to apply (load-bearing)\n\n- **Skip the section entirely when there is no high-value next move.** Silence\n  beats menu-padding.\n- Don't pad to hit a count. One real option beats three filler ones — and zero\n  beats one fake one.\n- Don't offer options that merely restate the task in progress or ask for a\n  trivial confirmation.\n\n## Why\n\nRanked, numbered, copy-paste-ready options make it cheap to act — the user\nreplies with one digit instead of composing the next instruction. The\nHIGH/MED/LOW tags expose your judgment about leverage. The skip-when-empty rule\nkeeps it signal, not noise.\n"` token below is replaced by scripts/embed.mjs with the
 * JSON-encoded contents of rule/compass.md.
 */

export const COMPASS_RULE = "# compass — next-best-prompts at end of turn\n\n`compass` points to the best next moves. After completing a substantive turn,\nend your response with a short, ranked menu of **next-best-prompts**: the 2–4\nhighest-leverage things the user could do next. The user replies with a single\ndigit to pick one; you then act on it.\n\n## Format\n\nEnd the message with a section exactly like this:\n\n**Next-best-prompts** (reply with the number):\n\n1. **[HIGH]** \"copy-paste-ready prompt text\" — one-line rationale\n2. **[MED]** \"copy-paste-ready prompt text\" — one-line rationale\n3. **[LOW]** \"copy-paste-ready prompt text\" — one-line rationale\n\nFormat rules:\n- **Number every option** (`1.`, `2.`, …) so the user can reply with just the digit.\n- Tag each **[HIGH] / [MED] / [LOW]** by leverage, highest first.\n- The quoted text is the actual prompt the user would send — written so they can\n  copy-paste it or simply reply with the number.\n- Give each a **one-line rationale** after an em-dash.\n- 2–4 options. Never more than 4.\n\n## When to apply\n\nAfter any substantive turn — work shipped, a question answered in depth, a\ndecision reached, an artifact produced.\n\n## When NOT to apply (load-bearing)\n\n- **Skip the section entirely when there is no high-value next move.** Silence\n  beats menu-padding.\n- Don't pad to hit a count. One real option beats three filler ones — and zero\n  beats one fake one.\n- Don't offer options that merely restate the task in progress or ask for a\n  trivial confirmation.\n\n## Why\n\nRanked, numbered, copy-paste-ready options make it cheap to act — the user\nreplies with one digit instead of composing the next instruction. The\nHIGH/MED/LOW tags expose your judgment about leverage. The skip-when-empty rule\nkeeps it signal, not noise.\n";

const PROMPT_DESCRIPTION =
  "Return the next-best-prompts end-of-turn rule: end a substantive turn with " +
  "2-4 ranked, numbered, copy-paste-ready next moves the user can pick with one " +
  "digit — and skip entirely when there's no high-value next step.";

const TOOL_DESCRIPTION =
  "Return the compass next-best-prompts rule as text — the same guidance this " +
  "server carries in its `instructions`, for clients that don't auto-load server " +
  "instructions.";

/**
 * Register compass's surfaces on an MCP server. Transport-agnostic: the
 * `.prompt()` / `.tool()` API is identical between @modelcontextprotocol/sdk's
 * McpServer (stdio) and mcp-handler's server (Vercel Streamable HTTP), so one
 * function serves both entrypoints.
 */
export function registerCompass(server) {
  // Invocable on demand (slash-command style) + fallback for clients that do
  // not surface the server `instructions` field.
  server.prompt("compass", PROMPT_DESCRIPTION, () => ({
    messages: [
      { role: "user", content: { type: "text", text: COMPASS_RULE } },
    ],
  }));

  // A tool so the server declares a `tools` capability (some bridges, e.g.
  // mcp-remote, error on tools/list otherwise) and so any client can fetch the
  // rule on demand even when it ignores server instructions.
  server.tool("get_next_best_prompts_rule", TOOL_DESCRIPTION, async () => ({
    content: [{ type: "text", text: COMPASS_RULE }],
  }));
}
