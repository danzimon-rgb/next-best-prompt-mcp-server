#!/usr/bin/env bash
# Wrapper that execs the closure_scheduler MCP server from this repo's own build.
# Uses a numeric-nvm fast path, then falls back to ordinary nvm/PATH resolution.
#
# ⚠ Enable exactly ONE of next_best_prompt / closure_scheduler in a given MCP
# client. Both activate a complete behavioral rule, through full instructions
# or a required startup tool call.
set -e

# Avoid sourcing all of nvm on every MCP launch when its numeric default can be
# resolved directly. Fall back to nvm for aliases such as `node` or `lts/*`.
NODE_BIN=""
WRAPPER_USER_HOME="${CLOSURE_WRAPPER_HOME:-$HOME}"
if [ -s "$WRAPPER_USER_HOME/.nvm/alias/default" ]; then
  IFS= read -r NVM_DEFAULT < "$WRAPPER_USER_HOME/.nvm/alias/default" || :
  case "$NVM_DEFAULT" in
    [2-9][0-9])
      NODE_BIN="$(
        compgen -G "$WRAPPER_USER_HOME/.nvm/versions/node/v$NVM_DEFAULT.*/bin/node" |
          sort -V |
          tail -n 1
      )"
      [ -x "$NODE_BIN" ] || NODE_BIN=""
      ;;
  esac
fi
if [ -z "$NODE_BIN" ] && [ -s "$WRAPPER_USER_HOME/.nvm/nvm.sh" ]; then
  source "$WRAPPER_USER_HOME/.nvm/nvm.sh"
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "closure-scheduler-mcp: node not found" >&2
  exit 127
fi
DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")/.." && pwd)"
exec "$NODE_BIN" "$DIR/dist/closure-scheduler-index.js" "$@"
