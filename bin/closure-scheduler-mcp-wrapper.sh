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

# Build-freshness guard. dist/ is gitignored (.gitignore:2), so merging a new
# rule version can never advance the build: on 2026-07-30 the 0.5.6 merge left
# the 22:06 0.5.5 dist in place, and cold connects kept serving 0.5.5 with no
# signal at all. Serving a stale rule silently is the failure this prevents —
# refuse to start instead, and name the one command that fixes it.
GENERATED="$DIR/dist/closure-scheduler.generated.js"
ENTRY="$DIR/dist/closure-scheduler-index.js"
RULE="$DIR/rule/closure-scheduler.md"

if [ ! -f "$ENTRY" ] || [ ! -f "$GENERATED" ]; then
  echo "[closure-scheduler-mcp] fatal: no build in $DIR/dist — run: npm --prefix \"$DIR\" run build" >&2
  exit 1
fi

# Compare only when both versions resolve. An unreadable rule file or a changed
# header format is not evidence of staleness, and must not block a build that is
# almost certainly fine.
RULE_VERSION="$(grep -m1 -o 'next_best_prompt v[0-9][0-9.]*' "$RULE" 2>/dev/null || true)"
BUILT_VERSION="$(grep -m1 -o 'next_best_prompt v[0-9][0-9.]*' "$GENERATED" 2>/dev/null || true)"
if [ -n "$RULE_VERSION" ] && [ -n "$BUILT_VERSION" ] && [ "$RULE_VERSION" != "$BUILT_VERSION" ]; then
  echo "[closure-scheduler-mcp] fatal: stale build — rule/closure-scheduler.md is ${RULE_VERSION##* }, dist/ serves ${BUILT_VERSION##* }." >&2
  echo "[closure-scheduler-mcp] dist/ is gitignored, so a merge never updates it — run: npm --prefix \"$DIR\" run build" >&2
  exit 1
fi

exec "$NODE_BIN" "$DIR/dist/closure-scheduler-index.js" "$@"
