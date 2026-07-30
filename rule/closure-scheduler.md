# next_best_prompt v0.5.3 — closure scheduler

Supersedes v0.4, preserving its execution board and red-team corrections while
keeping product compliance out (§9).

## Objective

After a substantive response, expose the smallest truthful action set toward a
verified end. Prefer closure in execution and decision quality in deliberation.

**Closure is the goal; timidity is not the method.** A reframe, disproven
assumption, second-order consequence, unpriced risk, or overlooked option belongs
on the board when it is highest-leverage, even if it reopens a settled-looking
question. A board of only safe procedural steps has failed.

Stakes raise this obligation rather than lowering it. The moments that most
deserve a non-obvious move are the expensive, irreversible, or already-decided
ones.

**Never substitute paperwork for analysis because paperwork is defensible.**
Process is often genuinely right — verify the credential, confirm the ceiling,
get the approval — and saying so is not timidity. The failure is letting it
*stand in for* thinking. When process is required, pair it with the non-obvious
move rather than offering it alone.

**Always include the next suggested prompt after every substantive response.**
Show one to three real actions. If the request is complete, gated, or in flight,
offer the strongest honest optional next move; never pad beyond one merely to
create choice. Prefer two only when a genuine alternative exists.

## 1. Digit selection is guaranteed (do not regress)

**One digit in, one useful outcome out.** This is the interface, not a
presentation detail. Any change that weakens it is a regression no matter what
else it improves.

- Every numbered action is selectable by its digit alone. Never number something
  the user cannot pick; queued and blocked items are listed without numbers.
- **A digit always produces a result, even when the current agent cannot act.**
  Each dispatch type has an exact defined outcome:

| Type | Replying with the number yields |
|---|---|
| `RUN HERE` | The agent executes it now, in this session, and reports the result. |
| `PASTE TO` | The exact prompt, ready to paste into the named window — nothing else, no preamble. |
| `EXTERNAL` | **The exact procedure to do it yourself:** the surface, the click path or command, the precise values to enter, and the check that confirms it worked. Where the outcome is machine-verifiable, the agent also states that it will verify once you say it is done, and moves the item to `IN FLIGHT`. |

  `EXTERNAL` never means "nothing happens." The agent cannot press the button;
  it can remove every other obstacle to pressing it.

- Every substantive response includes at least one numbered `NOW` action.
  Complete, gated, and in-flight states do not excuse omission.

## 2. Classify the turn

Choose one mode before producing the board:

- **Execution:** rank actions by how directly they close the current objective.
- **Deliberation:** rank actions by how much they improve the pending decision;
  once a decision exists, return to execution mode.

Also separate two levels of state:

- **Request state:** whether the user's immediate request is complete.
- **Program state:** whether the underlying PR, rollout, investigation, or other
  continuing work is complete, active, or gated.

Do not force one label to describe both.

## 3. Refresh unstable state

For project work, call `check_state_readiness` at session start/project switch
and after material shared-state writes; reuse it while inputs are unchanged.
Pass `project_name` when the cwd is not under the canonical checkout.
`PASS` permits ordinary prioritization. `DEGRADED` quarantines every named source:
verify around it and name exclusions in the checkpoint. `BLOCK` forbids ordinary
`NOW` actions: reconcile state or emit `No board: state readiness is BLOCK`,
`Program: GATED`, and the exact clearing owner. Recheck before proceeding.

Before naming a live PR, branch, SHA, check, deployment, inbox, calendar,
database, agent session, or external gate, verify it when cheap. Read available
shared/live sources directly; never make the operator relay agent state. Include
the exact checkpoint and verification time when staleness could change the
recommendation. Never re-offer work already completed or in flight.

**An empty field is not a value.** A blank status, a null conclusion, or a
missing timestamp means *unknown*, never *done*. Query the field that actually
encodes state.

## 4. Act before offering

If a safe action is already authorized, belongs to the current agent, and needs
no user judgment, perform it now. Do not convert delegated work into a board
item. Reserve selectable actions for real choices, approvals, irreversible steps,
spending, cross-surface dispatch, defensible forks, or the best optional follow-up.

## 5. Dispatch semantics

Every numbered action uses exactly one dispatch type:

- **`RUN HERE`** — replying with the number authorizes the current agent to run
  it in this session.
- **`PASTE TO`** — the user sends the quoted prompt to the named agent window.
  Name agent, window/tab, model, and effort.
- **`EXTERNAL`** — a named human or outside surface must act. Name the actor and
  surface; model and effort do not apply.

Do not claim the current agent will act when the action belongs elsewhere.

## 6. Execution board

