import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateClosureOutput } from "./validate-closure-output.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "test", "fixtures", "closure-validator.json");
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));

let ok = true;
for (const fixture of fixtures) {
  const actualCodes = validateClosureOutput(
    fixture.output,
    fixture.context,
  ).map((finding) => finding.code);
  const expectedCodes = fixture.expectedCodes;
  const pass =
    JSON.stringify(actualCodes.sort()) === JSON.stringify(expectedCodes.sort());
  console.log(`${pass ? "PASS" : "FAIL"} — ${fixture.name}`);
  if (!pass) {
    console.log(`  expected: ${expectedCodes.join(", ") || "(none)"}`);
    console.log(`  actual:   ${actualCodes.join(", ") || "(none)"}`);
    ok = false;
  }
}

console.log(ok ? "CLOSURE VALIDATOR FIXTURES OK" : "CLOSURE VALIDATOR FIXTURES FAILED");
process.exit(ok ? 0 : 1);
