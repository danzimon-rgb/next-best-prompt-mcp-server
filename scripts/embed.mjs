// Codegen: embed each rule into its template and write the generated module(s)
// into every transport that serves it. Run via `npm run embed` (and automatically
// on `prebuild`). Keeps the committed copies free of any runtime filesystem
// dependency.
//
// Two bundles:
//   next_best_prompt   — the incumbent. Served by BOTH the stdio entrypoint and
//                        the hosted HTTP server in remote/, byte-identically.
//   closure_scheduler  — the v0.5 A/B candidate. stdio only; the hosted server
//                        deliberately keeps serving the incumbent so the remote
//                        surface never changes behaviour underneath anyone.
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
    targets: [
      join(root, "src", "next-best-prompt.generated.ts"),
      join(root, "remote", "lib", "next-best-prompt.generated.ts"),
    ],
  },
  {
    name: "closure_scheduler",
    rule: join(root, "rule", "closure-scheduler.md"),
    template: join(root, "shared", "closure-scheduler.template.ts"),
    token: "__CLOSURE_SCHEDULER_RULE_JSON__",
    targets: [join(root, "src", "closure-scheduler.generated.ts")],
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
