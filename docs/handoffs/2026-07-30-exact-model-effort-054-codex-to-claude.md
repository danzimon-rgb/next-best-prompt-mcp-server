# Exact model and effort recommendations — Codex to Claude Code

Updated: 2026-07-30 15:09 EDT
Builder: Codex
Lane: isolated follow-up; PR #7 review worktree remains frozen

## Scope

Dan requires closure_scheduler 0.5.4 to recommend the exact model and effort
level for every cross-agent `PASTE TO` action. Merely displaying generic
`model` / `effort` fields is insufficient.

This increment is built from frozen PR #7 head
`59ef3c23fa43895459c375b3f219c0bf1d4d1b20` on isolated branch
`fix/exact-model-effort-054`. It does not modify the worktree Claude is
currently reviewing.

## Behavior

- The rule requires one exact available model and one exact effort level,
  selected for the task and its risk.
- Agent and window remain mandatory.
- Model and effort placeholders are forbidden.
- The validator requires exactly four `·`-delimited routing fields:
  `agent · window · model · effort`.
- `current`, `default`, `same`, `auto`, `automatic`, `unspecified`, `tbd`,
  `n/a`, and `none` are rejected in the model or effort fields.
- New finding: `E08_PASTE_TO_MODEL_EFFORT`.

## Evidence

```text
npm test
  incumbent smoke: 15/15
  closure_scheduler 0.5.4 smoke: 17/17
  rendered-output validator: 27/27
  state-readiness checks: 26/26
  wrapper checks: 2/2

npm run typecheck
  pass

bash -n bin/closure-scheduler-mcp-wrapper.sh
  pass

git diff --check
  pass

npm pack --dry-run
  pass

served rule: 15,640 bytes
fixed ceiling: 15,655 bytes
```

The two new negative fixtures reject a missing model/effort route and generic
`current` / `default` placeholders. The existing fully specified Claude Code
route remains a positive fixture.

## Integration gate

Do not modify or advance PR #7 while Claude's final review of `59ef3c2` is in
flight. After that verdict, add this one isolated commit to the PR branch and
run a focused read-only review of only the new increment.

No merge, MCP load/restart, npm publication, hosted adoption, release, or
production deployment is authorized.
