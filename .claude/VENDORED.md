# Vendored skills

Cloud sessions load skills from this repo's `.claude/skills/`, not from marketplace plugins, so the subset this build uses is copied here. All three sources are MIT-licensed; license texts are in `.claude/vendor-licenses/`.

| Skill | Source | Invocation |
|---|---|---|
| to-tickets, implement-spec, implement, grill-me, handoff, retro, wait-what | mattpocock/skills (identical to upstream `main`, 26 Sep 2026, before patches) | typed only |
| tdd, code-review, prototype, grilling, domain-modeling, writing-for-agents, diagnosing-bugs, resolving-merge-conflicts, codebase-design | mattpocock/skills | model and typed |
| verification-before-completion | obra/superpowers | model and typed |
| typesafe-ai | typesafe-ai/skills | model and typed |
| filter-lab | written for Viva | typed only |

`codebase-design` is here because `tdd` calls it. Every `agents/openai.yaml` was dropped (Codex-only metadata).

## Patches

Each is marked `VIVA PATCH` in the file.

- **handoff**: saves to `.scratch/handoffs/` and commits, since a cloud VM's temp directory disappears when the VM is reclaimed.
- **implement-spec**: the session branch is the PR branch; implementers are the `plumber` agent; only `Type: plumbing` tickets are dispatched; at most 3 run at once; exploration notes go to `.scratch/notes/`.
- **prototype** (SKILL, LOGIC, UI): prototypes live in `prototypes/<slug>/` instead of a throwaway branch, since cloud sessions push only the session branch; logic demos publish as artifacts.
- **grilling**: for `Type: hatim` decisions, the ➡️ line lists what each option would make observable instead of recommending one.
- **retro**: notes that a cloud VM holds only the current session's transcript.

To remove a skill, delete its directory.
