// Codegen: embed rule/next-best-prompt.md into the shared template and write the
// generated module into both transports. Run via `npm run embed` (and
// automatically on `prebuild`). Keeps src/ and remote/lib/ byte-identical and
// free of any runtime filesystem dependency.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const rule = readFileSync(join(root, "rule", "next-best-prompt.md"), "utf8");
const template = readFileSync(join(root, "shared", "next-best-prompt.template.ts"), "utf8");

if (!template.includes("__NEXT_BEST_PROMPT_RULE_JSON__")) {
  console.error("embed: template is missing the __NEXT_BEST_PROMPT_RULE_JSON__ token");
  process.exit(1);
}

const generated = template.replaceAll("__NEXT_BEST_PROMPT_RULE_JSON__", JSON.stringify(rule));

const targets = [
  join(root, "src", "next-best-prompt.generated.ts"),
  join(root, "remote", "lib", "next-best-prompt.generated.ts"),
];

for (const target of targets) {
  writeFileSync(target, generated, "utf8");
  console.log("embed: wrote", target);
}
