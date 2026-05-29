#!/usr/bin/env bash
# Wrapper that execs the compass MCP server. Used by WSL Claude Code and by
# Windows Claude Code / Claude Desktop via the wsl.exe bridge.
#
# No secrets, no .env — compass is a pure-guidance server.
set -e
# nvm-aware path resolution so the global `compass-mcp-server` bin resolves
# under interactive, MCP-host, and Desktop-bridge spawns alike.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
fi
exec compass-mcp-server "$@"