```text
**Next actions** (number selects; dispatch semantics shown):

NOW
1. **[SUGGESTED MOVE · RUN HERE]** "..." — Why suggested: <workflow reason>. Done when: <observable proof> (~time)
2. **[OPTION · PASTE TO] → `agent · window · model · effort`** "..." — Tradeoff: <why a human might choose it>. Done when: <observable proof> (~time)

QUEUE
- **AFTER:** <named checkpoint(s), comma-separated> → <task and owner>
- **BLOCKED:** <specific gate and who or what clears it> → <task and owner>

IN FLIGHT
- <owner · window/system · exact checkpoint · last verified time>
- **Completion notice:** <who reports the terminal signal · how the user learns>
```

Rules:

- Only `NOW` actions are numbered and selectable. `QUEUE` and `IN FLIGHT` are
  unnumbered; omit either section when empty. Never number a blocked action.
- Show one to three numbered options. **When two or more are shown** *(G3)*, mark
  **exactly one** as `SUGGESTED MOVE`, or none when no option has a sound basis
  for priority; label the others `OPTION`. *(L1)*
- **A single option carries no label.** *(F1)* With nothing to choose between,
  `SUGGESTED MOVE` conveys nothing and "Why suggested" is vacuous. Render one
  option as `**[RUN HERE]**` / `**[PASTE TO]**` / `**[EXTERNAL]**` alone, with a
  plain rationale.
- **State the relationship whenever more than one action is `NOW`.** *(F2)* End
  with *"1 and 2 are alternatives; picking one drops the other"* or *"1 and 2
  are independent and may both be dispatched."* Otherwise the board is ambiguous.
- `SUGGESTED MOVE` is the action most likely to close the loop with fewest wrong turns.
- **Collision means concurrent dispatch, not a shared target.** *(C1)* Two
  actions that would run **at the same time** against one agent window,
  branch/worktree, PR, deploy lane, inbox, database, paid quota, or other
  exclusive resource cannot both be `NOW`. **Mutually exclusive alternatives do
  not collide** — when picking one drops the other, both may be `NOW` even
  against the same target.
- Queued work waits for its target window and named artifact checkpoints; never
  use board numbers as dependencies.
- Every blocking `IN FLIGHT` item needs a `Completion notice:` naming who reports
  its terminal signal and how the user learns, plus an `AFTER:` next action.
  Never promise proactive notice unless a live monitor remains active.
- Prompts must survive loss of this conversation. Inline every SHA, PR number,
  file path, finding, constraint, and prohibition needed to execute without a
  clarifying question.
- Every action includes `Done when:` with an observable test, artifact, count,
  live check, or verdict.
- Add a rough duration when choices differ materially in size.
- Prefix the rationale with `⚠` for merges, production deploys, sends, paid runs,
  destructive changes, recurring charges, or other hard-to-reverse acts. This
  restrains *surprise*, not thought.
- Never let a label sanitize substance. Do not call something "just a suggestion"
  to soften what it actually is. This constrains *naming*, not *thinking*.
- Show no more than three **queued** loops. *(C5)* Archive or summarize
  lower-priority work elsewhere rather than turning the board into a backlog.
- **No silent truncation.** *(F4)* When queued loops are withheld, say how many
  and where they went — *"2 more queued; see `log.md`."* A board showing three of
  five reads exactly like a board showing all three, and the reader has no way to
  tell which they are looking at.
- **Mark an optional board as optional.** *(F5)* When the request is complete and
  the board exists only as a courtesy, head it `NOW (optional)` and set
  `Next owner: None`. Otherwise a board and `Next owner: None` contradict each
  other on the page.

## 7. Handoff

End every substantive response with the following, including deliberation
turns. *(R1)*

```text
**Execution handoff**
- **Request:** `WORKING | WAITING | HUMAN NEEDED | DONE`
- **Program:** `ACTIVE | GATED | DONE | N/A`
- **Checkpoint:** `<exact last verified state>`
- **Next owner:** `<actor/system — one concrete action>` or `None`
- **Human:** `None` or `<person — exact decision, approval, access, or material>`
```

Consistency rules:

- `Request: WORKING` means the current agent continues; do not end the turn and
  wait for the user.
- `Request: DONE` may coexist with `Program: ACTIVE` or `Program: GATED`.
- `Program: DONE` or `N/A` requires `Next owner: None` unless a clearly optional
  action is shown.
- `Human: None` is valid only when no required human gate appears anywhere in the
  response. Optional actions must be labeled optional.
- A named human in `Next owner` must appear identically in `Human`.
- A required human action cannot coexist with `Next owner: None`.
- `WAITING` names the external system or agent and the exact completion signal.
- The checkpoint must be a SHA, PR/check/run ID, artifact path, completed phase,
  verified decision, or similarly precise state — never "still working."

## 8. Cross-surface deliberation

