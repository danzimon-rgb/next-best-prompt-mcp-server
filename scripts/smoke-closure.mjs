// Smoke test: connect to the built closure_scheduler stdio server and assert it
// exposes its prompt, the shared tool name, and the v0.5 rule via instructions.
//
// Deliberately a SEPARATE harness from smoke.mjs. The two servers must be
// provably independent — one failing must not be able to mask or be masked by
// the other — and the incumbent's assertions must keep passing untouched while
// this candidate is evaluated.
//
// Run with: npm run smoke:closure (after npm run build).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const transport = new StdioClientTransport({
  command: "node",
  args: [join(root, "dist", "closure-scheduler-index.js")],
});
const client = new Client(
  { name: "closure_scheduler-smoke", version: "0" },
  { capabilities: {} },
);
await client.connect(transport);

const serverInfo = client.getServerVersion?.() ?? {};
const tools = (await client.listTools()).tools.map((t) => t.name);
const prompts = (await client.listPrompts()).prompts.map((p) => p.name);

let instructions = "";
try {
  instructions = client.getInstructions?.() ?? "";
} catch {
  instructions = "";
}

const call = await client.callTool({
  name: "get_next_best_prompts_rule",
  arguments: {},
});
const toolText = call.content?.[0]?.text ?? "";

await client.close();

const checks = {
  "server identifies as closure_scheduler": serverInfo?.name === "closure_scheduler",
  "prompt 'closure_scheduler' present": prompts.includes("closure_scheduler"),
  // Same tool name as the incumbent on purpose: CLAUDE.md calls it by name, so
  // switching servers must not break that instruction.
  "tool name matches the incumbent": tools.includes("get_next_best_prompts_rule"),
  "instructions carry the v0.5 rule": instructions.includes("closure scheduler"),
  "instructions define the EXTERNAL digit outcome":
    instructions.includes("The exact procedure to do it yourself") &&
    instructions.includes("never means \"nothing happens"),
  "instructions guarantee digit selection":
    instructions.includes("One digit in, one useful outcome out"),
  "instructions carry the execution board":
    instructions.includes("IN FLIGHT") &&
    instructions.includes("RUN HERE") &&
    instructions.includes("PASTE TO"),
  "instructions preserve the non-obvious-move obligation":
    instructions.includes("timidity is not the method") &&
    instructions.includes("Never substitute paperwork for analysis"),
  "instructions keep domain compliance OUT":
    instructions.includes("governs the menu, not the product") &&
    !instructions.includes("suggested_move_scope"),
  "tool returns the same rule as instructions": toolText === instructions,
  "matrix carries all 28 scenarios":
    instructions.includes("| E28 |") && instructions.includes("| E01 |"),
};

console.log("server:", serverInfo?.name, serverInfo?.version);
console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? "CLOSURE SMOKE OK" : "CLOSURE SMOKE FAILED");
process.exit(ok ? 0 : 1);
