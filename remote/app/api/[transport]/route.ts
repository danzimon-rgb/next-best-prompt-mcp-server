import { createMcpHandler } from "mcp-handler";
import {
  CLOSURE_SCHEDULER_BOOTSTRAP,
  registerClosureScheduler,
} from "../../../lib/closure-scheduler.generated";

// Node runtime; closure_scheduler just returns text, so the default ceiling is plenty.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Remote closure_scheduler MCP server over Streamable HTTP (endpoint: /api/mcp).
 *
 * The rule + the prompt/tool registration come from the shared generated
 * module (single source of truth: rule/closure-scheduler.md + shared/closure-scheduler.template.ts),
 * byte-identical with the stdio server in src/closure-scheduler-index.ts.
 * Stateless: no Redis, no secrets, no external calls.
 *
 * This surface served the v0.3 next_best_prompt incumbent until 2026-07-30.
 * Holding it there while Claude Code ran closure_scheduler on stdio meant
 * claude.ai web + mobile followed a different rule than the terminal — the
 * split the rule itself forbids, spread across surfaces instead of within one
 * session. Both transports now serve v0.5.7.
 *
 * `instructions` is the ~260-byte bootstrap rather than the full rule, matching
 * stdio: clients that inject instructions get one required
 * `get_next_best_prompts_rule` call, and the rule text is paid for once instead
 * of in both places. The tool name is unchanged from the incumbent, so an
 * already-added connector keeps working without reconfiguration.
 */
const handler = createMcpHandler(
  (server) => {
    registerClosureScheduler(server);
  },
  {
    instructions: CLOSURE_SCHEDULER_BOOTSTRAP,
    serverInfo: { name: "closure_scheduler", version: "0.5.7" },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
