# next_best_prompt — next-best-prompts at end of turn

`next_best_prompt` points to the best next moves. After completing a substantive turn,
end your response with a short, ranked menu of **next-best-prompts**: the 2–4
highest-leverage things the user could do next. The user replies with a single
digit to pick one; you then act on it.

## Format

End the message with a section exactly like this:

**Next-best-prompts** (reply with the number):

1. **[HIGH · NOW]** "copy-paste-ready prompt text" — one-line rationale
2. **[MED · AFTER 1]** "copy-paste-ready prompt text" — one-line rationale
3. **[LOW · BLOCKED: named gate]** "copy-paste-ready prompt text" — one-line rationale

Format rules:
- **Number every option** (`1.`, `2.`, …) so the user can reply with just the digit.
- Tag each **[HIGH] / [MED] / [LOW]** by leverage, highest first.
- Add a **sequencing marker** after the leverage tag, separated by ` · `. See
  **Sequencing** below. It is required on every option.
- The quoted text is the actual prompt the user would send — written so they can
  copy-paste it or simply reply with the number.
- Give each a **one-line rationale** after an em-dash.
- 2–4 options. Never more than 4.

## Digit selection is guaranteed (do not regress)

**One digit in, one useful outcome out.** This is the interface, not a
presentation detail. Any future change that weakens it is a regression no matter
what else it improves.

- **Every numbered option must be selectable by its digit alone.** Never number
  something the user cannot pick — a blocked or queued item is listed without a
  number.
- **A digit always produces a result, even when the current agent cannot act.**
  If the option belongs to another agent or window, replying with the number
  means *"hand me that prompt, ready to send"* — emit the exact block to paste.
  It never means "nothing happens."
- **When the menu is omitted, say so in one line** — for example, *"No menu:
  everything authorized was already executed."* Silence is indistinguishable from
  the rule failing, and the user should never have to wonder which it was.

## Sequencing (required on every option)

A ranked list alone implies the options are interchangeable alternatives. They
usually are not: one may consume another's output, two may contend for the same
branch or the same agent session, and one may be unstartable until an outside
gate clears. The user should never have to infer that. Every option carries one
sequencing marker, appended to the leverage tag after ` · `.

Use exactly one of three:

- **`NOW`** — startable immediately, with nothing in this menu blocking it.
- **`AFTER n`** — requires option `n` in this same menu to complete first. `n`
  must be a real number in this menu, and the rationale must say what it
  consumes from `n` (an artifact, a SHA, a decision, a merged branch).
- **`BLOCKED: <gate>`** — cannot start until a named external gate clears. Name
  the gate and who or what clears it — `BLOCKED: Camba ADV approval`,
  `BLOCKED: CI green on #281`. Never write a bare `BLOCKED`.

**Two or more `NOW` options is a claim, not a default.** It asserts they are
conflict-free and may be dispatched simultaneously. Before marking a second
option `NOW`, check every one of these against the options already marked `NOW`:

- same branch, worktree, or PR;
- same file or module;
- same deploy lane or production surface;
- same external resource (one inbox, one database, one paid quota); or
- **same agent session** — two prompts routed to the same window cannot run at
  once no matter how disjoint the files are.

Any collision means the later option is `AFTER n`, not `NOW`. When it is genuinely
ambiguous, prefer `AFTER n`: a needless wait costs minutes, a collision costs a
debugging session.

### Related markers

- **`IN FLIGHT`** — an option already dispatched and still running. Do **not**
  re-offer it as a digit-selectable choice; list it without a number so the user
  sees it is accounted for and does not dispatch it twice. Drop it once it lands.
- **Scale hint** — when options differ in size by an order of magnitude, append a
  rough duration to the rationale (`~2 min`, `~1 day`, `multi-week`). A two-minute
  fix and a multi-week build must not look alike behind two adjacent digits.
- **`⚠`** — lead the rationale with `⚠` and the effect when the option is hard to
  reverse or outward-facing: merges, production deploys, sends to third parties,
  paid runs, destructive operations. A single digit must never hide an
  irreversible act.

### Example

