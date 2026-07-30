# State readiness gate — Codex remediation to Claude Code

Updated: 2026-07-30 14:52 EDT
Builder: Codex
Requested next lane: Claude Code independent re-review
Human gate: Dan decides whether anything merges or is loaded

## Current state

- Repository: `danzimon-rgb/next-best-prompt-mcp-server`
- Draft PR: https://github.com/danzimon-rgb/next-best-prompt-mcp-server/pull/7
- Branch: `feat/state-readiness-gate`
- Base: `main` at `d3dce3d817f997b18b8a1f461e3ca99a1614dab5`
  after PR #8
- Original reviewed head: `e08678af3345ad0dac800ded00e509f3b4b9213f`
- First re-review head before the rebase:
  `723d8ccde7644ca6ff08cc88cc0aa19bf817f3d2`
- Post-rebase remediation commit:
  `3b8c9ef96fbf3df1520de90c2e310f032d842970`
- Canary fingerprint after remediation: `closure_scheduler 0.5.4`
- The branch still contains the previously pushed, unmerged
  `fix/closure-validator-no-growth` lineage at `b73f1f7`.
- No merge, production deploy, release, npm publication, client configuration
  change, MCP restart, or hosted adoption has been authorized.

GitHub's normal repository integration creates a Vercel preview after branch
pushes. That is not a production deployment.

## Review received and disposition

Claude Code posted the independent review here:

https://github.com/danzimon-rgb/next-best-prompt-mcp-server/pull/7#issuecomment-5133504850

Verdict was `BLOCK`: 46 candidate findings, 14 refuted, 32 surviving. Codex
accepts the three blockers and the five majors. The architecture was retained;
the failure was severity calibration and incomplete boundary coverage.

### First-review blocker and major closure map

1. `HOT_MISSING` no longer blocks. Missing and unreadable project heads are
   `DEGRADED`. Wiki lookup now matches the workspace loader: canonical, legacy
   sibling, then common suffix-stripped variants.
2. Project identity no longer defaults blindly to `basename(projectCwd)`.
   Nested cwd values resolve through the enclosing Git root, linked worktrees
   resolve through their `.git` gitdir, and non-Git paths use the first
   workspace segment. `project_name` remains an explicit fallback.
3. Ordinary hot/log lag is `DEGRADED`. Only lag greater than 14 days produces
   `HOT_SEVERELY_BEHIND_LOG` and `BLOCK`.
4. `HOT_NON_MONOTONIC` comparisons reset at every `##` section boundary.
5. Future log headings are reported once as `DEGRADED` and excluded from every
   downstream freshness reference. New York wall time is resolved through
   `America/New_York`; a hand-typed `EST` label in July no longer adds a false
   hour.
6. `HOT_OVERSIZE` and `ACTIVE_ACTIONS_OVERSIZE` are `DEGRADED`, matching
   `HANDOFF_OVERSIZE`.
7. Date-only timestamps are treated as the end of their New York calendar day
   and all 24-hour / 7-day tolerances are applied.
8. Tests now cover both remaining `BLOCK` codes, legacy/missing wikis, linked
   worktrees, nested cwd values, future timestamp poisoning, section
   boundaries, empty-vs-missing files, exact size ceilings, one-byte overflow,
   date-only boundaries, every CLI exit class, severity-first truncation, and
   no-workspace behavior.

### Secondary review findings closed

- BLOCK findings are stably sorted ahead of DEGRADED findings before the
  five-finding output cap.
- Empty files are distinguished from absent/unreadable files.
- A cwd outside the continuity workspace returns a bounded `DEGRADED` verdict
  instead of an MCP error.
- Zone-less timestamps are rejected instead of using host-local time.
- A nonempty log with no supported heading returns
  `LOG_TIMESTAMP_UNPARSEABLE`.
- The numeric-nvm wrapper handles newline-less aliases, selects the highest
  version with `sort -V`, and reports a missing Node executable on stderr with
  exit 127.
- Wrapped closure actions are parsed as one action; E01/E08/S01 can no longer
  miss continuation lines.
- The validator accepts the rule's italic relationship example and requires an
  exact clearing owner under `BLOCK`, rather than a magic checkpoint phrase.
- All four CLI exit classes are exercised.
- The MCP smoke now exercises an exact synthetic `PASS`, not merely any verdict.
- `get_next_best_prompts_rule` has an accurate compact-bootstrap description.
- The removed high-stakes non-obvious-move paragraph was restored within the
  unchanged 15,655-byte ceiling.

## Second re-review and PR #8 reconciliation

Claude Code's second read-only review at pre-rebase head `723d8cc` returned
`BLOCK` with one blocker, one major, and eight advisories:

https://github.com/danzimon-rgb/next-best-prompt-mcp-server/pull/7#issuecomment-5134501355

PR #8 merged during that review and advanced `origin/main` to `d3dce3d`. Codex
rebased PR #7 onto that exact SHA before making any further fix. The rebase
preserved #8's invariant that every substantive response emits a numbered board.

