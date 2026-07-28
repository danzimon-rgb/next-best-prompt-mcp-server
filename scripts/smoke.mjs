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
  "instructions carry execution handoff":
    instructions.includes("Execution handoff") &&
    instructions.includes("Left off") &&
    instructions.includes("HUMAN NEEDED"),
  "instructions carry handoff self-consistency guards":
    instructions.includes("underlying work") &&
    instructions.includes("Human: None") &&
    instructions.includes("Contradictory combinations are invalid output"),
  "tool returns the rule text": toolText.includes("Next-best-prompts"),
  "tool returns execution handoff":
    toolText.includes("Execution handoff") &&
    toolText.includes("Human") &&
    toolText.includes("None — request complete"),
  "tool returns handoff self-consistency guards":
    toolText.includes("underlying work") &&
    toolText.includes("Human: None") &&
    toolText.includes("Contradictory combinations are invalid output"),
  "instructions carry sequencing markers":
    instructions.includes("Sequencing (required on every option)") &&
    instructions.includes("AFTER n") &&
    instructions.includes("BLOCKED:") &&
    instructions.includes("same agent session"),
  "tool returns sequencing markers":
    toolText.includes("Sequencing (required on every option)") &&
    toolText.includes("AFTER n") &&
    toolText.includes("BLOCKED:") &&
    toolText.includes("IN FLIGHT"),
  "instructions carry loop-closure objective":
    instructions.includes("What the menu is optimizing for") &&
    instructions.includes("Terminal beats lateral") &&
    instructions.includes("Do not offer what you should simply do"),
  "tool returns loop-closure objective":
    toolText.includes("What the menu is optimizing for") &&
    toolText.includes("survive losing this conversation") &&
    toolText.includes("Name the verification"),
};

console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
}

const allOk = Object.values(checks).every(Boolean);
console.log(allOk ? "SMOKE OK" : "SMOKE FAILED");
process.exit(allOk ? 0 : 1);
