#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json). Its stdout becomes context for Claude,
# so it stays short and factual. Cloud-only; always exits 0 so it can't block a session.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "## Session environment check (scripts/session-start.sh)"
echo "- session branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

probe() {
  # Blocked hosts come back as HTTP 403 from the egress proxy (x-deny-reason header /
  # "not in allowlist" body) or as a failed CONNECT tunnel, depending on the proxy.
  local out code
  out="$(curl -sS --max-time 6 -D - -o - "https://$1/" 2>&1 | head -c 2000)"
  code="$(printf '%s' "$out" | awk '/^HTTP\//{c=$2} END{print c}')"
  if printf '%s' "$out" | grep -qiE 'x-deny-reason|not in allowlist|host not allowed|tunnel failed.*403'; then
    echo "BLOCKED by network allowlist"
  elif [ -z "$code" ]; then
    echo "unreachable ($(printf '%s' "$out" | tr '\n' ' ' | head -c 80))"
  else
    echo "reachable (HTTP $code)"
  fi
}
for host in integrate.api.nvidia.com generativelanguage.googleapis.com openrouter.ai api.typesafe.ai; do
  echo "- $host: $(probe "$host")"
done

for key in NVIDIA_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY TYPESAFE_API_KEY; do
  if [ -n "${!key:-}" ]; then echo "- \$$key: set"; else echo "- \$$key: not set (fine only if stored as an API credential)"; fi
done

if [ -f package-lock.json ]; then
  if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
    if npm ci --no-audit --no-fund --loglevel=error >/tmp/viva-npm-ci.log 2>&1; then
      echo "- npm ci: ok"
    else
      echo "- npm ci: FAILED, see /tmp/viva-npm-ci.log"
    fi
  else
    echo "- dependencies: up to date"
  fi
elif [ -f package.json ]; then
  echo "- package.json without package-lock.json: run npm install and commit the lockfile"
else
  echo "- no package.json yet"
fi

# Model-level liveness: configured models + Jev auth (reachable hosts can still 401/404/time out).
# VIVA_SKIP_PROVIDER_PROBE=1 skips it (each run spends one free-tier OpenRouter request).
if [ -z "${VIVA_SKIP_PROVIDER_PROBE:-}" ] && [ -f scripts/probe-providers.ts ] && [ -d node_modules ]; then
  echo "### Provider probe (npm run probe:providers)"
  timeout 60 npx --no-install tsx scripts/probe-providers.ts 2>/dev/null || echo "- provider probe did not finish"
fi

# The branch's Vercel preview sits behind Vercel Authentication; the bypass header gets through.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ] && [ -n "$branch" ]; then
  slug="$(printf '%s' "$branch" | tr 'A-Z/_.' 'a-z---')"
  url="https://viva-git-${slug}-vnst1.vercel.app/api/health"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" "$url" 2>/dev/null)"
  echo "- branch preview /api/health: HTTP ${code:-none} (${url%/api/health})"
else
  echo "- branch preview: not checked (\$VERCEL_AUTOMATION_BYPASS_SECRET not set in this session)"
fi
exit 0
