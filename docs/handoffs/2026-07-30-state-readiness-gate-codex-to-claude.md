# State readiness gate — Codex to Claude Code

Date: 2026-07-30 EDT  
Builder: Codex  
Requested next lane: Claude Code independent review  
Human gate: Dan decides whether anything merges or is loaded

## State

- Repository: `danzimon-rgb/next-best-prompt-mcp-server`
- Draft PR: https://github.com/danzimon-rgb/next-best-prompt-mcp-server/pull/7
- Branch: `feat/state-readiness-gate`
- Base: `main` at `1e2813a78b7b6957de52340ba3927489eab983e4`
- Implementation commits:
  - `3683dd3124807059a70a419cfff853c0f7f74afd` — state-readiness engine, MCP/CLI surfaces, rule and validator enforcement
  - `906a1381606fc315e7e89e7bbe86ecd2899cb214` — canonical project-name override for named worktrees
- The branch is based on the pushed but unmerged
  `fix/closure-validator-no-growth` lineage at `b73f1f7`; PR #7 intentionally
  carries that full eight-commit canary lineage into `main`.
- PR is draft and mergeable. CI restarted after the second commit and was still
  pending when this handoff was written.
- GitHub's normal integration automatically created a Vercel preview. Codex did
  not initiate or authorize a production deployment.

## Why this exists

`closure_scheduler` 0.5.2 could tell an agent to refresh shared state, but could
not prove that the state inputs were structurally safe before recommending work.
That left a load-bearing gap: an expired handoff, oversized or nonchronological
`hot.md`, stale `_active_actions.md`, or stale/missing `_workspace_state.md`
could still steer the action board.

This change makes readiness executable and fail-closed:

- `PASS`: ordinary prioritization is allowed.
- `DEGRADED`: every named source is quarantined; the agent must verify around it
  and record the exclusions in the execution checkpoint.
- `BLOCK`: ordinary `NOW` work is invalid. Only explicit state reconciliation
  is allowed, or the response must emit a state-readiness no-board reason with
  `Program: GATED`. A recheck must pass before ordinary work resumes.

This is deterministic code inside the canary, not a large standalone skill.
That keeps the clean-path prompt cost to one short verdict and avoids loading a
second policy document. The skill-creation guidance was used to keep judgment in
the rule and low-freedom validation in code.

## Surfaces and behavior

- `check_state_readiness` MCP tool:
  - local and read-only
  - MCP annotations: read-only, idempotent, non-destructive, closed-world
  - inputs: absolute `project_cwd`, optional `project_name` for named worktrees,
    and optional `workspace_root`
  - output: at most five findings and 1,000 bytes
- `closure-state-readiness` CLI:
  - exit `0` = `PASS`
  - exit `2` = `DEGRADED`
  - exit `1` = `BLOCK`
  - exit `64` = invalid invocation
  - supports `--json`, `--project-name`, `--workspace-root`, and deterministic
    `--now`
- `closure_scheduler` rule:
  - now instructs the agent to run readiness at session/project start and after
    material shared-state writes
  - includes adversarial cases `S01` and `S02`
  - remains below the fixed no-growth ceiling
- rendered-output validator:
  - rejects ordinary actions under `BLOCK`
  - requires `Program: GATED` plus a state-readiness block checkpoint
  - permits explicit reconciliation actions
  - requires all quarantined sources in a `DEGRADED` checkpoint

## Checks performed

Fresh after `906a138`:

```text
npm test
  check-sync: all generated copies in sync
  incumbent smoke: 15/15 pass
  closure_scheduler 0.5.3 smoke: all pass, including a real MCP readiness call
  closure output fixtures: 20/20 pass
  state readiness fixtures: 4/4 pass

npm run typecheck
  pass

git diff --check
  pass
```

Payload and performance:

```text
closure rule: 15,432 bytes
previous 0.5.2 rule: 15,539 bytes
fixed ceiling: 15,655 bytes

200 in-process Teranode checks:
median 0.922 ms
p95 1.709 ms
max 3.079 ms
blocked output 529 bytes
```

Live workspace results at `2026-07-30T14:38:00Z`:

```text
next-best-prompt-mcp-server: DEGRADED
- HANDOFF_EXPIRED
- ACTIVE_ACTIONS_STALE
- WORKSPACE_PROJECT_MISSING

teranode-ai: BLOCK
- HANDOFF_EXPIRED
- HOT_OVERSIZE (41,300 bytes > 24,576)
- HOT_NON_MONOTONIC
- ACTIVE_ACTIONS_STALE
- WORKSPACE_PROJECT_STALE
```

The Teranode result reproduces the motivating failure: an 08:55 EDT item is
followed by a 12:50 EDT item and then later 13:35/21:xx items, so the supposedly
newest-first shared buffer is unsafe as a prioritization authority.

## Files that deserve the closest review

- `src/state-readiness.ts`
- `src/state-readiness-cli.ts`
- `shared/closure-scheduler.template.ts`
- `rule/closure-scheduler.md`
- `scripts/validate-closure-output.mjs`
- `scripts/test-state-readiness.mjs`
- `test/fixtures/state-readiness.json`
- `test/fixtures/closure-validator.json`

Generated `src/closure-scheduler.generated.ts` should match the template/rule
and should not be reviewed as an independent source of truth.

## Requested Claude Code review

Please review PR #7 read-only and return `APPROVE` or `BLOCK` with exact
file/line evidence. Re-run:

```bash
npm ci
npm test
npm run typecheck
node dist/state-readiness-cli.js \
  --project-cwd /home/dan/.openclaw/workspace/teranode-ai \
  --workspace-root /home/dan/.openclaw/workspace
```

Concentrate on:

1. false `PASS` and false `BLOCK` risks in TTL, timezone, date-only curation,
   log freshness, and newest-first detection;
2. whether named worktrees route to the canonical wiki safely through
   `project_name`;
3. whether `BLOCK` can leak an ordinary action through the rendered validator;
4. whether bounded formatting can exceed 1,000 bytes or hide the severity;
5. whether the new tool changes the incumbent or hosted endpoint;
6. whether the eight-commit PR lineage is acceptable as one review unit.

Do not edit, merge, release, publish, change client configuration, restart an
MCP server, adopt the hosted surface, or deploy production as part of the
review. If blocked, report the minimum bounded fix; authorship returns to Codex
unless Dan explicitly assigns a different lane.

## Known boundary

This gate proves structural readiness, not semantic truth. It can detect
expired, oversized, missing, stale, future-dated, or nonchronological state; it
cannot prove that two well-formed prose statements do not contradict each
other. That would require structured state markers or a separate semantic
reconciliation design and is intentionally outside this PR.

## Next gate

Claude Code independent verdict, then Dan's merge decision. No merge, release,
npm publication, client load/restart, hosted adoption, or production deployment
has been authorized.
