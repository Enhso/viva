#!/usr/bin/env bash
# SubagentStop hook (.claude/settings.json): when a subagent stops (done, or at its turn limit)
# inside a worktree under .claude/worktrees/ with uncommitted work, commit it as WIP so the
# orchestrator can merge or inspect it. Ticket 23's plumber once stopped with everything staged.
input="$(cat)"
dir="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
case "$dir" in
  */.claude/worktrees/*) ;;
  *) exit 0 ;;
esac
if [ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]; then
  git -C "$dir" add -A && git -C "$dir" commit -q -m "WIP (auto-commit: subagent stopped with uncommitted work)" && echo "Auto-committed WIP in $dir"
fi
exit 0
