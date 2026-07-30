// Smoke test: connect to the built closure_scheduler stdio server and assert it
// exposes its prompt, the shared tool name, a compact startup bootstrap, and the
// full v0.5 rule only through the prompt/tool surfaces.
//
// Deliberately a SEPARATE harness from smoke.mjs. The two servers must be
// provably independent — one failing must not be able to mask or be masked by
// the other — and the incumbent's assertions must keep passing untouched while
// this candidate is evaluated.
//
// Run with: npm run smoke:closure (after npm run build).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const ruleBytes = Buffer.byteLength(toolText, "utf8");
const smokeWorkspace = mkdtempSync(join(tmpdir(), "closure-readiness-smoke-"));
const smokeProject = join(smokeWorkspace, "smoke-project");
const smokeWiki = join(smokeWorkspace, "_wikis", "smoke-project", "wiki");
mkdirSync(smokeProject, { recursive: true });
mkdirSync(smokeWiki, { recursive: true });
const smokeNow = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
writeFileSync(
  join(smokeWorkspace, "_handoff.md"),
  `---\nproject: smoke-project\nclosed_at: ${smokeNow}\nttl_hours: 6\n---\n`,
  "utf8",
);
writeFileSync(
  join(smokeWorkspace, "_active_actions.md"),
  `_Last curated: ${smokeNow} by smoke._\n`,
  "utf8",
);
writeFileSync(
  join(smokeWorkspace, "_workspace_state.md"),
  `<!-- BEGIN: smoke-project -->\n_Last self-update: ${smokeNow}_\n<!-- END: smoke-project -->\n`,
  "utf8",
);
writeFileSync(
  join(smokeWiki, "hot.md"),
  `<!-- curated: ${smokeNow} -->\n# hot\n`,
  "utf8",
);
writeFileSync(
  join(smokeWiki, "log.md"),
  `## ${smokeNow} — smoke\n`,
  "utf8",
);
const readinessCall = await client.callTool({
  name: "check_state_readiness",
  arguments: {
    project_cwd: smokeProject,
    workspace_root: smokeWorkspace,
  },
});
const readinessText = readinessCall.content?.[0]?.text ?? "";

await client.close();
rmSync(smokeWorkspace, { recursive: true, force: true });

const checks = {
  "server identifies as closure_scheduler": serverInfo?.name === "closure_scheduler",
  "server identifies as version 0.5.4": serverInfo?.version === "0.5.4",
  "prompt 'closure_scheduler' present": prompts.includes("closure_scheduler"),
  // Same tool name as the incumbent on purpose: CLAUDE.md calls it by name, so
  // switching servers must not break that instruction.
  "tool name matches the incumbent": tools.includes("get_next_best_prompts_rule"),
  "state readiness tool is present": tools.includes("check_state_readiness"),
  "state readiness tool returns a bounded PASS":
    readinessText.startsWith("STATE READINESS PASS") &&
    Buffer.byteLength(readinessText, "utf8") <= 1000,
  "instructions are a compact tool-call bootstrap":
    instructions.length < 500 &&
    instructions.includes("get_next_best_prompts_rule") &&
    !instructions.includes("Adversarial evaluation matrix"),
  "tool defines the EXTERNAL digit outcome":
    toolText.includes("The exact procedure to do it yourself") &&
    toolText.includes("never means \"nothing happens"),
  "tool guarantees digit selection":
    toolText.includes("One digit in, one useful outcome out"),
  "tool always requires a next suggested prompt":
    toolText.includes("Always include the next suggested prompt") &&
    toolText.includes("never omit the board"),
  "tool carries the execution board":
    toolText.includes("IN FLIGHT") &&
    toolText.includes("RUN HERE") &&
    toolText.includes("PASTE TO") &&
    toolText.includes("one exact available model and effort level"),
  "tool carries the completion-delivery contract":
    toolText.includes("Completion notice:") &&
    toolText.includes("Never promise proactive notice unless a live monitor remains active") &&
    toolText.includes("`AFTER` next action"),
  "tool preserves the non-obvious-move obligation":
    toolText.includes("timidity is not the method") &&
    toolText.includes("Never substitute paperwork for analysis"),
  "tool keeps domain compliance OUT":
    toolText.includes("governs the menu, not the product") &&
    !toolText.includes("suggested_move_scope"),
  "tool carries no-courier and handoff consistency fixes":
    toolText.includes("never make the operator relay agent state") &&
    toolText.includes("cannot coexist with `Next owner: None`"),
  "tool carries executable state readiness semantics":
    toolText.includes("call `check_state_readiness`") &&
    toolText.includes("`BLOCK` requires a board") &&
    toolText.includes("| S02 |"),
  "tool stays within the v0.5 no-growth ceiling": ruleBytes <= 15_655,
  "matrix carries all 28 scenarios":
    toolText.includes("| E28 |") && toolText.includes("| E01 |"),
};

console.log("server:", serverInfo?.name, serverInfo?.version);
console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
console.log("instructions bytes:", Buffer.byteLength(instructions, "utf8"));
console.log("tool rule bytes:", ruleBytes);
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? "CLOSURE SMOKE OK" : "CLOSURE SMOKE FAILED");
process.exit(ok ? 0 : 1);
