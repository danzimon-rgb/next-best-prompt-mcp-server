# PR #7 final BLOCK remediation — Codex to Claude Code

Date: 2026-07-30 EDT  
Repository: `danzimon-rgb/next-best-prompt-mcp-server`  
Branch: `feat/state-readiness-gate`  
Review base: `59ef3c23fa43895459c375b3f219c0bf1d4d1b20`  
Implementation commits:

- `cd06837` — clear the final identity, prompt, version, and validator gates
- `c7456f6` — require exact model and effort recommendations for `PASTE TO`

Dan alone decides merge and load. Do not merge, publish, release, change client
configuration, restart an MCP, or deploy the hosted surface.

## Why the final verdict blocked

Claude Code's read-only review of `d3dce3d..59ef3c2` confirmed the architecture,
rebase, 53 tests, 24-project sweep, identity checks, boundary math, and unchanged
incumbent/hosted artifacts. It returned `BLOCK` on four bounded gates:

1. nested real Git metadata could override identity inside an underscore-prefixed
   linked-worktree container;
2. the MCP prompt description still licensed board omission;
3. the rule, generated constant, README, and `serverInfo` disagreed on 0.5.3 vs
   0.5.4;
4. the BLOCK action classifier used a five-phrase substring allowlist, accepting
   negated mentions and rejecting valid reconciliation phrasing.

The seven advisories in that verdict remain advisories and were not expanded into
this remediation.

## Remediation

### B1 — underscore container and nested Git identity

`gitProjectName` now recognizes only a linked-worktree `gitdir` marker. It no
longer adopts a directory merely because it contains `.git`, and no longer falls
back to the basename named by an arbitrary `.git` file.

The new fixture builds this exact shape:

```text
_worktrees/alpha-feature/.git       -> linked-worktree marker for alpha
_worktrees/alpha-feature/nested-repo/.git/HEAD
```

It makes canonical `alpha` BLOCK on `HOT_NON_MONOTONIC` while a healthy
`nested-repo` sibling identity would PASS. The fixture requires the BLOCK to
survive, pinning the dangerous BLOCK-to-PASS direction rather than only checking
a project label.

### M1 — prompt description

The template and generated prompt description now say:

```text
Always render at least one NOW action, including when no alternative is valuable.
```

The pre-#8 omission license is gone.

### M2 — version alignment

All user/runtime surfaces now identify the canary as 0.5.4:

- `serverInfo.version`
- README heading and body
- rule heading
- embedded `CLOSURE_SCHEDULER_RULE`
- closure smoke assertion

### M3 — honest validator boundary

The substring classifier and `stateReconciliationActionPatterns` context option
are removed. Under `BLOCK`, the rendered-output validator enforces only what it
can prove:

- at least one numbered action;
- `Program: GATED`;
- a nonempty exact clearing owner.

The rule still requires every action to be state reconciliation and requires a
recheck before proceeding. README now states this enforcement boundary. A
fixture with the continuation `This does not reconcile state` confirms that
action-body substrings no longer act as semantic proof.

## Exact model and effort routing

The queued 0.5.4 increment is now integrated. Every `PASTE TO` must recommend one
exact available model and one exact effort level chosen for task/risk, while
naming the agent and window. `E08_PASTE_TO_MODEL_EFFORT` rejects missing fields
and placeholders such as `current`, `default`, `same`, and `auto`.

For this consequential final review, the recommended route is:

```text
Claude Code · existing PR #7 review window · Claude Opus 4.1 · high
```

## Fresh verification

```text
npm test
  incumbent smoke:          15/15
  closure smoke:            18/18
  closure validator:        28/28
  state readiness:          27/27
  wrapper:                   2/2

npm run typecheck            pass
bash -n wrapper              pass
git diff --check             pass
npm pack --dry-run           pass
generated copies             in sync
closure rule                 15,640 bytes <= 15,655
```

The post-remediation live sweep of the same 24 top-level `.git` projects under
`/home/dan/.openclaw/workspace` reproduces:

```text
PASS       4
DEGRADED  20
BLOCK      0
TOTAL     24
```

## Requested independent re-review

Review `59ef3c23fa43895459c375b3f219c0bf1d4d1b20..HEAD` read-only from a clean
export. Re-run the full suite and the 24-project sweep. Adversarially reproduce
B1 and M1-M3, and inspect the exact model/effort increment for bypasses or false
positives. Return exactly:

```text
VERDICT: APPROVE | BLOCK
Range reviewed: <base>..<head>
Blocking findings: <none or file:line evidence>
Major findings: <none or file:line evidence>
Advisories: <bounded list>
Tests rerun: <commands and counts>
24-project sweep: PASS x / DEGRADED y / BLOCK z
Worktree mutations: none
```

Do not edit, commit, push, merge, publish, restart, deploy, or post GitHub
comments. Dan alone decides merge and load.
