#!/usr/bin/env bash
# Wrapper that execs the closure_scheduler MCP server from this repo's own build.
# Mirrors next-best-prompt-mcp-wrapper.sh exactly; only the entrypoint differs.
#
# ⚠ Enable exactly ONE of next_best_prompt / closure_scheduler in a given MCP
# client. Both activate a complete behavioral rule, through full instructions
# or a required startup tool call.
set -e

# Avoid sourcing all of nvm on every MCP launch when its numeric default can be
# resolved directly. Fall back to nvm for aliases such as `node` or `lts/*`.
NODE_BIN=""
if [ -r "$HOME/.nvm/alias/default" ]; then
  IFS= read -r NVM_DEFAULT < "$HOME/.nvm/alias/default"
  case "$NVM_DEFAULT" in
    [2-9][0-9])
      for CANDIDATE in "$HOME"/.nvm/versions/node/v"$NVM_DEFAULT".*/bin/node; do
        if [ -x "$CANDIDATE" ]; then
          NODE_BIN="$CANDIDATE"
        fi
      done
      ;;
  esac
fi
if [ -z "$NODE_BIN" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  NODE_BIN="$(command -v node)"
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node)"
fi
DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")/.." && pwd)"
exec "$NODE_BIN" "$DIR/dist/closure-scheduler-index.js" "$@"