Dan resolved the only semantic conflict between #7 and #8:

- Under state-readiness `BLOCK`, the board is still mandatory.
- It contains at least one `NOW` action and every action is state reconciliation.
- `Program: GATED`, the exact clearing owner, and a recheck remain mandatory.
- `S01_STATE_BLOCKED_NO_BOARD` now makes the BLOCK-specific omission explicit;
  the general `E21_MISSING_NEXT_ACTION` also remains active.

The re-review blocker and major are closed in `3b8c9ef`:

1. Project identity now tries the workspace's first path segment before an
   enclosing nested Git repository. Linked worktrees under underscore-prefixed
   workspace containers still fall back to canonical Git identity.
2. `HOT_NON_MONOTONIC` compares both headings through
   `targetReferenceTime`, so a date-only heading is treated as the end of its
   New York calendar day instead of midnight.
3. The 14-day hard-stop has explicit 13-day-23-hour and 14-day-1-hour fixtures.

The advisory about `reconciliationPatterns` being a substring allowlist remains
deferred and is not a merge gate.

## Verification

Fresh after rebase and `3b8c9ef`:

```text
npm test
  generated copies: in sync
  incumbent smoke: 15/15 pass
  closure_scheduler 0.5.4 smoke: 17/17 pass
  rendered closure fixtures: 25/25 pass
  state-readiness checks: 26/26 pass
  wrapper checks: 2/2 pass

npm run typecheck
  pass

bash -n bin/closure-scheduler-mcp-wrapper.sh
  pass

git diff --check
  pass

npm pack --dry-run
  state-readiness CLI and engine present in the package
```

Payload and performance:

```text
closure rule: 15,655 bytes
fixed ceiling: 15,655 bytes

200 live Teranode checks:
median 1.373 ms
p95 2.604 ms
max 5.839 ms
bounded output 144 bytes
```

## Live false-BLOCK matrix

The 24 top-level Git projects under `/home/dan/.openclaw/workspace` were checked
with the remediated engine:

```text
PASS:      4
DEGRADED: 20
BLOCK:     0
```

The 13 wiki-less projects now quarantine missing state rather than gating work.
Additional live identity checks:

```text
prism-cli
  -> resolves prism-cli-wiki/wiki
  -> DEGRADED HOT_CURATED_MISSING, not HOT_MISSING/BLOCK

_next-best-prompt-worktrees/state-readiness-gate-codex
  -> project next-best-prompt-mcp-server
  -> DEGRADED, not BLOCK

teranode-ai/council-site
  -> project teranode-ai
  -> PASS at the check time

amsco-realty/brain
  -> project amsco-realty
  -> DEGRADED WORKSPACE_PROJECT_STALE
  -> does not read the unrelated brain project's wiki
```

At the later performance check, an ordinary Teranode log append produced:

```text
STATE READINESS DEGRADED — teranode-ai
- DEGRADED HOT_BEHIND_LOG
```

That is the intended replacement for the reviewer-reproduced false `BLOCK`.

## Historical snapshot labeling

The 41,300-byte / nonchronological Teranode result in the first handoff was a
real point-in-time measurement at `2026-07-30T14:38:00Z`; it is not current
workspace state. Teranode was later curated below the size ceiling. The current
live evidence is the 24-project matrix above.

## Requested Claude Code re-review

Review `d3dce3d..HEAD` read-only and return `APPROVE` or `BLOCK` with exact
file/line evidence. Confirm the rebase retained #8 and rerun:

```bash
npm ci
npm test
npm run typecheck
node dist/state-readiness-cli.js \
  --project-cwd /home/dan/.openclaw/workspace/prism-cli
node dist/state-readiness-cli.js \
  --project-cwd /home/dan/.openclaw/workspace/teranode-ai/council-site
node dist/state-readiness-cli.js \
  --project-cwd /home/dan/.openclaw/workspace/_next-best-prompt-worktrees/state-readiness-gate-codex
```

Concentrate on:

1. whether `BLOCK` always emits at least one reconciliation-only `NOW` action;
2. whether nested `.git` metadata can still redirect a workspace project;
3. whether mixed date-only/time chronology is deterministic;
4. whether the 14-day ±1-hour fixtures straddle the hard-stop correctly;
5. whether any healthy current workspace state can still produce `BLOCK`;
6. whether the incumbent and hosted endpoint remain unchanged.

Do not edit, merge, release, publish, change client configuration, restart an
MCP server, adopt the hosted surface, or deploy production as part of review.
Do not reply to or resolve the prior PR comment on Codex's behalf.

## Known boundary

This gate proves structural readiness, not semantic truth. It cannot prove that
two well-formed prose statements are mutually consistent. That would require a
separate structured-state or semantic-reconciliation design and remains outside
PR #7.

## Next gate

Claude Code independent re-review of the rebased head, then Dan's merge/load
decision. Canonical main runs 0.5.3 for new stdio connections; this branch's
0.5.4 state-readiness gate has not been loaded.
