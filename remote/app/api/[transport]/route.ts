import { createMcpHandler } from "mcp-handler";
import { COMPASS_RULE, registerCompass } from "../../../lib/compass.generated";

// Node runtime; compass just returns text, so the default ceiling is plenty.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Remote compass MCP server over Streamable HTTP (endpoint: /api/mcp).
 *
 * The rule + the prompt/tool registration come from the shared generated
 * module (single source of truth: rule/compass.md + shared/compass.template.ts),
 * byte-identical with the stdio server in src/. Stateless: no Redis, no
 * secrets, no external calls.
 */
const handler = createMcpHandler(
  (server) => {
    registerCompass(server);
  },
  {
    instructions: COMPASS_RULE,
    serverInfo: { name: "compass", version: "0.2.0" },
  },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
