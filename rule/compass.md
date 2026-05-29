# compass — next-best-prompts at end of turn

`compass` points to the best next moves. After completing a substantive turn,
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
