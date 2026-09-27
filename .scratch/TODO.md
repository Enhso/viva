# To-do for Hatim

What remains after the 2026-09-27 session, most urgent first. The context behind each item is in `.scratch/handoffs/2026-09-27-1402-post-hackathon.md`, and each ticket is at `.scratch/viva/issues/NN-*.md`.

## Before judging (deadline 17:30 Casablanca)

- [ ] **Merge PR #6.** Check that the new **CI** workflow (`.github/workflows/ci.yml`) is green on [Enhso/viva#6](https://github.com/Enhso/viva/pull/6), then merge to `main`. It is the first CI run this repo has had, so if it fails, the log says which of typecheck, test, build or `check:api` failed. If no `CI` check appears on the PR at all, enable GitHub Actions under the repo's Settings → Actions → General (right after the push at 14:45, only Vercel's check was listed).
- [ ] **Verify GitHub OAuth on the production alias** (ticket 23's last box; OAuth works nowhere else):
  - Run both flows: "Connect GitHub" (`public_repo`), then "Also include private repos" (`repo`).
  - Check public and private repo listing.
  - Run one viva from a real repo.
  - Confirm the env var names are `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; rename in `src/github/oauth.ts` otherwise.
- [ ] **Seed the demo cache.** Run one successful live viva on the demo machine's browser. A replay then shows "Cached" and makes zero provider calls if every provider is down. Don't press "Clear cached filter responses" after that.
- [ ] **Check Node on the demo laptop.** It must be at least 22.12 (`.nvmrc`; Vitest 5 needs it).
- [ ] **Reword the README and the GitHub repo description.** Both say Viva "generates property-based tests" for students. It doesn't; property tests are internal engineering.
- [ ] **Fix the TypeSafe key.** It returns `401 authentication_error` (`console.typesafe.ai/keys`). Until then, label grouping runs on Gemini embeddings, which merged nothing on real label pairs (0.64–0.79 against the 0.85 threshold).
- [ ] *Optional:* **Filter prompt (ticket 12).** On a real three-function request, v004 loaded 37–38 of 42 candidates via the Nemotron models but only 5–6 via Gemini. `npm run filter-lab` compares versions.

## One-time environment setup

- [ ] **Vercel connector:** authorize it for team `vnst1`, so sessions can read deployments and runtime logs.
- [ ] **Branch protection on `main`:** require the `CI / check` status.
- [ ] **Check the new hooks** on your next session. They were added this session and haven't run as hooks yet:
  - SessionStart: a "Provider probe" section (one tiny call per chain link plus a Jev auth check), and a "branch preview /api/health" line once `VERCEL_AUTOMATION_BYPASS_SECRET` is in the environment.
  - UserPromptSubmit: a `Clock:` line each turn. After the hackathon, set `VIVA_DEADLINE` for the next deadline, or leave it: past the deadline it prints only the time.
  - SubagentStop: auto-commits WIP in a subagent worktree that stopped with uncommitted work.
  - Set `VIVA_SKIP_PROVIDER_PROBE=1` in the environment if the probe's OpenRouter request per session start eats into the free tier (50 a day).

## Your decisions (`Type: hatim`)

- [ ] **12, filter iteration** (see above).
- [ ] **20, loop pacing and weighting:** the provisional constants in `src/engine/pacing.ts` (K = 2, M = 3, free-text weights 0.8 and 0.5).
- [ ] **21, Tier 2 hedge treatment:** `src/ui/Tier2.tsx` is a placeholder dashed underline.
- [ ] **26, Darija:** `src/ui/strings/da.ts` is an English copy, registered and hidden.
- [ ] **Review `prompts/triage/v001.md`:** it's agent-written (ticket 13) and shapes what the filter sees for oversized functions.
- [ ] **Spot-check the French** (`src/ui/strings/fr.ts`; "beat" became "étape").
- [ ] **Placeholders to confirm or change:**
  - the embedding threshold 0.85 (`src/llm/embedding.ts`);
  - the confidence legend buckets (`src/ui/confidence.ts`);
  - the triage threshold, 20,000 tokens (`src/llm/triage.ts`).

## Plumbing backlog (for an agent)

- [ ] **15, candidate log from app vivas.** The Blob store is connected, and `BLOB_READ_WRITE_TOKEN` is in Vercel and in the cloud environment.
- [ ] **25, dynamic translation**, then **27, the disclosure draft**. The facts 27 needs are already recorded in tickets 06, 13, 22 and 23.
- [ ] **OAuth `state` isn't verified (login CSRF).** Set a short-lived, signed HttpOnly cookie in `api/auth/start.ts` and compare it in `api/auth/callback.ts`.
- [ ] **`functionId` is the bare function name in the app.** Two selected functions with the same name would make every provider's response fail validation. Use `fixture:name`, as the lab does.
- [ ] **English leaks into French fallback reasons:** `ProviderChainError`'s English preamble reaches the fallback `detail`.
- [ ] **Unlabelled group:** in a live viva, the report's "Unlabelled" group doesn't say it came from per-function fallback.
- [ ] **Equivalent-mutant drops are discarded:** `Viva.drops` is thrown away in `App.tsx`.
- [ ] **Engine gaps:**
  - `new Date()` reads the real clock;
  - `Date` and `Map` compare as plain key bags;
  - functions nested in a returned object still hit `DataCloneError`.
- [ ] **Bundle is about 610 kB:** consider lazy-loading fast-check, which the targeted search uses.

## Reports

- [ ] **Explain-diff report for PR #6,** once, after its final state. Brief: `.scratch/notes/explain-diff-brief.md`. Command: `/anthropic-skills:explain-diff-html`. Range: `5d47c72..<final head>`.

## Retro follow-ups not applied

- [ ] **Barrel conflicts:** `src/engine/index.ts` and `src/llm/index.ts` conflicted on three merges. The convention "import new modules by path" is now in `.claude/agents/plumber.md`. A `merge=union` gitattribute would be the mechanical alternative, but it can garble multi-line export blocks, so it wasn't applied.
- [ ] **`CODING_STANDARDS.md` for the reviewer:** worth creating if review keeps finding the same judgement calls, such as glossary drift in UI copy.
