#!/usr/bin/env bash
# Wrapper that execs the next_best_prompt MCP server. Used by WSL Claude Code and by
# Windows Claude Code / Claude Desktop via the wsl.exe bridge.
#
# No secrets, no .env — next_best_prompt is a pure-guidance server.
set -e
# nvm-aware path resolution so the global `next-best-prompt-mcp-server` bin resolves
# under interactive, MCP-host, and Desktop-bridge spawns alike.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
fi
exec next-best-prompt-mcp-server "$@"
