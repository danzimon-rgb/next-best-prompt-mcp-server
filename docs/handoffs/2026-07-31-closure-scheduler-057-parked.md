# closure_scheduler 0.5.7 — PARKED

Date: 2026-07-31
Author: Codex (implementation) / Claude Code (review + this note)
Reviewer: Claude Code, read-only
Branch: `agent/closure-scheduler-057-direct-read`
Base: `8822136` (`main`, closure_scheduler 0.5.6)
Implementation head: `ca7af47`
Status: **pushed, no PR, not merged, not deployed.** `main` stays on 0.5.6.

## Scope of 0.5.7

Tightens the existing no-courier rule without growing the served prompt. When an
in-scope agent result is readable, the current agent reads the named source
directly instead of asking the operator to paste or relay it. §3 rewritten, the
E30 matrix row rewritten, version bumped across every surface.

The served rule **shrinks**: 17,270 bytes vs 17,330 on `main`, a 60-byte
reduction. The commit adds its own regression guard,
`noGrowthBaselineBytes = 17_330` in `scripts/smoke-closure.mjs`, so the rule can
no longer grow past the 0.5.6 baseline without failing the smoke.

`npm test` exits 0 across all 8 steps: 16 closure-smoke checks, 26 validator
fixtures, 7 wrapper-guard checks. Version strings are consistent everywhere and
`check-sync` + `check-always-on` pass, so the generated copies and the
`17,270 bytes` figure in `ALWAYS-ON.md` are machine-verified rather than typed.

## Why it is parked — two independent reasons

### 1. BLOCK on `scripts/validate-closure-output.mjs` (review, 2026-07-31)

The rule change itself would pass review standing alone. The block is on the two
new validator checks, which are wrong in **both** directions on the exact
boundary the commit claims to test. Five read-only probes, run against this
worktree with `readableAgentResult: true` and
`directReadSourcePatterns: ["session c31ea6de"]`:

| Probe | Result | Verdict |
|---|---|---|
| "Session c31ea6de is the named source — I read it directly." | flags `E30_MISSING_DIRECT_READ` | false positive |
| "The **readable** agent result lives in session c31ea6de; Dan can summarize it for me." | clean | **miss — the flagship violation** |
| "**I** will fetch it and paste the result here." | flags `OPERATOR_COURIER` | false positive |
| "I read session c31ea6de directly… paste this prompt into the Codex window and it reports its findings back here" | flags `OPERATOR_COURIER` | false positive |
| "I read session c31ea6de, **but I will use whichever transcript is newest**." | clean | **miss — the E30 scenario** |

Root causes, each one line:

1. The direct-read regex (lines 228-232) requires the read verb **before** the
   source on one line, so a compliant read phrased in reverse is rejected.
2. `(?:read|inspect|refresh|check|open)\w*` matches the word `readable`, which
   the new rule text uses three times. An output can satisfy the direct-read
   requirement using the rule's own vocabulary while asking the operator to
   summarize.
3. The courier verb list is `bring|paste|relay` and misses `summarize`, `recap`,
   `tell me`.
4. The courier regex (lines 216-219) does not bind the subject, so the agent's
   own work and a legitimate `PASTE TO` dispatch of **new** work both flag.

The 26 fixtures pass only because each is phrased in the single shape the
regexes expect. `README.md:95-97` currently claims these checks "exercise the
direct-read/no-courier boundary," which probes 2 and 5 disprove.

**To clear:** bind the subject on the courier regex, make the direct-read check
order-independent and exclude `readable`, add `summarize|recap|tell me`, add
fixtures reproducing probes 2 and 5, soften the README claim, re-run `npm test`.

### 2. Surface parity — 0.5.7 is a two-surface release or it is not a release

The hosted Vercel endpoint serves 0.5.6, verified 9/9 byte-identical on
2026-07-30 23:38 EDT. `scripts/smoke-remote.mjs` asserts the endpoint returns
**this checkout's rule, byte for byte**. Merging 0.5.7 to `main` without
deploying `remote/` in the same sitting breaks that assertion and puts Claude
Code on 0.5.7 while claude.ai web and mobile stay on 0.5.6.

That is the split `scripts/embed.mjs:15-19` records as the hazard the 2026-07-30
release closed: "the split-brain the rule's own 'enable exactly ONE' note
forbids — split across surfaces instead of within one session."

**To clear:** bump stdio and deploy `remote/` together, then prove parity with
`npm run smoke:remote`.

## Merge-time note

The rule header moves to `v0.5.7`, so `main`'s gitignored `dist/` goes stale on
merge and `bin/closure-scheduler-mcp-wrapper.sh` will refuse to start the server
until `npm --prefix <repo> run build` runs. That is the build-freshness guard
(PR #14, `8822136`) doing its job. Its own test passes on this branch.

## The larger v0.6.0 question — decided, do not reopen without new input

A separate audit proposed cutting the 33-row adversarial matrix (3,513 bytes,
20% of the rule) into `test/`, plus smaller reductions, targeting ~13,800 bytes.
Two prism panels ruled on it.

**`a2700182`** — CONCERN P1, 74%. architecture 82%, hidden_assumption 72%,
premortem 72%, adversarial 72%, all CONCERN. Trimming to ~6 rows **dominates**
cutting all 33. Consolidated: the rows exist because the prose was insufficient
(Chesterton's fence); the fixture harness replays fixtures rather than observing
live agent behavior, so it cannot detect the regression a cut would cause; the
likely 6-9 month path is symptoms patched back into prose until the rule is
larger and more tangled than it started.

**`889913be`** — capital **BLOCK, 90%**; black_swan CONCERN, stood under
cross-examination; examiner `gap_found`. Capital: a 20% prompt-byte reduction is
roughly $0.01/turn, a ~300k-turn break-even, and "a critical misallocation of
the solo founder's time" at pre-seed against customer development. Black swan:
an 8-turn live parity check drawn from common traffic cannot exercise the six
retained adversarial rows, so it would return green without evidence.

**Ruling: v0.6.0 is parked entirely.** 0.5.6 stays in service. Reopen only on
new input, not on a fresh preference for a smaller file.
