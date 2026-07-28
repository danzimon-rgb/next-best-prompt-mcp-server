// Smoke test: connect to the built stdio server over line-delimited JSON-RPC and
// assert it exposes the prompt, tool, instructions, and chat-ownership labels.
// Run with: npm run smoke (after npm run build).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messages = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "next_best_prompt-smoke", version: "0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  { jsonrpc: "2.0", id: 3, method: "prompts/list", params: {} },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "get_next_best_prompts_rule", arguments: {} },
  },
];
const run = spawnSync(process.execPath, [join(root, "dist", "index.js")], {
  input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
if (run.error) throw run.error;
if (run.status !== 0) {
  throw new Error(`server exited ${run.status}: ${run.stderr.trim() || "no stderr"}`);
}

const responses = new Map(
  run.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((message) => "id" in message)
    .map((message) => [message.id, message]),
);
for (const id of [1, 2, 3, 4]) {
  if (!responses.has(id)) throw new Error(`missing JSON-RPC response ${id}`);
  if (responses.get(id).error) throw new Error(JSON.stringify(responses.get(id).error));
}

const initialized = responses.get(1).result;
const toolsResult = responses.get(2).result;
const promptsResult = responses.get(3).result;
const call = responses.get(4).result;
const tools = toolsResult.tools.map((tool) => tool.name);
const prompts = promptsResult.prompts.map((prompt) => prompt.name);
const instructions = initialized.instructions ?? "";
const toolText = call.content?.[0]?.text ?? "";

const checks = {
  "prompt 'next_best_prompt' present": prompts.includes("next_best_prompt"),
  "tool 'get_next_best_prompts_rule' present": tools.includes("get_next_best_prompts_rule"),
  "instructions carry the rule": instructions.includes("next-best-prompts"),
  "instructions carry chat labels": instructions.includes("Chat label") && instructions.includes("response needed"),
  "tool returns the rule text": toolText.includes("Next-best-prompts"),
  "tool returns chat labels": toolText.includes("Chat label") && toolText.includes("response needed"),
};

console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
}

const allOk = Object.values(checks).every(Boolean);
console.log(allOk ? "SMOKE OK" : "SMOKE FAILED");
process.exit(allOk ? 0 : 1);
