import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessStateReadiness,
  formatStateReadiness,
} from "../dist/state-readiness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(
  readFileSync(join(root, "test", "fixtures", "state-readiness.json"), "utf8"),
);
let ok = true;

for (const fixture of fixtures) {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "state-readiness-"));
  try {
    const projectCwd = join(workspaceRoot, fixture.project);
    mkdirSync(projectCwd, { recursive: true });
    for (const [relativePath, contents] of Object.entries(fixture.files)) {
      const path = join(workspaceRoot, relativePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents, "utf8");
    }
    const result = assessStateReadiness({
      projectCwd,
      workspaceRoot,
      now: new Date(fixture.now),
    });
    const codes = result.findings.map((finding) => finding.code).sort();
    const pass =
      result.readiness === fixture.expectedReadiness &&
      JSON.stringify(codes) === JSON.stringify([...fixture.expectedCodes].sort()) &&
      Buffer.byteLength(formatStateReadiness(result), "utf8") <= 1000;
    console.log(`${pass ? "PASS" : "FAIL"} — ${fixture.name}`);
    if (!pass) {
      console.log(`  expected: ${fixture.expectedReadiness} ${fixture.expectedCodes.join(", ")}`);
      console.log(`  actual:   ${result.readiness} ${codes.join(", ")}`);
      ok = false;
    }
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

console.log(ok ? "STATE READINESS FIXTURES OK" : "STATE READINESS FIXTURES FAILED");
process.exit(ok ? 0 : 1);