```text
1. **[HIGH · NOW] → `Codex · Teranode window · gpt-5.6-sol · high`** "..." — starts PR A (~1 day)
2. **[MED · AFTER 1] → `Claude Code · Teranode window · opus-5 · high`** "Review PR A" — needs 1's branch
3. **[MED · NOW] → `Claude Code · Teranode window · opus-5 · high`** "Fix the spend TOCTOU" — different files, different session
4. **[LOW · BLOCKED: paid-preview approval] → `Codex · Teranode window · gpt-5.6-sol · high`** "..." — ⚠ first paid run
   IN FLIGHT — MCP consolidation Phase 0 (Codex, dispatched 17:46)
```

Options 1 and 3 are simultaneously dispatchable; 2 waits on 1; 4 waits on Dan.

## Execution handoff

After every substantive response, append one scan-friendly handoff block that
answers four operational questions: **what state is the work in, where exactly
did it stop, who acts next, and is human intervention required?**

**Execution handoff**
- **State:** `<state>`
- **Left off:** `<specific checkpoint>`
- **Next:** `<actor> — <single next required action>`
- **Human:** `None` or `<person> — <exact intervention required>`

Choose exactly one state:

- `🔵 WORKING` — the named agent will continue without waiting for the user.
- `🟠 HUMAN NEEDED` — progress genuinely requires a named person's answer,
  approval, access, choice, or missing material.
- `⏸ EXTERNAL WAIT` — progress is waiting on CI, a deploy, another person, or an
  outside system that the current agent cannot advance yet.
- `✅ DONE` — the current request is satisfied and no required handoff remains in
  either the immediate request or the underlying work being reported.

Handoff rules:

- Describe the handoff **after this response**, not who spoke last.
- `Left off` must name the exact last verified checkpoint: for example a commit
  SHA, PR/check/run id, artifact path, completed phase, failing gate, or decision.
  Do not write vague phrases such as "still working" or "where we discussed."
- `Next` must name one real actor or system (`Codex`, `Claude Code`, `Dan`,
  `GitHub Actions`, `David`) and one concrete required action. When state is
  `✅ DONE`, write `None — request complete`.
- `Human` must be explicit. Write `None` when no human intervention is required.
  Otherwise name the person and the exact approval, credential, material, or
  decision needed. Do not hide human gates in prose elsewhere.
- A read-only status check can finish while the work it reports still has an open
  gate. In that case the capsule must describe the **underlying work**, not declare
  `✅ DONE` merely because the status check itself completed. If the response names
  a required next actor, approval, confirmation, credential, material, decision, or
  other human intervention anywhere in its body, carry that gate into `State`,
  `Next`, and `Human`.
- Before sending, perform a self-consistency check across the entire response:
  `Human: None` is valid **if and only if** no human gate is named anywhere else.
  A human named in `Next` (for example `Dan` or `David`) requires the same named
  person and exact intervention in `Human`. A `Required human intervention` or
  `Exact next actor` field in the body must agree with the final capsule.
- `✅ DONE` requires all three conditions: no underlying required action remains,
  `Next` is exactly `None — request complete`, and `Human` is exactly `None`.
  Contradictory combinations are invalid output; correct them before responding.
- If the state is `🔵 WORKING`, the agent must actually continue; do not yield and
  wait for the user. If the agent cannot continue, select the real blocking state.
- Put the block after any next-best-prompts menu or claude.ai handoff so it is the
  final human-readable section.
- Emit the block for every substantive response even when there is no worthwhile
  next-best-prompts menu.
- An optional menu does not make the user the required owner. If the request and
  the underlying work are complete, use `✅ DONE` even when optional next moves
  exist. Never use this rule to erase a real gate described elsewhere.

## Multi-agent routing (when more than one agent is in play)

When the user is orchestrating **multiple agents or sessions at once** — e.g. a builder and an
independent reviewer, or two models split across windows/tabs — a next-best-prompt is not just
*what* to do next but *who* should do it. Turn each option into a **routing directive**: prefix
it with the target agent, its window or tab, the model, and the effort/reasoning level, so the
user can dispatch it without deciding any of that themselves.

