// Drift-check: regenerate the shared module in memory and assert the committed
// copies match. Fails (exit 1) if rule/compass.md or the template changed
// without re-running `npm run embed`. Wired into `prepublishOnly`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const rule = readFileSync(join(root, "rule", "compass.md"), "utf8");
const template = readFileSync(join(root, "shared", "compass.template.ts"), "utf8");
const expected = template.replaceAll("__COMPASS_RULE_JSON__", JSON.stringify(rule));

const targets = [
  join(root, "src", "compass.generated.ts"),
  join(root, "remote", "lib", "compass.generated.ts"),
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
