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
 * a shared parameterized one. closure_scheduler is an A/B candidate that must be
 * discardable without touching the incumbent, and next_best_prompt's generated
 * module has to stay byte-identical while both exist. One shared template would
 * couple their descriptions and make that guarantee impossible to keep.
 *
 * The `__CLOSURE_SCHEDULER_RULE_JSON__` token below is replaced by
 * scripts/embed.mjs with the JSON-encoded contents of rule/closure-scheduler.md.
 */

export const CLOSURE_SCHEDULER_RULE = __CLOSURE_SCHEDULER_RULE_JSON__;

// Keep startup context small. The full rule is returned once, by the required
// session-start tool call, rather than duplicated in both server instructions
// and the tool result.
import { z } from "zod";
import {
  assessStateReadiness,
  formatStateReadiness,
} from "./state-readiness.js";

export const CLOSURE_SCHEDULER_BOOTSTRAP =
  "At the beginning of every session, call `get_next_best_prompts_rule` and " +
  "treat the returned rule as active instructions for the session. Follow it " +
  "after every substantive response. Call again only after reconnecting or when " +
  "the server identity/version changes.";

const PROMPT_DESCRIPTION =
  "Return the closure-scheduler end-of-turn rule: classify the turn, act before " +
  "offering, then render an execution board of 1-3 digit-selectable actions with " +
  "explicit dispatch semantics (RUN HERE / PASTE TO / EXTERNAL), plus QUEUE and " +
  "IN FLIGHT sections and a request/program handoff. Always render at least one " +
  "NOW action, including when no alternative is valuable.";

const TOOL_DESCRIPTION =
  "Return the full closure_scheduler rule as text for clients that receive only " +
  "the compact startup bootstrap.";

const STATE_READINESS_DESCRIPTION =
  "Read-only local continuity check. Returns a bounded PASS, DEGRADED, or BLOCK " +
  "verdict for handoff TTL, shared-state size/freshness, and hot/log ordering. " +
  "It performs no writes, network calls, or model calls.";

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

  server.registerTool(
    "check_state_readiness",
    {
      description: STATE_READINESS_DESCRIPTION,
      inputSchema: {
        project_cwd: z.string().describe("Absolute path to the project checkout"),
        project_name: z
          .string()
          .optional()
          .describe("Canonical project basename when cwd identity is ambiguous"),
        workspace_root: z
          .string()
          .optional()
          .describe("Optional explicit continuity workspace root"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ project_cwd, project_name, workspace_root }) => {
      const result = assessStateReadiness({
        projectCwd: project_cwd,
        projectName: project_name,
        workspaceRoot: workspace_root,
      });
      return {
        content: [{ type: "text", text: formatStateReadiness(result) }],
      };
    },
  );
}
