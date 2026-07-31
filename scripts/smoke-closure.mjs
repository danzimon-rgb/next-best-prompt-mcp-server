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
const reviewBreaker =
  "- **Break repeated review loops.** After two independent `BLOCK` verdicts\n" +
  "  cite one subsystem, prefer an action to park or redesign it. Patch again only\n" +
  "  if the action states a new discriminating invariant.";
const sourceLock =
  "If the user names a window, session, repo, or artifact,\n" +
  "read that exact source; never substitute another session or newer transcript.\n" +
  "If unreadable, state the gap and request a checkpoint; never infer.";
const invertedReviewBreaker = reviewBreaker.replace(
  "Patch again only\n  if the action states a new discriminating invariant.",
  "Keep patching; the discriminating-invariant requirement does NOT apply.",
);
const carriesReviewBreaker = (text) => text.includes(reviewBreaker);
const invertedToolText = toolText.replace(reviewBreaker, invertedReviewBreaker);
const matrixIds = [...toolText.matchAll(/^\| (E\d{2}) \|/gm)].map((match) => match[1]);
const expectedMatrixIds = Array.from(
  { length: 33 },
  (_, index) => `E${String(index + 1).padStart(2, "0")}`,
);
const ruleWarningBytes = 17_408;
const ruleHardMaxBytes = 18_432;
const noGrowthBaselineBytes = 17_330;

await client.close();

const checks = {
  "server identifies as closure_scheduler": serverInfo?.name === "closure_scheduler",
  "server identifies as version 0.5.7": serverInfo?.version === "0.5.7",
  "prompt 'closure_scheduler' present": prompts.includes("closure_scheduler"),
  // Same tool name as the incumbent on purpose: CLAUDE.md calls it by name, so
  // switching servers must not break that instruction.
  "tool name matches the incumbent": tools.includes("get_next_best_prompts_rule"),
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
    toolText.includes("PASTE TO"),
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
    toolText.includes("never ask the operator to relay or paste them") &&
    toolText.includes("in-scope agent results yourself") &&
    toolText.includes("cannot coexist with `Next owner: None`"),
  "tool carries the repeated-review circuit breaker":
    carriesReviewBreaker(toolText),
  "circuit-breaker check rejects inverted meaning":
    !carriesReviewBreaker(invertedToolText),
  "tool locks cross-agent evidence to the named source":
    toolText.includes(sourceLock),
  "tool carries terminal closure acknowledgement":
    toolText.includes("**Loop closed — <objective> is complete; no required work remains.**") &&
    toolText.includes("**Proof:** <artifact, approval, gate result, terminal event, or other observable evidence>") &&
    toolText.includes("Loop reopened — <reason>"),
  "tool stays within the 18 KiB hard ceiling": ruleBytes <= ruleHardMaxBytes,
  "tool does not grow past the v0.5.6 baseline":
    ruleBytes <= noGrowthBaselineBytes,
  "matrix carries all 33 scenarios":
    JSON.stringify(matrixIds) === JSON.stringify(expectedMatrixIds),
};

console.log("server:", serverInfo?.name, serverInfo?.version);
console.log("tools:", tools.join(", ") || "(none)");
console.log("prompts:", prompts.join(", ") || "(none)");
console.log("instructions bytes:", Buffer.byteLength(instructions, "utf8"));
console.log("tool rule bytes:", ruleBytes);
if (ruleBytes > ruleWarningBytes) {
  console.log(
    `WARN — tool rule exceeds the ${ruleWarningBytes}-byte review threshold`,
  );
}
let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) ok = false;
}
console.log(ok ? "CLOSURE SMOKE OK" : "CLOSURE SMOKE FAILED");
process.exit(ok ? 0 : 1);
