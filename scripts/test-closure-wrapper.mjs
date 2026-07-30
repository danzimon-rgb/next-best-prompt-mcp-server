import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureHome = mkdtempSync(join(tmpdir(), "closure-wrapper-"));
let ok = true;

try {
  const aliasPath = join(fixtureHome, ".nvm", "alias", "default");
  mkdirSync(dirname(aliasPath), { recursive: true });
  writeFileSync(aliasPath, "24", "utf8");

  for (const version of ["24.9.0", "24.11.0"]) {
    const nodePath = join(
      fixtureHome,
      ".nvm",
      "versions",
      "node",
      `v${version}`,
      "bin",
      "node",
    );
    mkdirSync(dirname(nodePath), { recursive: true });
    writeFileSync(nodePath, "#!/usr/bin/env bash\nprintf '%s\\n' \"$0\"\n", "utf8");
    chmodSync(nodePath, 0o755);
  }

  const run = spawnSync(
    "bash",
    [join(root, "bin", "closure-scheduler-mcp-wrapper.sh")],
    {
      encoding: "utf8",
      env: { ...process.env, CLOSURE_WRAPPER_HOME: fixtureHome },
    },
  );
  const selected = run.stdout.trim();
  const pass =
    run.status === 0 &&
    selected.endsWith("/.nvm/versions/node/v24.11.0/bin/node");
  console.log(
    `${pass ? "PASS" : "FAIL"} — wrapper handles newline-less aliases and version-sorts Node`,
  );
  if (!pass) {
    console.log(`  exit: ${run.status}`);
    console.log(`  stdout: ${selected}`);
    console.log(`  stderr: ${run.stderr.trim()}`);
    ok = false;
  }

  const emptyHome = join(fixtureHome, "empty");
  mkdirSync(emptyHome, { recursive: true });
  const noNode = spawnSync(
    "/bin/bash",
    [join(root, "bin", "closure-scheduler-mcp-wrapper.sh")],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        CLOSURE_WRAPPER_HOME: emptyHome,
        PATH: "",
      },
    },
  );
  const noNodePass =
    noNode.status === 127 &&
    noNode.stderr.includes("closure-scheduler-mcp: node not found");
  console.log(
    `${noNodePass ? "PASS" : "FAIL"} — wrapper reports node-not-found explicitly`,
  );
  if (!noNodePass) ok = false;
} finally {
  rmSync(fixtureHome, { recursive: true, force: true });
}

console.log(ok ? "CLOSURE WRAPPER FIXTURES OK" : "CLOSURE WRAPPER FIXTURES FAILED");
process.exit(ok ? 0 : 1);
