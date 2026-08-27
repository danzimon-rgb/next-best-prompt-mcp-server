// Codegen: embed each rule into its template and write the generated module(s)
// into every transport that serves it. Run via `npm run embed` (and automatically
// on `prebuild`). Keeps the committed copies free of any runtime filesystem
// dependency.
//
// Two bundles:
//   next_best_prompt   — the v0.3 incumbent. stdio only, published to npm as
//                        @danzimon/next-best-prompt-mcp. No hosted target.
//   closure_scheduler  — v0.5.7. Served by BOTH the stdio entrypoint and the
//                        hosted HTTP server in remote/, byte-identically.
//
// This reverses PR #6, which held the hosted target on the incumbent so the
// remote surface would never change behaviour underneath anyone. That guarantee
// was written while closure_scheduler was an untested draft. It has run on stdio
// since 2026-07-28 and has been canonical since 5a5ba9d, and holding the hosted
// surface back was itself the hazard: claude.ai web/mobile ran the incumbent
// while Claude Code ran the scheduler, which is the split-brain the rule's own
// "enable exactly ONE" note forbids — split across surfaces instead of within a
// session. Both transports now serve one rule.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const BUNDLES = [
  {
    name: "next_best_prompt",
    rule: join(root, "rule", "next-best-prompt.md"),
    template: join(root, "shared", "next-best-prompt.template.ts"),
    token: "__NEXT_BEST_PROMPT_RULE_JSON__",
    targets: [join(root, "src", "next-best-prompt.generated.ts")],
  },
  {
    name: "closure_scheduler",
    rule: join(root, "rule", "closure-scheduler.md"),
    template: join(root, "shared", "closure-scheduler.template.ts"),
    token: "__CLOSURE_SCHEDULER_RULE_JSON__",
    targets: [
      join(root, "src", "closure-scheduler.generated.ts"),
      join(root, "remote", "lib", "closure-scheduler.generated.ts"),
    ],
  },
];

export function render(bundle) {
  const rule = readFileSync(bundle.rule, "utf8");
  const template = readFileSync(bundle.template, "utf8");
  if (!template.includes(bundle.token)) {
    throw new Error(
      `embed: ${bundle.name} template is missing the ${bundle.token} token`,
    );
  }
  return template.replaceAll(bundle.token, JSON.stringify(rule));
}

// Only write when invoked directly, so check-sync can import BUNDLES/render
// without producing files as a side effect.
if (process.argv[1] && process.argv[1].endsWith("embed.mjs")) {
  for (const bundle of BUNDLES) {
    const generated = render(bundle);
    for (const target of bundle.targets) {
      writeFileSync(target, generated, "utf8");
      console.log(`embed: wrote (${bundle.name})`, target);
    }
  }
}