**Next-best-prompts** (reply with the number):

1. **[HIGH · NOW] → `<agent> · <window-or-tab> · <model> · <effort>`** "copy-paste-ready prompt text" — one-line rationale
2. **[MED · AFTER 1] → `<agent> · <window-or-tab> · <model> · <effort>`** "copy-paste-ready prompt text" — one-line rationale

Routing rules:
- **Name all FOUR fields** in the prefix: the target **agent** (who runs it), its
  **window-or-tab** (where it lives — this comes first after the agent name; it is the
  disambiguator), the **model**, and the **effort / reasoning level** (how hard to think). Pick
  the agent by role fit, the model by task, the effort by stakes. Use each target's own
  vocabulary (e.g. an "ultra"/max tier where it exists).
- **Never trim a field you are unsure of — look it up.** The window from the workspace handoff
  or ledger, the model from the session/worktree records. A partial prefix ("Codex · high") is a
  rule violation, not a compromise; it hands the user the exact lookup the prefix exists to remove.
- **Disambiguate two sessions of the same agent by window/tab, never by agent name alone.**
  "Codex" is not a target; "Codex · Teranode window" is.
- **Routing interacts with sequencing.** The collision test is *concurrent
  dispatch*, not a shared target. Two options that would run **at the same time**
  against one window/tab are the same session and cannot both be `NOW`; the
  second is `AFTER n`. **Mutually exclusive alternatives do not collide** — when
  the user picks one and the other is thereby dropped, both may be `NOW` even
  though they name the same target. Routing to *different* sessions is what makes
  more than one *simultaneously dispatchable* `NOW` possible.
- **Choose, don't hedge.** One concrete target per option — the point is to remove a decision, not
  add one. If two agents could do it, pick the better fit and say why in the rationale.
- **Bright-line test for "multi-agent":** another agent has an open session, an unexpired
  handoff, or in-flight work anywhere in the workspace → the prefix is REQUIRED on every option,
  even when every option happens to route to the current session. "All options are for me" is
  not an exemption — that fact is itself information the user should see spelled out.
- **Inert only when genuinely solo.** Only when no other agent or session is active anywhere in
  the workspace, omit the routing prefix and emit the plain menu above.
- The digit still selects the option; the prefix only tells the user where to send it.

## What the menu is optimizing for (load-bearing)

The menu does not answer *"what could happen next."* It answers: **what gets this
thread to a verified end, correctly, with the fewest wrong turns.** Rank by how
much an option *closes*, not by how much it *does*.

Five rules follow from that.

**Surface the non-obvious move.** Closure is the goal; timidity is not the
method. If the highest-leverage next step is a reframe, a disproven assumption, a
second-order consequence, an unpriced risk, or an option the user has not
considered, it belongs on the menu — **including when it reopens a question that
looked settled.** A menu of only safe procedural steps has failed even when every
option is executable and every box is ticked.

Stakes raise this obligation rather than lowering it. The moments that most
deserve a non-obvious move are exactly the expensive, irreversible, or
already-decided ones.

**Never substitute paperwork for analysis because paperwork is defensible.**
Process is often genuinely the right move — verify the credential, confirm the
ceiling, get the approval — and saying so is not timidity. The failure is
letting it *stand in for* thinking. When process is required, pair it with the
non-obvious move rather than offering it alone.

**Terminal beats lateral.** Prefer the option that ends the thread over one that
merely extends it, even when the extending option is more interesting. When
nothing on offer can close it, say which gate is holding it open and make the top
option the one that clears that gate.

**Do not offer what you should simply do.** If an option is inside your standing
authorization and you could execute it now, execute it and report the result.
Converting your own next action into a menu item is not deference, it is handing
back work the user already delegated. Reserve the menu for choices that are
genuinely the user's: judgment calls, approvals, spending, irreversible acts, and
decisions where two paths are defensible.

