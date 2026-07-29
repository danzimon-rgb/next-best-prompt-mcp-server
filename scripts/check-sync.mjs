// Drift-check: regenerate every bundle in memory and assert the committed copies
// match. Fails (exit 1) if any rule or template changed without re-running
// `npm run embed`. Wired into `prepublishOnly`.
//
// Imports the bundle list from embed.mjs so a new server can never be added to
// the build and silently skipped here.
import { readFileSync } from "node:fs";
import { BUNDLES, render } from "./embed.mjs";

let ok = true;

for (const bundle of BUNDLES) {
  let expected;
  try {
    expected = render(bundle);
  } catch (err) {
    console.error(
      `check-sync: ${err instanceof Error ? err.message : String(err)}`,
    );
    ok = false;
    continue;
  }
  for (const target of bundle.targets) {
    let actual = null;
    try {
      actual = readFileSync(target, "utf8");
    } catch {
      actual = null;
    }
    if (actual !== expected) {
      console.error(
        `check-sync: DRIFT — ${target} is missing or stale. Run \`npm run embed\`.`,
      );
      ok = false;
    } else {
      console.log(`check-sync: in sync (${bundle.name}) —`, target);
    }
  }
}

process.exit(ok ? 0 : 1);
