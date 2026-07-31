// Guard test: the closure_scheduler wrapper must refuse to start on a stale
// build rather than silently serve the previous rule version.
//
// Why this exists: dist/ is gitignored, so a merge advances rule/ and src/ while
// dist/ keeps serving whatever was last built. On 2026-07-30 the 0.5.6 merge left
// the 0.5.5 build in place and cold connects served 0.5.5 for over an hour with
// no signal at all. CI already makes rule-drift impossible to MERGE (check-sync);
// this makes a stale rule impossible to SERVE.
//
// A guard nobody tests is a guard that can stop guarding silently — the same
// failure class one level up — so the wrapper's four branches are exercised here.
//
// Fixtures are throwaway trees under os.tmpdir(); the repo's real dist/ is never
// touched. The last case runs the REAL wrapper, so `npm test` also fails if this
// checkout's own build has drifted from rule/closure-scheduler.md.
//
// Run with: npm run test:wrapper-guard
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const realWrapper = join(root, "bin", "closure-scheduler-mcp-wrapper.sh");
const workdir = mkdtempSync(join(tmpdir(), "wrapper-guard-"));
const STUB_MARKER = "STUB-SERVER-STARTED";

// Build a minimal repo-shaped tree: the real wrapper, a rule file at one version,
// and a "built" module at another. The stub entrypoint prints a marker so a run
// that reaches exec is distinguishable from one the guard stopped.
function fixture(name, { ruleVersion, builtVersion, rule = true, dist = true }) {
  const dir = join(workdir, name);
  mkdirSync(join(dir, "bin"), { recursive: true });
  cpSync(realWrapper, join(dir, "bin", "closure-scheduler-mcp-wrapper.sh"));
  if (rule) {
    mkdirSync(join(dir, "rule"), { recursive: true });
    writeFileSync(
      join(dir, "rule", "closure-scheduler.md"),
      `# next_best_prompt ${ruleVersion} — closure scheduler\n`,
      "utf8",
    );
  }
  if (dist) {
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(
      join(dir, "dist", "closure-scheduler.generated.js"),
      `export const RULE = ${JSON.stringify(`# next_best_prompt ${builtVersion} — closure scheduler`)};\n`,
      "utf8",
    );
    writeFileSync(
      join(dir, "dist", "closure-scheduler-index.js"),
      `process.stdout.write("${STUB_MARKER}\\n");\n`,
      "utf8",
    );
  }
  return join(dir, "bin", "closure-scheduler-mcp-wrapper.sh");
}

// Empty stdin so the real MCP server sees EOF and exits instead of hanging.
function run(script) {
  const result = spawnSync("bash", [script], { encoding: "utf8", input: "" });
  return { status: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const stale = run(fixture("stale", { ruleVersion: "v9.9.9", builtVersion: "v0.5.6" }));
const fresh = run(fixture("fresh", { ruleVersion: "v0.5.6", builtVersion: "v0.5.6" }));
const noBuild = run(
  fixture("no-build", { ruleVersion: "v0.5.6", builtVersion: "v0.5.6", dist: false }),
);
const noRule = run(
  fixture("no-rule", { ruleVersion: "v0.5.6", builtVersion: "v0.5.6", rule: false }),
);
const real = run(realWrapper);

rmSync(workdir, { recursive: true, force: true });

const checks = {
  "stale build is refused": stale.status === 1,
  "stale build never reaches the server": !stale.out.includes(STUB_MARKER),
  "stale failure names both versions and the fix":
    stale.out.includes("v9.9.9") &&
    stale.out.includes("v0.5.6") &&
    stale.out.includes("run build"),
  "matching build starts the server":
    fresh.status === 0 && fresh.out.includes(STUB_MARKER),
  "missing build is refused":
    noBuild.status === 1 && noBuild.out.includes("no build"),
  // An unreadable rule file is not evidence of staleness. Blocking here would
  // break any install that ships dist/ without rule/.
  "unverifiable rule does not block":
    noRule.status === 0 && noRule.out.includes(STUB_MARKER),
  "this checkout's own build is fresh":
    real.status === 0 && !real.out.includes("fatal"),
};

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`);
  if (!pass) ok = false;
}
if (!ok) {
  console.log("stale run:", JSON.stringify(stale));
  console.log("real run:", JSON.stringify(real));
}
console.log(ok ? "WRAPPER GUARD OK" : "WRAPPER GUARD FAILED");
process.exit(ok ? 0 : 1);
