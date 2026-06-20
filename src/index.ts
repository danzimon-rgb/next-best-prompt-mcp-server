#!/usr/bin/env node
/**
 * next-best-prompt-mcp (stdio) — surfaces the "next-best-prompts" end-of-turn rule.
 *
 * The rule + the prompt/tool registration are generated from the single source
 * of truth (rule/next-best-prompt.md + shared/next-best-prompt.template.ts) into
 * ./next-best-prompt.generated.ts, shared byte-identically with the hosted HTTP server
 * in remote/. This entrypoint just wraps it in a stdio transport for local
 * clients (Claude Code, Claude Desktop local install).
 *
 * Pure guidance: no secrets, no network, no side-effecting tools.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NEXT_BEST_PROMPT_RULE, registerNextBestPrompt } from "./next-best-prompt.generated.js";

async function main(): Promise<void> {
  const server = new McpServer(
    { name: "next_best_prompt", version: "0.2.0" },
    { instructions: NEXT_BEST_PROMPT_RULE },
  );

  registerNextBestPrompt(server);

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(
    `[next-best-prompt-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
