# PR #7 terminal-BLOCK remediation handoff

Date: 2026-07-30
Owner: Codex
Reviewer: Claude Code, read-only
Branch: `feat/state-readiness-gate`
Review base: `61ceede`

## Outcome

The three terminal blockers in
`docs/reviews/pr7-final-review-61ceede-2026-07-30.md` are remediated without
merging, loading, restarting, publishing, or deploying anything.

Two implementation commits precede this handoff:

- `d84b931` reverts the broken exact-model/effort validator from PR #7. The
  independent increment remains preserved on `fix/exact-model-effort-054` at
  `7b47e55`; it was not deleted or folded into this review boundary.
- `f8439e7` replaces heuristic project identity with a fail-closed checkout
  resolution path and adds discriminating regressions.

## Blocker closure

### B1-R: checkout-root fallback below underscore containers

Closed. A cwd below `_archive/myrepo/.git` resolves to `myrepo`, not the leaf
subdirectory. Its fixture deliberately makes `myrepo` hit
`HOT_NON_MONOTONIC`, so the former false `DEGRADED` cannot pass.

Conflicting enclosing Git identities now return
`PROJECT_IDENTITY_AMBIGUOUS` at `BLOCK`. This covers both dangerous directions:

- a nested checkout inside a canonical workspace project;
- a nested linked worktree inside another checkout.

An explicit `project_name` is the only bypass, and a counterfixture proves that
it restores the intended project.

### B2: arbitrary `.git` redirection

Closed. A `.git` file target must:

- resolve to an existing directory inside the real continuity workspace;
- contain readable Git `HEAD` metadata;
- for linked worktrees, resolve `commondir` to an in-workspace `.git`
  directory;
- for linked worktrees, carry a `gitdir` back-pointer that resolves exactly to
  the checkout's `.git` file.

Regressions reject a missing target, an existing target outside the workspace,
an ordinary in-workspace directory, missing linked-worktree metadata, and a
copied marker whose back-pointer names another checkout. Valid linked-worktree
and markerless Git-dir shapes remain accepted.

### B3: unsound exact-model/effort validator

Closed by removal from this PR. The validator, fixtures, smoke assertion, rule
increment, generated payload, and prior in-PR handoff were reverted together.
The original load-bearing section 9 language is restored. The separately
reviewable increment remains on `fix/exact-model-effort-054` at `7b47e55`.

## Major and boundary closure

- S01 fixture names now state the actual contract: the validator proves a
  nonempty blocked board, `Program: GATED`, and the exact clearing owner. The
  rule, not a substring classifier, governs reconciliation-only semantics.
- Nested authoritative identities no longer silently override one another.
  Conflict is an explicit `BLOCK`, with an explicit-name counterexample.
- The rule tells clients to pass `project_name` for ambiguous identity or a
  noncanonical checkout.
- The strict 14-day lag boundary is pinned: exactly 14 days is `DEGRADED`; one
  hour above is `BLOCK`; one hour below is `DEGRADED`.
- Mixed-precision `HOT_NON_MONOTONIC` coverage remains green.

## Fresh verification

```text
npm test
  incumbent smoke:          15/15
  closure smoke:            17/17
  closure validator:        26/26
  state readiness:          37/37
  wrapper:                   2/2

npm run typecheck            pass
bash -n wrapper              pass
git diff --check             pass
npm pack --dry-run           pass
generated copies             in sync
closure rule                 15,654 bytes <= 15,655
```

The post-remediation sweep of all 24 top-level Git projects under
`/home/dan/.openclaw/workspace` remains:

```text
PASS       4
DEGRADED  20
BLOCK      0
TOTAL     24
```

Targeted live identity checks:

```text
PR worktree
  DEGRADED; project=next-best-prompt-mcp-server

_divorce/strategy
  DEGRADED; project=_divorce

tuckabye/engine
  BLOCK PROJECT_IDENTITY_AMBIGUOUS
  explicit project_name=tuckabye -> PASS

teranode-ai/wiki
  BLOCK PROJECT_IDENTITY_AMBIGUOUS
  explicit project_name=teranode-ai -> DEGRADED HOT_BEHIND_LOG
```

## Bounded advisories

- Workspace-root shadowing remains outside this terminal-block remediation.
- `/home/dan/.openclaw/workspace/_wikis/alpha` remains untouched. Deletion
  requires Dan's explicit destructive authorization.

## Independent review request

Use **Claude Code · existing PR #7 review window · Opus 5 · high**.

Review `61ceede..HEAD` read-only from a clean export. Re-run the full suite and
the 24-project sweep. Adversarially reproduce B1-R and B2, verify B3 is wholly
removed from PR #7 but preserved on its isolated branch, inspect both nested
identity directions, and confirm the S01 validator/rule boundary. Return
exactly:

```text
VERDICT: APPROVE | BLOCK
Range reviewed: 61ceede..<head>
Blocking findings: <none or file:line evidence>
Major findings: <none or file:line evidence>
Advisories: <bounded list>
Tests rerun: <commands and counts>
24-project sweep: PASS x / DEGRADED y / BLOCK z
Worktree mutations: none
```

Do not edit, commit, push, merge, publish, load, restart, deploy, post GitHub
comments, reply to review threads, or resolve review threads. Dan alone decides
merge and load.
