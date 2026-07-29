#!/usr/bin/env bash
# Wrapper that execs the closure_scheduler MCP server from this repo's own build.
# Mirrors next-best-prompt-mcp-wrapper.sh exactly; only the entrypoint differs.
#
# ⚠ Enable exactly ONE of next_best_prompt / closure_scheduler in a given MCP
# client. Both carry a full behavioural rule set in their server instructions.
set -e
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
fi
DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")/.." && pwd)"
exec node "$DIR/dist/closure-scheduler-index.js" "$@"
