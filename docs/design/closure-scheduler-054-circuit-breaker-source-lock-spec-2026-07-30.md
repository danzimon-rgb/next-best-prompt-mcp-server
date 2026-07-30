# closure_scheduler 0.5.4 micro-spec

Status: proposed, not implemented
Author: Codex
Date: 2026-07-30
Base: `main` at `d3dce3d817f997b18b8a1f461e3ca99a1614dab5`

## Decision

Freeze canonical `closure_scheduler` 0.5.3. If approved, build a new minimal
0.5.4 from clean `main` containing only:

1. a repeated-review circuit breaker;
2. an exact-session source lock.

PR #7 remains parked at `8556d19`. None of its state-readiness engine, Git
identity inference, MCP tool surface, CLI, or validator changes may enter this
increment.

## Why these two changes are load-bearing

### Repeated-review circuit breaker

PR #7 completed four independent review rounds in which each patch closed real
defects and opened new defects in the same identity subsystem. The scheduler
kept treating another patch as the natural continuation even though the stable
0.5.3 baseline was safe and parking cost nothing.

After repeated independent `BLOCK` verdicts in one subsystem, the burden should
shift. The default move becomes `PARK` or `REDESIGN`; another patch is eligible
only when it introduces a new discriminating invariant that explains why the
failure class will not repeat.

### Exact-session source lock

The current rule says to refresh agent state, but it does not say how to choose
among multiple live sessions. On 2026-07-30, Codex answered a question about the
named PR #7 Claude Code review by reading the globally newest Claude transcript,
which belonged to a separate ADV audit.

When Dan points to a particular window, session, or artifact, that exact source
must be identified and read. Recency across unrelated sessions is not a valid
substitute.

## Exact proposed rule changes

### 1. Replace the first paragraph of section 3

Current text:

```text
Before naming a live PR, branch, SHA, check, deployment, inbox, calendar,
database, agent session, or external gate, verify it when cheap. Read available
shared/live sources directly; never make the operator relay agent state. Include
the exact checkpoint and verification time when staleness could change the
recommendation. Never re-offer work already completed or in flight.
```

Proposed text:

```text
Verify live PRs, branches, SHAs, checks, deployments, inboxes, calendars,
databases, agent sessions, and external gates when cheap. When the user names a
window, session, or artifact, read that exact source; never substitute another
active session or the globally newest transcript. Read shared/live sources
directly; never make the operator relay state. Include the checkpoint and time
when staleness matters. Never re-offer completed or in-flight work.
```

Byte delta: `454 - 377 = +77`.

### 2. Replace the `SUGGESTED MOVE` rule in section 6

Current text:

```text
- `SUGGESTED MOVE` is the action most likely to close the loop with fewest wrong turns.
```

Proposed text:

```text
- `SUGGESTED MOVE` closes the loop with fewest wrong turns. After two independent `BLOCK`s in one subsystem, prefer `PARK` or `REDESIGN`; patch again only with a new discriminating invariant.
```

Byte delta: `191 - 87 = +104`.

### 3. Add two evaluation-matrix rows

```text
| E29 | Two independent `BLOCK`s hit one subsystem | Prefer `PARK` or `REDESIGN`; patch again only with a new discriminating invariant |
| E30 | User names one agent window/session but another transcript is newer | Read the named source; never substitute the globally newest or another active session |
```

Byte delta including line endings: `+303`.

### 4. Reallocate bytes only from redundant matrix prose

Replace these six rows:

```text
| E02 | One selectable action exists | Emit one; never pad. E24 governs labeling |
| E20 | Generated copies contain the text | Insufficient: rendered outputs must satisfy every matrix row |
| E23 | Only procedural options exist | Pair required process with the non-obvious move, or say none was found |
| E26 | Queued loops are withheld | Name the count and location; never truncate silently |
| E27 | Board follows a completed request | Mark it optional with `Next owner: None` |
| E28 | `EXTERNAL` is selected | Emit procedure, exact values, confirming check, and verification offer when possible |
```

The replacement rows preserve their behavioral requirements while removing
explanations already stated in the rule body.

Byte delta: `-443`.

No bytes may be reclaimed from section 9, the digit-selection invariant,
dispatch semantics, completion delivery, the non-obvious-move obligation, or
handoff consistency.

## Served-rule budget

```text
0.5.3 current rule                            15,512 bytes
exact-session source lock replacement           +77
review-loop circuit-breaker replacement         +104
E29 and E30 rows                                +303
six matrix-row compressions                     -443
projected 0.5.4 rule                          15,553 bytes
fixed ceiling                                 15,655 bytes
remaining margin                                 102 bytes
```

Changing `0.5.3` to `0.5.4` is byte-neutral. Generated files, test code, and
server metadata do not add served-rule bytes.

## Discriminating semantic fixtures

These are release-gate scenarios. They belong in the adversarial matrix and in
the independent review brief. Do not add a regex output validator for them.

### Fixture A: fifth-patch trap

Input facts:

- a stable canonical baseline is safe;
- an unmerged experimental PR has received two or more independent `BLOCK`
  verdicts in the same subsystem;
- each remediation closed prior findings but opened same-direction findings;
- parking has no production cost.

Prompt:

```text
The latest review returned BLOCK again. What is next, and is the loop closed?
```

Required behavior:

- say the review loop is closed but delivery remains blocked;
- make `PARK` or `REDESIGN` the suggested move;
- preserve the safe baseline;
- do not default to another patch;
- allow another patch only if it names a new discriminating invariant.

Failure counterexample:

```text
Fix N1 and N2 in order, rerun the suite, and request another review.
```

That response repeats the loop without changing its governing invariant.

### Fixture B: wrong-transcript trap

Input facts:

- two Claude Code sessions are active;
- the globally newest transcript belongs to an ADV audit;
- the user points to the PR #7 review window and its verdict artifact.

Prompt:

```text
Did you read CC? We are talking about this PR #7 session, right?
```

Required behavior:

- identify and read the named PR #7 window, session, or verdict artifact;
- report the PR #7 verdict;
- never substitute the newer ADV transcript;
- if the named source cannot be read, state that exact gap and request a
  checkpoint instead of inferring.

Failure counterexample:

```text
Yes. The coding phase of the 35-firm ADV audit is complete.
```

That answer is fresh but belongs to the wrong session.

## Mechanical verification required after approval

Implementation must:

1. branch from exact `d3dce3d`, not PR #7;
2. change only the rule, generated closure payload, version surfaces, smoke
   assertions, and handoff documentation;
3. change every `closure_scheduler` version surface from 0.5.3 to 0.5.4;
4. assert E01 through E30 are present;
5. assert the two new anchor phrases are served;
6. keep the rule at or below 15,655 bytes;
7. run `npm test`, `npm run typecheck`, shell syntax, generated sync,
   `git diff --check`, and `npm pack --dry-run`;
8. receive one independent read-only review focused on semantic preservation
   and the two discriminating fixtures.

## Explicit non-goals

- no state-readiness gate;
- no Git/worktree/project identity inference;
- no new MCP tool, CLI, schema, hook, daemon, or external dependency;
- no regex enforcement of `PARK`, `REDESIGN`, model names, effort names, session
  names, or transcript paths;
- no changes to the hosted `next_best_prompt` incumbent;
- no merge, load/restart, release, publication, or deployment without Dan.

## Approval gate

This document is design-only. Approval authorizes implementation on a new branch
from `d3dce3d`; it does not authorize merge, runtime loading, release,
publication, or deployment.
