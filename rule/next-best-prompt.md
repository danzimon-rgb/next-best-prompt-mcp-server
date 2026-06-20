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
