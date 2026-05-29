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
      <h1 style={{ marginBottom: "0.25rem" }}>compass</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        next-best-prompts, served as a remote MCP server.
      </p>
      <p>
        End a substantive turn with 2–4 ranked, numbered, copy-paste-ready next
        moves the user can pick with one digit — and skip entirely when there is
        no high-value next step.
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
        <code>{`{ "mcpServers": { "compass": { "url": "https://<this-host>/api/mcp" } } }`}</code>
      </pre>
    </main>
  );
}
