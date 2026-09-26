#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json). Its stdout becomes context for Claude,
# so it stays short and factual. Cloud-only; always exits 0 so it can't block a session.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "## Session environment check (scripts/session-start.sh)"
echo "- environment: ${CLAUDE_CODE_ENVIRONMENT_NAME:-UNSET: the custom 'viva' environment was probably not applied. Tell Hatim before other work.}"
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
for host in integrate.api.nvidia.com api.groq.com generativelanguage.googleapis.com openrouter.ai api.typesafe.ai; do
  echo "- $host: $(probe "$host")"
done

for key in NVIDIA_API_KEY GROQ_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY TYPESAFE_API_KEY; do
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
exit 0
