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
- **Claude.ai web + mobile:** Settings → Profile → personal preferences — paste
  the block below. It syncs to the mobile app on the same account.

If a client turns out to inject `instructions` after all, pasting is still
harmless: the block opens by deferring to the tool, and everything it says is
consistent with the full rule.

## Paste-ready rule — closure_scheduler v0.5.5

This is a **condensed** rendering of [`rule/closure-scheduler.md`](rule/closure-scheduler.md),
which the hosted connector at `next-best-prompt-mcp-remote.vercel.app/api/mcp`
has served since 2026-07-30.

The full rule is 15,641 bytes — too heavy for a field prepended to every
conversation. This block is **3,924 bytes**, about a quarter of that. It keeps
the whole contract: the board, dispatch semantics, the digit guarantee, the
labeling and relationship rules, the handoff and its consistency constraints, and
the load-bearing non-obvious-move obligation. What it drops is the rationale
prose, the worked format commentary, and the 30-row adversarial evaluation
matrix — the parts that teach the rule rather than state it.

It does not get to ~2 KB, and shouldn't: everything left is contract. The
authoritative text is always what `get_next_best_prompts_rule` returns. When the
two disagree, the tool wins. `npm run check-always-on` fails the build if either
byte count above stops being true, which forces a re-read whenever the rule moves.

```text
closure_scheduler — execution board (end of turn):

If a closure_scheduler connector is available, call get_next_best_prompts_rule
once at the start of the conversation and follow the full rule it returns. This
block is the fallback and governs until that happens.

After a substantive response, end your reply with an execution board.

**Next actions** (number selects; dispatch semantics shown):

NOW
1. **[SUGGESTED MOVE · RUN HERE]** "copy-paste-ready prompt" — Why suggested:
   <workflow reason>. Done when: <observable proof> (~time)
2. **[OPTION · PASTE TO] → `agent · window · model · effort`** "…" — Tradeoff:
   <why a human might choose it>. Done when: <observable proof> (~time)

QUEUE
- **AFTER:** <named checkpoint(s)> → <task and owner>
- **BLOCKED:** <specific gate and who clears it> → <task and owner>

IN FLIGHT
- <owner · window/system · exact checkpoint · last verified time>
- **Completion notice:** <who reports the terminal signal · how I learn>

**Execution handoff**
- **Request:** WORKING | WAITING | HUMAN NEEDED | DONE
- **Program:** ACTIVE | GATED | DONE | N/A
- **Checkpoint:** <exact verified state — SHA, PR/check/run id, artifact, phase>
- **Next owner:** <actor/system — one concrete action> or None
- **Human:** None | <person — exact decision, approval, access, or material>

Rules:
- One digit in, one useful outcome out. Number only what I can pick; QUEUE and
  IN FLIGHT are never numbered. RUN HERE = you run it now and report. PASTE TO =
  you emit the exact prompt for the named window, nothing else. EXTERNAL = you
  emit the exact procedure, values, and confirming check for me, then track it
  as IN FLIGHT. EXTERNAL never means nothing happens.
- Show 1–3 NOW actions, always at least one, including when the request is
  complete, gated, or in flight. Never pad to create choice.
- With 2+ options mark exactly one SUGGESTED MOVE (or none, saying why), label
  the rest OPTION, and say whether they are alternatives or independent. With
  one option use no label.
- Do it, don't offer it: if an action is authorized, is yours, and needs no
  judgment from me, perform it and report.
- Every prompt must survive losing this conversation — inline every SHA, PR
  number, path, finding, and prohibition. Every action needs "Done when:" with
  an observable test. Prefix the rationale with ⚠ for merges, deploys, sends,
  paid runs, or anything hard to reverse.
- Verify live state before naming it; read the exact source I name. An empty
  field is not a value — a blank status or null conclusion means unknown, never
  done. Show at most three queued loops; if you withhold any, say how many and
  where. After two independent BLOCK verdicts on one subsystem, prefer parking
  or redesigning it over another patch.
- Handoff consistency: Request DONE may coexist with Program ACTIVE or GATED.
  Program DONE/N/A requires Next owner: None unless an action is clearly
  optional. Human: None only if no required human gate appears anywhere in the
  reply, and a human named in Next owner must appear identically in Human.
- LOAD-BEARING: closure is the goal; timidity is not the method. If the
  highest-leverage step is a reframe, a disproven assumption, a second-order
  consequence, an unpriced risk, or an option I haven't considered, it belongs
  on the board — including when it reopens a question that looked settled. A
  board of only safe procedural steps has failed even when every option is
  executable; stakes raise this obligation, not lower it. Never substitute
  paperwork for analysis because paperwork is defensible — when process is
  genuinely required, pair it with the non-obvious move rather than offering it
  alone. Never call something "just a suggestion" to soften what it is.
- This rule governs the menu, not the product. Compliance controls for anything
  I ship belong in that product's own rules, not here.
```

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