**Write prompts that survive losing this conversation.** The receiving session may
have none of the current context — a fresh window, a different agent, tomorrow
morning. Inline every identifier it needs: the SHA, the PR number, the file path,
the specific findings to check, the constraints that must hold. *"Review PR A"* is
not a prompt. *"Review PR #282 at `69cb8ec` — verify the migration test proves the
release path, confirm no path registers the tool; read-only, do not merge"* is.

> **Test before emitting:** could someone with no memory of this conversation
> execute this prompt without asking a single clarifying question? If not, it is
> underspecified — fix it or drop it.

**Name the verification.** Every option states how the receiver will know it is
actually done: the test that must pass, the count that must hold, the live check
to run. Not *"make it work"* but *"654/654 tests pass and the live page renders
the corrected copy."* An option with no success condition cannot close a loop —
it can only feel finished.

### This rule governs the menu, not the product (load-bearing)

This document decides what to put in front of **the operator** — the person who
already owns the work and delegated it. It is a thinking instrument.

**Domain compliance controls do not belong here.** If a product built by this
operator emits regulated content to an end user — investment, legal, medical, or
similar — that surface needs its own recommendation, review, disclosure, and
recordkeeping controls, enforced in *that product's* rules. Importing those
controls into this document is a category error with a predictable cost: the
menu turns procedural precisely when the stakes make insight most valuable.

Two things that look like compliance but are not, and stay:

- **`⚠` on irreversible acts.** That is information, so one digit cannot hide a
  production deploy, a send, or a charge. It restrains *surprise*, not thought.
- **Never let a label sanitize substance.** Do not call something "just a
  suggestion" to soften what it actually is. That constrains *naming*, not
  *thinking*.

## When to apply

After any substantive turn — work shipped, a question answered in depth, a
decision reached, an artifact produced.

## When NOT to apply (load-bearing)

- **Skip the section entirely when there is no high-value next move.** Silence
  beats menu-padding.
- Don't pad to hit a count. One real option beats three filler ones — and zero
  beats one fake one.
- Don't offer options that merely restate the task in progress or ask for a
  trivial confirmation.

## Why

Ranked, numbered, copy-paste-ready options make it cheap to act — the user
replies with one digit instead of composing the next instruction. The
HIGH/MED/LOW tags expose your judgment about leverage. The skip-when-empty rule
keeps it signal, not noise.

## Cross-surface deliberation handoff (claude.ai)

Claude Code is agentic and repo-aware. claude.ai (web/desktop/app) is the better
surface for *wider deliberation*: conversational back-and-forth, the prism /
council / pre-mortem / black-swan patterns, and the personal connectors (Gmail,
Calendar, Drive). When the strongest next move is not execution here but a
judgment call worth deliberating there, ALSO emit a **claude.ai deliberation
prompt**: one self-contained, copy-paste-ready block the user drops into
claude.ai, then brings the verdict back here to execute.

This is the "two prompts in one" move — the user sends a single prompt to Claude
Code and gets back both the work AND the ready-made claude.ai prompt, instead of
hand-authoring the second one.

### Format

Emit it as a fenced code block (one-click copyable), led by a one-line pointer so
it reads as distinct from the digit-menu. Place it after the next-best-prompts
menu, or on its own when the deliberation is the only worthwhile next move:

**→ Deliberate on claude.ai** (paste this there), then a fenced block containing
the context the other surface can't see, the specific decision, and the named
deliberation shape.

### Rules (load-bearing)

- **Self-contained.** claude.ai cannot see this repo, these tools, or this
  conversation. Inline every fact it needs: the decision, the options, the
  constraints, the numbers. "The plan we discussed" is useless there.
- **Deliberation, not execution.** Only hand off judgment calls that get better
  with wider reasoning; mechanical next steps stay in the menu to run here. If
  nothing needs off-surface deliberation, emit nothing — the same skip-when-empty
  discipline as the menu.
- **Name the shape.** Request the specific deliberation the decision warrants
  (N-prism, pre-mortem, red-team, black-swan), not "what do you think."
- **Close the loop.** End the block by telling the user to bring the verdict back
  here to execute; the surfaces are complementary, not parallel.
- **At most one** handoff per turn — the single highest-value deliberation, never
  a second menu.
