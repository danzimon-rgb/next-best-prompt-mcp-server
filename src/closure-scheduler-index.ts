#!/usr/bin/env node
/**
 * closure-scheduler-mcp (stdio) — the v0.5 closure-scheduler rule.
 *
 * Runs ALONGSIDE next_best_prompt in this repo, never instead of it inside the
 * same build. It exists so the execution-board rule can be lived in for a few
 * days and then adopted or discarded without disturbing the incumbent, which
 * keeps serving rule/next-best-prompt.md byte-for-byte unchanged.
 *
 * ⚠ Enable exactly ONE of these two servers in any MCP client at a time. Both
 * activate a complete behavioral rule; loading both puts contradictory guidance
 * in one context and teaches you nothing about either.
 *
 * Read-only: no secrets, network calls, or side-effecting tools.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CLOSURE_SCHEDULER_BOOTSTRAP,
  registerClosureScheduler,
} from "./closure-scheduler.generated.js";

async function main(): Promise<void> {
  const server = new McpServer(
    { name: "closure_scheduler", version: "0.5.3" },
    { instructions: CLOSURE_SCHEDULER_BOOTSTRAP },
  );

  registerClosureScheduler(server);

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(
    `[closure-scheduler-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
