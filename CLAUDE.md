# Viva

An oral-style exam generated from a student's own JavaScript. The answer key comes from running the code and its mutants, never from a model's opinion. Hackathon build; submission deadline 17:30 Casablanca time, 27 Sep 2026.

## Sources of truth

- `docs/spec/`: the approved design (brief + `00`–`10`, plus any dated addendum). Brainstorming and spec review are complete: work starts from the spec. Where brief and spec differ, the spec wins (`00-master.md` §0).
- `CONTEXT.md`: the glossary. Use its terms in code, tests, tickets, and UI copy.

## Ownership: `plumbing` and `hatim`

Every ticket carries `Type: plumbing` or `Type: hatim`.

- **hatim** work is Hatim's to decide live: the filter/checklist prompt (`03` §1–2, everything under `prompts/filter/v*.md`), question-loop pacing (`05`), the Tier 2 hedge treatment (`07` §4), and every item in `00-master.md` §4. For these, build the scaffolding, lay out the options with what each would make observable, and wait for his call. When he dictates a change, apply it verbatim.
- **plumbing** is everything else. Agents may finish it autonomously and record each judgment call as a `Ruling:` line in the ticket.

## Architecture guardrails

- Determinism handles truth: `src/engine/` and `src/grading/` run with no model involved. A test fails if anything under them imports from `src/llm/`, which keeps `09-disclosure.md` §3 true by construction.
- "complexity score" names `02`'s ordering. "information-theoretic" appears only for verified mutants (`03`, `07`).
- Fallback mode (`03` §6) is the tracer bullet: it works at every commit.
- Provider clients always call the provider, and add the auth header when the key's env var is set; with the key unset they call without it (in cloud sessions a proxy may inject credentials). Tested in `src/llm/filter.test.ts`.

Default layout, changeable by ticket: `src/engine/` (extract, mutate, battery, sandbox: DOM-free, runs in Node and browser) · `src/grading/` · `src/llm/` (provider chain, prompt loading, Jev) · `src/ui/` · `api/` (Vercel functions; GitHub OAuth callback is `/api/auth/callback`) · `fixtures/functions/` · `prompts/filter/`.

## Cloud session mechanics

- The SessionStart hook prints an environment check. If it reports any provider BLOCKED, say so to Hatim before other work.
- Push only the session branch. Subagent worktrees branch from local HEAD (`.claude/settings.json`) and merge locally.
- Handoffs go to `.scratch/handoffs/`, prototypes to `prototypes/<slug>/`, both committed.
- UI review: a Vercel preview per push. Throwaway experience prototypes publish as artifacts. OAuth works only on the production alias, so OAuth checks happen after a merge to `main`.

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

### Routing

- Bugs → `diagnosing-bugs`.
- Before claiming anything works, passes, or is done → `verification-before-completion`.
- `src/engine/` and `src/grading/` → `tdd`. UI code ships without tests.
- Filter iteration → Hatim runs `/filter-lab`; suggest it after any change to `prompts/filter/`.
- Jev → `typesafe-ai`, scoped to `07` label grouping unless Hatim widens it.

## Deviation protocol

When reality contradicts the spec, say "spec said X, Y happened, doing Z" and proceed. If Z touches brief §1 or a `hatim` area, ask first.
