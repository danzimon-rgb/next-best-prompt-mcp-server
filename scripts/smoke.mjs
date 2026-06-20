// Smoke test: connect to the built stdio server and assert it exposes the
// next_best_prompt prompt, the get_next_best_prompts_rule tool, and the rule via the
// instructions field. Run with: npm run smoke (after npm run build).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const transport = new StdioClientTransport({
  command: "node",
  args: [join(root, "dist", "index.js")],
});
const client = new Client({ name: "next_best_prompt-smoke", version: "0" }, { capabilities: {} });
await client.connect(transport);

const tools = (await client.listTools()).tools.map((t) => t.name);
const prompts = (await client.listPrompts()).prompts.map((p) => p.name);

let instructions = "";
try {
  instructions = client.getInstructions?.() ?? "";
} catch {
  instructions = "";
}

const call = await client.callTool({ name: "get_next_best_prompts_rule", arguments: {} });
const toolText = call.content?.[0]?.text ?? "";

await client.close();

const checks = {
  "prompt 'next_best_prompt' present": prompts.includes("next_best_prompt"),
  "tool 'get_next_best_prompts_rule' present": tools.includes("get_next_best_prompts_rule"),
  "instructions carry the rule": instructions.includes("next-best-prompts"),
  "tool returns the rule text": toolText.includes("Next-best-prompts"),
};

console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
}

const allOk = Object.values(checks).every(Boolean);
console.log(allOk ? "SMOKE OK" : "SMOKE FAILED");
process.exit(allOk ? 0 : 1);
