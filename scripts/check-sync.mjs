// Drift-check: regenerate the shared module in memory and assert the committed
// copies match. Fails (exit 1) if rule/next-best-prompt.md or the template changed
// without re-running `npm run embed`. Wired into `prepublishOnly`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const rule = readFileSync(join(root, "rule", "next-best-prompt.md"), "utf8");
const template = readFileSync(join(root, "shared", "next-best-prompt.template.ts"), "utf8");
const expected = template.replaceAll("__NEXT_BEST_PROMPT_RULE_JSON__", JSON.stringify(rule));

const targets = [
  join(root, "src", "next-best-prompt.generated.ts"),
  join(root, "remote", "lib", "next-best-prompt.generated.ts"),
];

let ok = true;
for (const target of targets) {
  let actual = null;
  try {
    actual = readFileSync(target, "utf8");
  } catch {
    actual = null;
  }
  if (actual !== expected) {
    console.error(`check-sync: DRIFT — ${target} is missing or stale. Run \`npm run embed\`.`);
    ok = false;
  } else {
    console.log("check-sync: in sync —", target);
  }
}

process.exit(ok ? 0 : 1);
