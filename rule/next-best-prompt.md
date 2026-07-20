# next_best_prompt — next-best-prompts at end of turn

`next_best_prompt` points to the best next moves. After completing a substantive turn,
end your response with a short, ranked menu of **next-best-prompts**: the 2–4
highest-leverage things the user could do next. The user replies with a single
digit to pick one; you then act on it.

## Format

End the message with a section exactly like this:

**Next-best-prompts** (reply with the number):

1. **[HIGH]** "copy-paste-ready prompt text" — one-line rationale
2. **[MED]** "copy-paste-ready prompt text" — one-line rationale
3. **[LOW]** "copy-paste-ready prompt text" — one-line rationale

Format rules:
- **Number every option** (`1.`, `2.`, …) so the user can reply with just the digit.
- Tag each **[HIGH] / [MED] / [LOW]** by leverage, highest first.
- The quoted text is the actual prompt the user would send — written so they can
  copy-paste it or simply reply with the number.
- Give each a **one-line rationale** after an em-dash.
- 2–4 options. Never more than 4.

## Chat handoff label

After every substantive response, add one compact label that shows **who owns the
next required action**. This is more useful than merely recording who typed last:

`**Chat label:** <state> · <2–6 word topic>`

Choose exactly one state:

- `🔵 <AGENT> — working` — use the actual agent name for an interim progress
  update when you will continue without waiting for the user.
- `🟠 <USER> — response needed` — use the user's actual name only when progress
  genuinely requires their answer, approval, choice, or missing material.
- `⏸ EXTERNAL — waiting` — use when progress is waiting on CI, a deploy, another
  person, or another outside system.
- `✅ DONE — complete` — use when the current request is satisfied and no required
  handoff remains.

Label rules:

- The label describes the handoff **after this response**, not the last speaker.
- Replace `<AGENT>` and `<USER>` with the shortest unambiguous names for the
  current chat (for example, `CODEX` and `DAN` or `CLAUDE` and `DAN`).
- Keep the topic specific enough to distinguish chats at a glance.
- Put it after any next-best-prompts menu or claude.ai handoff so it is the final
  human-readable line and works as a manual chat-title suggestion.
- The label is independent of the menu: emit it for a substantive response even
  when there is no worthwhile next-best-prompt.
- An optional next-best-prompts menu does not make the user the required owner.
  If the request is complete, use `✅ DONE — complete`.
- For a mixed state, name the owner of the blocking required action. If you can
  keep working without input, use the agent's `working` state and continue.

## Multi-agent routing (when more than one agent is in play)

When the user is orchestrating **multiple agents in one workspace** — e.g. a builder and an
independent reviewer, or two models split by role — a next-best-prompt is not just *what* to do
next but *who* should do it. Turn each option into a **routing directive**: prefix it with the
target agent, the model, and the effort/reasoning level, so the user can dispatch it without
deciding any of that themselves.

**Next-best-prompts** (reply with the number):

1. **[HIGH] → `<agent> · <model> · <effort>`** "copy-paste-ready prompt text" — one-line rationale
2. **[MED] → `<agent> · <model> · <effort>`** "copy-paste-ready prompt text" — one-line rationale

Routing rules:
- **Name three things** in the prefix: the target **agent** (who runs it), the **model**, and the
  **effort / reasoning level** (how hard to think). Pick the agent by role fit, the model by task,
  the effort by stakes. Use each target's own vocabulary (e.g. an "ultra"/max tier where it exists).
- **Choose, don't hedge.** One concrete target per option — the point is to remove a decision, not
  add one. If two agents could do it, pick the better fit and say why in the rationale.
- **Inert when solo.** If only one agent is active, omit the routing prefix and emit the plain menu
  above — this section changes nothing in single-agent sessions.
- The digit still selects the option; the prefix only tells the user where to send it.

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
