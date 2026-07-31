# next-best-prompt-mcp-remote

The **remote, always-on** transport of
[next-best-prompt-mcp-server](https://github.com/danzimon-rgb/next-best-prompt-mcp-server) —
served as a Model Context Protocol server over **Streamable HTTP**, deployable to
Vercel. Reachable by URL, independent of any local machine.

Stateless, no secrets, no compute, no external calls — which is exactly why this
server (unlike council) is safe to expose on a public URL.

## What it serves

**`closure_scheduler` v0.5.7**, byte-identical with the stdio candidate in
`src/closure-scheduler-index.ts`. Until 2026-07-30 this endpoint served the v0.3
`next_best_prompt` incumbent instead; see the repository README for why that
changed.

The Vercel project keeps its original name and the tool keeps the incumbent's
name (`get_next_best_prompts_rule`), so connectors added before the switch
continue to work untouched — but they now receive a different rule.

## Endpoint

```text
https://<your-vercel-host>/api/mcp
```

Built with [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) in a
Next.js App Router route (`app/api/[transport]/route.ts`). The MCP `instructions`
field carries a compact bootstrap (auto-injected by clients that support it) that
requires one `get_next_best_prompts_rule` call; that call, and the invocable
`closure_scheduler` prompt, return the full rule. The rule text is never
duplicated into startup context.

## Add to an MCP client

```jsonc
{
  "mcpServers": {
    "closure_scheduler": { "url": "https://<your-vercel-host>/api/mcp" }
  }
}
```

Claude Code: `claude mcp add --transport http closure_scheduler https://<your-vercel-host>/api/mcp`

⚠ Enable exactly **one** end-of-turn rule server per client. This one and the
stdio `next_best_prompt` incumbent both install a complete behavioral rule;
loading both puts contradictory guidance in one context.

## Local dev

```bash
npm install
npm run dev   # http://localhost:3000  → MCP at /api/mcp
```

Verify what a running host actually serves, from the repository root:

```bash
npm run smoke:remote -- http://localhost:3000/api/mcp
```

## Deploy

Import this repo at [vercel.com/new](https://vercel.com/new) (framework
auto-detects as Next.js). No environment variables required. Every push to
`main` redeploys.

## License

Private repo. Not licensed for redistribution.
