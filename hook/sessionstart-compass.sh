#!/usr/bin/env bash
# Claude Code SessionStart hook — prints the compass (next-best-prompts) rule
# to stdout so it is injected into context at the start of every session.
#
# This is the "hard loading" path: the harness runs this every session
# regardless of whether the MCP client surfaces server instructions. Wire it
# in settings.json under hooks.SessionStart (see README for both the WSL-native
# and Windows wsl.exe-bridge command forms).
# Resolve the rule relative to this script, so it works wherever the repo lives.
cat "$(dirname "$0")/../rule/compass.md"
