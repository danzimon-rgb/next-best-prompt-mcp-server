export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 660,
        margin: "4rem auto",
        padding: "0 1.25rem",
        lineHeight: 1.55,
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ marginBottom: "0.25rem" }}>closure_scheduler</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        v0.5.5 — the closure-scheduler end-of-turn rule, served as a remote MCP
        server.
      </p>
      <p>
        End a substantive turn with an execution board: 1–3 actions selectable by
        a single digit, each with explicit dispatch semantics (RUN HERE / PASTE
        TO / EXTERNAL), plus queued and in-flight work and a request/program
        handoff.
      </p>
      <h2 style={{ fontSize: "1rem", marginTop: "2rem" }}>MCP endpoint</h2>
      <pre
        style={{
          background: "#f5f5f5",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        <code>/api/mcp</code>
      </pre>
      <p>Add to any MCP client by URL (no install):</p>
      <pre
        style={{
          background: "#f5f5f5",
          padding: "0.75rem 1rem",
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        <code>{`{ "mcpServers": { "closure_scheduler": { "url": "https://<this-host>/api/mcp" } } }`}</code>
      </pre>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>
        The tool is named <code>get_next_best_prompts_rule</code>, unchanged from
        the v0.3 <code>next_best_prompt</code> rule this endpoint served until
        2026-07-30 — connectors added before then keep working, but now receive
        the v0.5.5 rule. Enable only one end-of-turn rule server per client.
      </p>
    </main>
  );
}
