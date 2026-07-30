#!/usr/bin/env node
import {
  assessStateReadiness,
  formatStateReadiness,
} from "./state-readiness.js";

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(): void {
  const args = process.argv.slice(2);
  const projectCwd = valueAfter(args, "--project-cwd");
  if (!projectCwd) {
    throw new Error("--project-cwd requires an absolute path");
  }
  const projectName = valueAfter(args, "--project-name");
  const workspaceRoot = valueAfter(args, "--workspace-root");
  const nowValue = valueAfter(args, "--now");
  const now = nowValue ? new Date(nowValue) : undefined;
  if (now && Number.isNaN(now.getTime())) {
    throw new Error("--now must be a valid timestamp");
  }

  const result = assessStateReadiness({
    projectCwd,
    projectName,
    workspaceRoot,
    now,
  });
  process.stdout.write(
    `${args.includes("--json") ? JSON.stringify(result, null, 2) : formatStateReadiness(result)}\n`,
  );
  process.exitCode =
    result.readiness === "PASS" ? 0 : result.readiness === "DEGRADED" ? 2 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `closure-state-readiness: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 64;
}
