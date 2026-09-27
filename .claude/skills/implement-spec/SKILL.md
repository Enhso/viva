---
name: implement-spec
description: "Implement a specification in code."
disable-model-invocation: true
---

You have been provided a spec. This spec should have tickets associated with it, describing how to implement the spec.

The goal is a PR which implements the entire spec on a single branch.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, tickets, research notes, and previous commits. Don't duplicate information already available via pointers.

**Implementer subagents** should be run in the background where possible for **maximum concurrency**.

## Steps

1. Read the spec and tickets. Read enough to understand the task graph.

2. (optional) Use an **exploration subagent** to conduct any exploration required by the tickets - relevant codebase files or external documentation. Ensure the exploration subagent can save files - it should save its markdown notes under `.scratch/notes/`, accessible by all future subagents. <!-- VIVA PATCH --> This lets **implementer subagents** focus on implementation rather than exploration.

3. Use the current session branch as the PR branch; open a draft PR from it if none exists, marked as closing the tickets. <!-- VIVA PATCH: cloud sessions can push only the session branch. -->

4. Use **implementer subagents** to implement each ticket: dispatch the `plumber` agent, which runs in its own worktree branched from local HEAD. Dispatch only `Type: plumbing` tickets; `Type: hatim` tickets wait for Hatim in the main session. Run at most 3 implementers at once: they share Hatim's rate limits. <!-- VIVA PATCH -->

5. Once an **implementer subagent** completes, run the **Spec** axis of `/code-review` on its branch's diff against the ticket (a reviewer subagent: least context pressure, so it holds the ticket's rules and rulings to the diff). Send real findings back to the implementer or fix them; then merge its work to the PR branch, verify (typecheck, test, build, `check:api`), and push. <!-- VIVA PATCH: per-ticket review; the end-of-PR review alone found a ruling broken three tickets earlier. -->

6. If this changes the **frontier** of available tickets, kick off more **implementer subagents** to work on the new tickets. This allows for maximum concurrency.

7. Once all tickets are complete, run /code-review on the PR branch. Fix all issues raised by the code review in a single **implementer subagent**.

8. Mark the PR as ready for review.

9. Clean up all **implementer subagent** worktrees.
