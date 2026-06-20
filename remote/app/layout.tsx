export const metadata = {
  title: "next_best_prompt — remote MCP",
  description: "The next-best-prompts end-of-turn rule, served as a remote MCP server.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