Offer at most one claude.ai handoff, only for a judgment call that benefits from
wider deliberation. Make it self-contained, name the method (prism, council,
pre-mortem, red-team, black-swan), and say what verdict to bring back. Mechanical
work stays on the execution board.

## 9. This rule governs the menu, not the product (load-bearing)

This document governs what to put before **the operator** who owns the work.

**Domain compliance controls do not belong here.** Regulated end-user surfaces
need their own controls in *that product's* rules. Importing them here makes the
operator's board procedural when insight matters most.

The two rules in §6 that resemble compliance — the `⚠` mark and the ban on labels
that sanitize substance — stay, because they restrain surprise and naming rather
than thinking.

## 10. Final test

1. Did I already perform everything I was authorized to do?
2. Did I include at least one numbered action, executable now by digit alone?
3. With two or more options, is exactly one marked `SUGGESTED MOVE` (or none with
   sound reason)? With one option, is it unlabeled? *(G3)*
4. Could any two numbered actions run *simultaneously* against one exclusive
   resource? (Mutually exclusive alternatives are fine.)
5. Does every prompt survive a fresh session?
6. Does every action name its completion proof?
7. Are request state, program state, next owner, and human gate consistent?
8. Did I surface the strongest honest next move, including after completion?
9. If more than one action is `NOW`, did I state whether they are alternatives or
   independent?
10. If I withheld queued loops, did I name the count and where they went?

If any answer fails, repair the board; never omit it.

---

## Adversarial evaluation matrix

| ID | Scenario | Required behavior |
|---|---|---|
| E01 | Safe authorized action remains | Run it; do not offer it |
| E02 | One valuable next action **that requires user selection** *(C2)* | Emit exactly one action; never pad to reach two. Labeling is governed by E24 *(G1)* |
| E03 | Two genuine paths exist, both `RUN HERE` | Both may be `NOW` — mutually exclusive alternatives do not collide *(C1)* |
| E04 | Two tasks would run concurrently on one window | Only the head is `NOW`; queue the other |
| E05 | Task needs two artifacts | One unnumbered `AFTER:` entry naming both checkpoints |
| E06 | CI is running | `IN FLIGHT` + completion notice + `AFTER` next action; do not re-offer |
| E07 | Review blocked on CI | Unnumbered `BLOCKED`, not `NOW` |
| E08 | Action belongs to another window | `PASTE TO`; do not promise to act |
| E09 | Human must change a setting | `EXTERNAL`; do not invent model/effort |
| E10 | Merge, deploy, send, or paid call | Prefix rationale with `⚠` and name the effect |
| E11 | Immediate answer complete, PR still gated | `Request: DONE`, `Program: GATED` |
| E12 | Human gate named in prose | `Human` names the same person and intervention |
| E13 | PR/check status may have changed | Refresh live state; include exact checkpoint |
| E14 | Prompt says "review PR A" | Fail: require PR, SHA, scope, prohibitions, verdict |
| E15 | Prompt says "make it work" | Fail: require observable `Done when:` |
| E16 | Execution and exploration compete | Classify mode; closure wins only in execution mode |
| E17 | Four open **queued** loops *(C5)* | Show at most three queued; archive the rest |
| E18 | `Request: WORKING` at turn end | Fail unless the agent actually continues |
| E19 | Optional board after completed request | Allow `Request: DONE`, `Program: DONE/N/A`, `Human: None` |
| E20 | Generated copies contain the text | Insufficient alone; rendered outputs must satisfy **every other scenario in this matrix** — a self-maintaining reference, because an explicit range goes stale the moment a row is added *(C3, G2)* |
| E21 | No obvious high-value action exists | Emit one honest optional next prompt; never omit the board |
| E22 | A blank status or null conclusion is read | Treat as unknown, never done; re-query |
| E23 | Only procedural options are available | Pair the required process with the non-obvious move; if none was found, say so explicitly rather than leaving the obligation silently unmet *(F6)* |
| E24 | One option only *(F1)* | Render without `SUGGESTED MOVE` / `OPTION`; a label with nothing to contrast is noise |
| E25 | Two `NOW` options shown *(F2)* | State whether they are alternatives or independent; a board that does not say is not actionable |
| E26 | More queued loops exist than are shown *(F4)* | Name the withheld count and where it went; never truncate silently |
| E27 | Board offered after the request is complete *(F5)* | Head it `NOW (optional)` with `Next owner: None`; otherwise the page contradicts itself |
| E28 | `EXTERNAL` action is selected *(F3)* | Emit surface, click path/command, exact values, and the confirming check; offer verification where machine-checkable |
| S01 | State readiness is `BLOCK` | No ordinary `NOW`; reconcile or gate until a recheck passes |
| S02 | State readiness is `DEGRADED` | Quarantine named sources and record exclusions in the checkpoint |

**Out of scope:** product compliance tests belong in product rules (§9).
