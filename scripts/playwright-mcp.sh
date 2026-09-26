#!/usr/bin/env bash
# Launches Playwright MCP for Claude Code cloud sessions: headless, in-memory
# profile, pointed at the Chromium preinstalled under /opt/pw-browsers.
# Intended for the app's local dev server (localhost bypasses the egress proxy).
# stdout carries the MCP protocol, so this script prints nothing itself.
#
# Overrides (set as environment variables in the cloud environment):
#   PLAYWRIGHT_MCP_EXECUTABLE_PATH  explicit browser binary
#   PLAYWRIGHT_MCP_VERSION          pin @playwright/mcp if "latest" can't drive the preinstalled Chromium
set -uo pipefail

CHROME="${PLAYWRIGHT_MCP_EXECUTABLE_PATH:-}"
if [ -z "$CHROME" ] && [ -d /opt/pw-browsers ]; then
  CHROME="$(find /opt/pw-browsers -type f -name chrome -path '*chrome-linux*' 2>/dev/null | sort -V | tail -n 1)"
fi

ARGS=(--headless --isolated --no-sandbox --ignore-https-errors --browser chromium)
if [ -n "$CHROME" ]; then
  ARGS+=(--executable-path "$CHROME")
fi

exec npx -y "@playwright/mcp@${PLAYWRIGHT_MCP_VERSION:-latest}" "${ARGS[@]}" "$@"
