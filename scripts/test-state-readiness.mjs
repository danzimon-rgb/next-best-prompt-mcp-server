import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assessStateReadiness,
  formatStateReadiness,
} from "../dist/state-readiness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(
  readFileSync(join(root, "test", "fixtures", "state-readiness.json"), "utf8"),
);
const fixturesByName = new Map(
  fixtures.map((fixture) => [fixture.name, fixture]),
);

function fixtureFiles(fixture) {
  const inherited = fixture.extends
    ? fixtureFiles(fixturesByName.get(fixture.extends))
    : {};
  return { ...inherited, ...fixture.files };
}

let ok = true;

for (const fixture of fixtures) {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "state-readiness-"));
  try {
    const projectCwd = join(
      workspaceRoot,
      fixture.projectCwdName ?? fixture.project,
    );
    mkdirSync(projectCwd, { recursive: true });
    if (fixture.gitWorktreeProject) {
      writeFileSync(
        join(projectCwd, ".git"),
        `gitdir: ${join(workspaceRoot, fixture.gitWorktreeProject, ".git", "worktrees", "fixture")}\n`,
        "utf8",
      );
    }
    const files = fixtureFiles(fixture);
    for (const [relativePath, rawContents] of Object.entries(files)) {
      if (rawContents === null) continue;
      const path = join(workspaceRoot, relativePath);
      mkdirSync(dirname(path), { recursive: true });
      const targetSize = Number(fixture.targetFileSizes?.[relativePath] ?? 0);
      const targetPadding = targetSize
        ? targetSize - Buffer.byteLength(String(rawContents), "utf8")
        : 0;
      const padding =
        targetPadding || Number(fixture.padFiles?.[relativePath] ?? 0);
      if (padding < 0) {
        throw new Error(`${relativePath} already exceeds target fixture size`);
      }
      const contents = `${rawContents}${"x".repeat(padding)}`;
      writeFileSync(path, contents, "utf8");
    }
    const result = assessStateReadiness({
      projectCwd,
      projectName: fixture.omitProjectName ? undefined : fixture.project,
      workspaceRoot,
      now: new Date(fixture.now),
    });
    const codes = result.findings.map((finding) => finding.code).sort();
    const pass =
      result.readiness === fixture.expectedReadiness &&
      JSON.stringify(codes) === JSON.stringify([...fixture.expectedCodes].sort()) &&
      Buffer.byteLength(formatStateReadiness(result), "utf8") <= 1000;
    const cliArgs = [
      join(root, "dist", "state-readiness-cli.js"),
      "--project-cwd",
      projectCwd,
      "--workspace-root",
      workspaceRoot,
      "--now",
      fixture.now,
    ];
    if (!fixture.omitProjectName) {
      cliArgs.push("--project-name", fixture.project);
    }
    const cli = spawnSync(process.execPath, cliArgs, { encoding: "utf8" });
    const expectedExit =
      fixture.expectedReadiness === "PASS"
        ? 0
        : fixture.expectedReadiness === "DEGRADED"
          ? 2
          : 1;
    const cliPass =
      cli.status === expectedExit &&
      cli.stdout.startsWith(`STATE READINESS ${fixture.expectedReadiness}`);
    const completePass = pass && cliPass;
    console.log(`${completePass ? "PASS" : "FAIL"} — ${fixture.name}`);
    if (!completePass) {
      console.log(`  expected: ${fixture.expectedReadiness} ${fixture.expectedCodes.join(", ")}`);
      console.log(`  actual:   ${result.readiness} ${codes.join(", ")}`);
      console.log(`  cli:      exit ${cli.status} ${cli.stdout.trim()}`);
      ok = false;
    }
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

const invalidCli = spawnSync(
  process.execPath,
  [join(root, "dist", "state-readiness-cli.js")],
  { encoding: "utf8" },
);
const invalidPass = invalidCli.status === 64;
console.log(`${invalidPass ? "PASS" : "FAIL"} — rejects invalid CLI invocation`);
if (!invalidPass) ok = false;

const outsideWorkspace = mkdtempSync(join(tmpdir(), "state-readiness-outside-"));
try {
  const missingRoot = assessStateReadiness({ projectCwd: outsideWorkspace });
  const missingRootPass =
    missingRoot.readiness === "DEGRADED" &&
    missingRoot.findings[0]?.code === "WORKSPACE_ROOT_MISSING";
  console.log(
    `${missingRootPass ? "PASS" : "FAIL"} — degrades when no continuity workspace exists`,
  );
  if (!missingRootPass) ok = false;
} finally {
  rmSync(outsideWorkspace, { recursive: true, force: true });
}

const severityOutput = formatStateReadiness({
  readiness: "BLOCK",
  project: "alpha",
  projectCwd: "/workspace/alpha",
  workspaceRoot: "/workspace",
  checkedAt: "2026-07-30T00:00:00Z",
  findings: [
    ...Array.from({ length: 5 }, (_, index) => ({
      code: `DEGRADED_${index}`,
      level: "DEGRADED",
      message: "quarantined",
      path: "/workspace",
    })),
    {
      code: "BLOCK_VISIBLE",
      level: "BLOCK",
      message: "must remain visible",
      path: "/workspace",
    },
  ],
});
const severityPass =
  severityOutput.split("\n")[1]?.includes("BLOCK_VISIBLE") === true &&
  severityOutput.split("\n").length === 7 &&
  severityOutput.includes("1 additional finding(s) withheld") &&
  Buffer.byteLength(severityOutput, "utf8") <= 1000;
console.log(
  `${severityPass ? "PASS" : "FAIL"} — renders BLOCK findings before DEGRADED truncation`,
);
if (!severityPass) ok = false;

console.log(ok ? "STATE READINESS FIXTURES OK" : "STATE READINESS FIXTURES FAILED");
process.exit(ok ? 0 : 1);
