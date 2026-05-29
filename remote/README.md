# compass-mcp-remote

The **remote, always-on** version of [compass](https://github.com/danzimon-rgb/compass-mcp-server) —
the next-best-prompts end-of-turn rule served as a Model Context Protocol server
over **Streamable HTTP**, deployable to Vercel. Reachable by URL, independent of
any local machine.

Stateless, no secrets, no compute, no external calls — which is exactly why
compass (unlike council) is safe to expose on a public URL.

## Endpoint

```
https://<your-vercel-host>/api/mcp
```

Built with [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) in a
Next.js App Router route (`app/api/[transport]/route.ts`). The rule is carried
two ways: the MCP `instructions` field (auto-injected by clients that support
it) and an invocable `compass` prompt.

## Add to an MCP client

```jsonc
{
  "mcpServers": {
    "compass": { "url": "https://<your-vercel-host>/api/mcp" }
  }
}
```

Claude Code: `claude mcp add --transport http compass https://<your-vercel-host>/api/mcp`

## Local dev

```bash
npm install
npm run dev   # http://localhost:3000  → MCP at /api/mcp
```

## Deploy

Import this repo at [vercel.com/new](https://vercel.com/new) (framework
auto-detects as Next.js). No environment variables required. Every push to
`main` redeploys.

## License

Private repo. Not licensed for redistribution.
