#!/usr/bin/env node
/**
 * compass-mcp (stdio) — surfaces the "next-best-prompts" end-of-turn rule.
 *
 * The rule + the prompt/tool registration are generated from the single source
 * of truth (rule/compass.md + shared/compass.template.ts) into
 * ./compass.generated.ts, shared byte-identically with the hosted HTTP server
 * in remote/. This entrypoint just wraps it in a stdio transport for local
 * clients (Claude Code, Claude Desktop local install).
 *
 * Pure guidance: no secrets, no network, no side-effecting tools.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { COMPASS_RULE, registerCompass } from "./compass.generated.js";

async function main(): Promise<void> {
  const server = new McpServer(
    { name: "compass", version: "0.2.0" },
    { instructions: COMPASS_RULE },
  );

  registerCompass(server);

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(
    `[compass-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
