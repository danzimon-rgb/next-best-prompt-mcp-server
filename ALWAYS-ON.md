# always-on everywhere

These servers work by a client loading their rule. **Claude Code** auto-injects
the MCP `instructions` field (and you can add the SessionStart hook), so the rule
fires every turn with no extra setup.

**Claude Desktop, Claude.ai web, and the mobile app are assumed not to
auto-inject server instructions.** There, the server shows up as an on-demand
prompt and a `get_next_best_prompts_rule` tool, which fire only when invoked. To
get automatic every-turn behavior, give the client the rule once via a place it
injects into every conversation:

- **Claude Desktop:** Settings → Profile → "What personal preferences should
  Claude consider?" — paste the block below. (Or put it in a Project's custom
  instructions to scope it.)
- **Claude.ai web + mobile:** Settings → Profile → **Instructions for Claude** —
  paste the block below. It syncs to the mobile app on the same account.

## Paste-ready block — bootstrap plus fallback

```text
Next actions: at the start of a session, call the get_next_best_prompts_rule tool
from whichever connector provides it, and follow the rule it returns. It is the
single source of truth for how to present next actions. Never run another
next-action format alongside it.

If that tool is not available on this surface, say so in one line, then use this
fallback for every substantive reply:

End with 1-3 numbered actions I can select by digit — always at least one,
including when the request is complete, gated, or in flight. Never pad to create
choice. Mark each RUN HERE (you run it now and report), PASTE TO (you emit the
exact prompt for a named agent window, nothing else), or EXTERNAL (you emit the
exact procedure, values, and confirming check for me to do it myself; EXTERNAL
never means nothing happens). With two or more actions, mark exactly one
SUGGESTED MOVE, label the rest OPTION, and say whether they are alternatives or
independent; with one, use no label. Every action needs a one-line rationale and
a "Done when:" naming observable proof. Prefix the rationale with ⚠ for merges,
deploys, sends, paid runs, or anything hard to reverse. List blocked and
in-flight work separately and unnumbered, never as a numbered choice.

Then append:
**Execution handoff**
- **Request:** WORKING | WAITING | HUMAN NEEDED | DONE
- **Program:** ACTIVE | GATED | DONE | N/A
- **Checkpoint:** exact verified state - a SHA, PR/run id, artifact, or completed phase
- **Next owner:** actor/system and one concrete action, or None
- **Human:** None, or a person and the exact decision, approval, or access needed

Request DONE may coexist with Program ACTIVE or GATED. Human: None is valid only
if no required human gate appears anywhere in the reply.

When Program is DONE, lead with "**Loop closed — <objective> is complete; no
required work remains.**" and a following "**Proof:**" line naming observable
evidence. Do not use that acknowledgement while Program is ACTIVE or GATED.
After closure, NOW (optional) contains at most one action beginning "New optional
scope:". Reopen only for changed input, failed proof, or a genuinely new defect
class, and say "Loop reopened — <reason>".

Do not offer work you are already authorized to do — do it and report. If the
highest-leverage next step is a reframe, a disproven assumption, an unpriced
risk, or an option I have not considered, it belongs on the list, including when
it reopens something that looked settled. A list of only safe procedural steps
has failed even when every option is executable.
```

## Why this shape

Two parts, doing different jobs.

**The bootstrap** is the primary path. Since 2026-07-30 the hosted connector at
`next-best-prompt-mcp-remote.vercel.app/api/mcp` serves
[`rule/closure-scheduler.md`](rule/closure-scheduler.md) v0.5.7, so on any surface
where the connector is enabled the agent fetches the whole rule and this file's
copy never governs anything.

It names the **tool**, not the connector, and that is deliberate. Connector labels
are whatever you typed when adding them — the live claude.ai connector is labeled
`next-best-prompt` even though the server now identifies as `closure_scheduler`.
An instruction that says "call it from the closure_scheduler MCP" is a statement
about a name you control and may change; a stricter reading of it would conclude
the connector is absent and drop to the fallback for no reason. The tool name is
stable by design, so the bootstrap keys on that.

**The fallback** only covers surfaces where the tool is unavailable. That is why
it is short. The full rule is 17,270 bytes. This block is **2,559 bytes**.

It carries the contract rather than the reasoning: the board, dispatch semantics,
always at least one action, the labeling and relationship rules, `Done when:`,
the ⚠ prefix, the handoff and its consistency constraints, and the load-bearing
non-obvious-move obligation. Dropped: rationale prose, format commentary, and the
30-row adversarial evaluation matrix — the parts that teach the rule rather than
state it.

An earlier revision of this file carried a 3,924-byte fallback that tried to
reproduce the whole contract standalone. That was sized for a world where the
hosted surface still served the v0.3 incumbent. It doesn't, so the fallback stopped
being the primary path and the extra bytes stopped earning their place in a field
prepended to every conversation.

The authoritative text is always what `get_next_best_prompts_rule` returns. When
the two disagree, the tool wins. `npm run check-always-on` fails the build if
either byte count above stops being true, which forces a re-read whenever the rule
moves.

## If you are running the v0.3 incumbent instead

The stdio npm package `@danzimon/next-best-prompt-mcp` still serves the older
`next_best_prompt` rule, and its own paste-ready block — the ranked
`**Next-best-prompts**` menu with `[HIGH]/[MED]/[LOW]` tags — is preserved in git
history at `57460f6:ALWAYS-ON.md`. Retrieve it with:

```bash
git show 57460f6:ALWAYS-ON.md
```

Use one or the other. Both install a complete end-of-turn rule, and pasting both
puts contradictory guidance in one context.
