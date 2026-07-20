# next_best_prompt — always-on everywhere

next_best_prompt works by a client loading its rule. **Claude Code** auto-injects the MCP
`instructions` field (and you can add the SessionStart hook), so the rule fires
every turn with no extra setup.

**Claude Desktop, Claude.ai web, and the mobile app do not auto-inject server
instructions.** There, next_best_prompt shows up as an on-demand `next_best_prompt` prompt and a
`get_next_best_prompts_rule` tool. To get the automatic every-turn behavior, give
the client the rule once via a place it injects into every conversation:

- **Claude Desktop:** Settings → Profile → "What personal preferences should
  Claude consider?" — paste the block below. (Or put it in a Project's custom
  instructions to scope it.)
- **Claude.ai web + mobile:** Settings → Profile → personal preferences — paste
  the block below. It syncs to the mobile app on the same account.

## Paste-ready rule

```
next_best_prompt — next-best-prompts (end of turn):
After a substantive turn (work shipped, a question answered in depth, a decision
reached, an artifact produced), end your reply with a short ranked menu of the
2–4 highest-leverage next moves I could make. Format it exactly:

**Next-best-prompts** (reply with the number):
1. **[HIGH]** "copy-paste-ready prompt text" — one-line rationale
2. **[MED]** "…" — …
3. **[LOW]** "…" — …

Rules: number each so I can reply with just the digit; tag [HIGH]/[MED]/[LOW] by
leverage, highest first; the quoted text is the actual prompt I'd send; one-line
rationale after an em-dash; 2–4 options, never more.
LOAD-BEARING: skip the section entirely when there's no high-value next move —
silence beats menu-padding. Never pad to a count; zero beats one fake option.

After every substantive response, append one scan-friendly handoff line:
**Chat label:** <state> · <2–6 word topic>
Choose exactly one state by who owns the next required action: 🔵 <AGENT> —
working (use your actual name; you will continue without me); 🟠 <USER> — response
needed (use my actual name; you genuinely need my answer, approval, choice, or
missing material); ⏸ EXTERNAL — waiting (CI, deploy, person, or outside system);
✅ DONE — complete (the request is satisfied). Put it after any menu or
deliberation handoff. An optional menu does not make me the required owner; if
the request is complete, use DONE.
```
