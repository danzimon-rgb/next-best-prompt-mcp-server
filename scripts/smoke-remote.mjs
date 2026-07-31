// Smoke test: connect to a LIVE hosted endpoint over Streamable HTTP and assert
// it serves closure_scheduler v0.5.6 — the same bytes as rule/closure-scheduler.md
// in this checkout.
//
// This is the only script in the repo that touches the network, so it is
// deliberately NOT part of `npm test`. Run it after a deploy, or against a local
// `next dev`, to prove what a host is actually serving:
//
//   npm run smoke:remote
//   npm run smoke:remote -- http://localhost:3000/api/mcp
//   SMOKE_REMOTE_URL=https://<preview>.vercel.app/api/mcp npm run smoke:remote
//
// Byte-identity is the assertion that matters. serverInfo can be edited in the
// route without the rule changing, and the rule can change without serverInfo
// moving; comparing the served text to the source file catches both.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_URL = "https://next-best-prompt-mcp-remote.vercel.app/api/mcp";
const url = process.argv[2] ?? process.env.SMOKE_REMOTE_URL ?? DEFAULT_URL;

const expectedRule = readFileSync(
  join(root, "rule", "closure-scheduler.md"),
  "utf8",
);
const expectedFirstLine = expectedRule.split("\n", 1)[0];

const transport = new StreamableHTTPClientTransport(new URL(url));
const client = new Client(
  { name: "closure_scheduler-remote-smoke", version: "0" },
  { capabilities: {} },
);

try {
  await client.connect(transport);
} catch (err) {
  console.error(`url: ${url}`);
  console.error(
    `REMOTE SMOKE FAILED — could not connect: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}

// A host serving the wrong rule is exactly the case this script exists to catch,
// and on that host the prompt name and tool name may not resolve at all. Every
// probe degrades to an empty result so the run still ends in a readable verdict
// instead of an unhandled MCP error.
const notes = [];
async function probe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    notes.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    return fallback;
  }
}

const serverInfo = client.getServerVersion?.() ?? {};
const tools = await probe(
  "listTools",
  async () => (await client.listTools()).tools.map((t) => t.name),
  [],
);
const prompts = await probe(
  "listPrompts",
  async () => (await client.listPrompts()).prompts.map((p) => p.name),
  [],
);
const instructions = await probe(
  "instructions",
  async () => client.getInstructions?.() ?? "",
  "",
);
const toolText = await probe(
  "callTool get_next_best_prompts_rule",
  async () => {
    const call = await client.callTool({
      name: "get_next_best_prompts_rule",
      arguments: {},
    });
    return call.content?.[0]?.text ?? "";
  },
  "",
);
const promptText = await probe(
  "getPrompt closure_scheduler",
  async () => {
    const result = await client.getPrompt({
      name: "closure_scheduler",
      arguments: {},
    });
    return result.messages?.[0]?.content?.text ?? "";
  },
  "",
);

await client.close();

const checks = {
  "server identifies as closure_scheduler":
    serverInfo?.name === "closure_scheduler",
  "server identifies as version 0.5.6": serverInfo?.version === "0.5.6",
  "prompt 'closure_scheduler' present": prompts.includes("closure_scheduler"),
  // Unchanged from the incumbent on purpose: CLAUDE.md calls the tool by name,
  // so an already-added connector keeps working across the switch.
  "tool name matches the incumbent": tools.includes(
    "get_next_best_prompts_rule",
  ),
  "instructions are a compact tool-call bootstrap":
    instructions.length > 0 &&
    instructions.length < 500 &&
    instructions.includes("get_next_best_prompts_rule") &&
    !instructions.includes("Adversarial evaluation matrix"),
  "tool returns the v0.5.6 first line":
    toolText.split("\n", 1)[0] === expectedFirstLine,
  "tool returns this checkout's rule, byte for byte": toolText === expectedRule,
  "prompt returns this checkout's rule, byte for byte":
    promptText === expectedRule,
  "no incumbent v0.3 rule text is served":
    !toolText.includes("**Next-best-prompts** (reply with the number)"),
};

console.log("url:", url);
console.log("server:", serverInfo?.name, serverInfo?.version);
console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
console.log("instructions bytes:", Buffer.byteLength(instructions, "utf8"));
console.log(
  "served rule bytes:",
  Buffer.byteLength(toolText, "utf8"),
  "| expected:",
  Buffer.byteLength(expectedRule, "utf8"),
);
console.log("first line:", JSON.stringify(toolText.split("\n", 1)[0]));
for (const note of notes) console.log("probe error —", note);

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? "REMOTE SMOKE OK" : "REMOTE SMOKE FAILED");
process.exit(ok ? 0 : 1);
