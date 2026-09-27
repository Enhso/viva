#!/usr/bin/env bash
# UserPromptSubmit hook (.claude/settings.json): stdout is added to context each turn, so the
# agent plans against the real clock instead of its own sense of elapsed time.
deadline="${VIVA_DEADLINE:-2026-09-27 17:30}"
now=$(TZ=Africa/Casablanca date +%s)
end=$(TZ=Africa/Casablanca date -d "$deadline" +%s 2>/dev/null || echo "$now")
left=$(( (end - now) / 60 ))
if [ "$left" -gt 0 ]; then
  echo "Clock: $(TZ=Africa/Casablanca date '+%Y-%m-%d %H:%M') Casablanca, $((left / 60))h$(printf '%02d' $((left % 60)))m to the $deadline deadline."
else
  echo "Clock: $(TZ=Africa/Casablanca date '+%Y-%m-%d %H:%M') Casablanca."
fi
