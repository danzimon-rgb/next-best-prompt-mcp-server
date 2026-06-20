import { createMcpHandler } from "mcp-handler";
import { NEXT_BEST_PROMPT_RULE, registerNextBestPrompt } from "../../../lib/next-best-prompt.generated";

// Node runtime; next_best_prompt just returns text, so the default ceiling is plenty.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Remote next_best_prompt MCP server over Streamable HTTP (endpoint: /api/mcp).
 *
 * The rule + the prompt/tool registration come from the shared generated
 * module (single source of truth: rule/next-best-prompt.md + shared/next-best-prompt.template.ts),
 * byte-identical with the stdio server in src/. Stateless: no Redis, no
 * secrets, no external calls.
 */
const handler = createMcpHandler(
  (server) => {
    registerNextBestPrompt(server);
  },
  {
    instructions: NEXT_BEST_PROMPT_RULE,
    serverInfo: { name: "next_best_prompt", version: "0.2.0" },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
