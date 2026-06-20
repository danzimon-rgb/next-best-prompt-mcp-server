#!/usr/bin/env bash
# Wrapper that execs the next_best_prompt MCP server from this repo's own build.
# Used by WSL Claude Code and by Windows Claude Code / Claude Desktop via the
# wsl.exe bridge. No global install required, no secrets, no .env —
# next_best_prompt is pure guidance.
set -e
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
fi
DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")/.." && pwd)"
exec node "$DIR/dist/index.js" "$@"
