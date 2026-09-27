# Handoff: after the hackathon build

The entry point for the next session, whether that's Hatim polishing the interface or an agent continuing the backlog. Written 2026-09-27 at 14:02 Casablanca, finalized 14:18, on branch `claude/bold-mayer-1lnkcv` (draft PR [Enhso/viva#6](https://github.com/Enhso/viva/pull/6)); updated at the end of the session with the final merges.

The session log with per-merge detail is `2026-09-27-1300-frontier-02-06.md`. Ticket 01 and decisions D1–D10 are in `2026-09-27-1148-ticket-01-fallback.md`.

## Start here

1. Read `CLAUDE.md` and `CONTEXT.md` (use the glossary's terms, and respect its `_Avoid_` list).
2. `git checkout claude/bold-mayer-1lnkcv && npm ci`. Then run `npm test`, `npm run typecheck` and `npm run build`; see "Final state" below for the expected counts.
3. Decide how PR #6 reaches `main`. It is large (tickets 02–19 plus 22–24, see the table), and every ticket inside it was merged and verified on its own. GitHub OAuth (ticket 23) can only be verified on the production alias, so that check happens after the merge.
4. The deployed preview of PR #6 was confirmed working by Hatim at the end of the session. Re-check with the commands under "Deploy" after any change to `api/` or `vercel.json`.

## What Viva is, in one paragraph

A student picks functions from their own JavaScript. For each function, a fixed rule engine produces candidate mutants: mechanical one-node rewrites such as `<` → `<=`. One model call (the filter call) picks the loaded mutants and names the misconception each one probes (the taxonomy label, Tier 2 and always provisional). Then execution does all the truth work:
- A shared battery of inputs, plus a bounded targeted search, finds distinguishing inputs.
- A mutant with none is dropped as equivalent.
- The answer key is the original's and the mutant's real outputs.

The student predicts the mutant's output for each beat and states a confidence. The report sorts the beats into four calibration buckets at a fixed 50%, with confidently-wrong as the headline, and shows the mean Brier score. No model ever decides what is correct: `src/engine/` and `src/grading/` cannot import `src/llm/`, and `src/architecture-boundary.test.ts` enforces it. Fallback mode runs everything without a model and is labelled wherever it appears.

## Code map

| Area | Files | Ticket |
| --- | --- | --- |
| Extraction and scope check | `src/engine/extract.ts` (`extractFunctions`, `scanFunctions`), `src/engine/scope.ts` | 02 |
| Complexity score (selection order) | `src/engine/complexity.ts` | 08 |
| Rule engine | `src/engine/mutate.ts` (ten rule families, `RULE_PRIORITY`, ids `fn:rule:start-end:ordinal`) | 03 |
| Sandbox | `src/engine/sandbox/` (Node `vm` runner for tests and the lab; Web Worker runner for the browser; shared `invocationBody` + `SANDBOX_PREAMBLE`: no network, seeded `Math.random`, fixed `Date.now`; a returned function is called 3× inside the sandbox) | 04, 17 |
| Output rendering and equality | `src/engine/outputs.ts` (`renderOutput` → structured `CanonicalRendering`, `sameOutput`), `src/engine/distinguish.ts` (`distinguishes`: a timeout never distinguishes) | 04, review fix |
| Battery, targeted search, equivalent drop | `src/engine/battery.ts`, `shapes.ts`, `targeted-search.ts` (fast-check, seed 20260927, 200 runs), `fallback.ts` (`findDistinguishingInputs`, `TIMEOUT_BUDGET` = 2) | 09 |
| Viva assembly | `src/engine/fallback.ts` (`runFallbackViva`), `src/engine/live.ts` (`runLiveViva`), `src/engine/pacing.ts` (K, M and the free-text weights, all provisional) | 01, 06, 16 |
| Multiple choice | `src/engine/multiple-choice.ts` (distractors are other candidates' real outputs), `src/engine/prng.ts` (app-side seeded PRNG) | 18 |
| Grading and report | `src/grading/read-prediction.ts` (acorn literal reader, `throws X`), `grade.ts` (Brier score on the exact confidence, buckets), `report.ts` (`buildReport`: buckets → label groups → connecting lines) | 10, 19 |
| Provider chain and filter call | `src/llm/providers.ts` (OpenRouter → Gemini → NVIDIA, reasoning off or low, 75 s per provider, one retry on 429/503), `filter.ts` (prompt build, strict response validation), `triage.ts` (over-threshold functions), `prompt-loader.ts` (reads from `process.cwd()`), `cache-key.ts` + `filter-cache-store.ts` (browser localStorage cache), `client.ts` | 06, 13, 14 |
| Serverless | `api/filter.ts` (also a `metaOnly` mode for cache keys); `api/health.ts`; `vercel.json` ships `prompts/{filter,triage}/**` with the function | 06, 13, 14 |
| UI | `src/ui/App.tsx` (reducer, `runViva` orchestration, per-function fallback labelling), `screens/{Selection,Beat,Reveal,Report}Screen.tsx`, `ConfidenceWidget.tsx` + `confidence.ts`, `ModeIndicator.tsx`, `Tier2.tsx`, `strings/` (registry + `en.ts`), `styles.css` (one stylesheet on CSS variables, no inline styles: D8a) | 01, 05, 08, 19 |
| Filter lab | `scripts/filter-lab.ts` (`npm run filter-lab -- [vNNN] [--compare vMMM] [--only <fixture>] [--provider <name>]`), results in `.scratch/filter-lab/<version>/`, cache in `.scratch/filter-lab/cache/`, rows appended to `logs/candidates.csv` | 11 |
| Prompts | `prompts/filter/v001`–`v004.md` (Hatim's), `_output-contract.md` (plumbing), `prompts/triage/` (agent-written; open to Hatim's overrule) | 07, 13 |

## Polishing the interface (for Hatim)

- **Styles:** everything is in `src/ui/styles.css`. Each ticket added its own clearly delimited block (selection screen 08, confidence widget 05, report 19, multiple choice 18). Colours and spacing come from CSS variables at the top. There are no inline styles, so all layout is in the stylesheet.
- **Copy:** every visible string is a key in `src/ui/strings/en.ts`, plus `fr.ts` if ticket 24 landed (see "Final state"). The `satisfies` clause in `strings/index.ts` fails typecheck when a registered language is missing a key.
- **Run locally:** `npm run dev`. `vite.config.ts` serves `api/*.ts`, so a live viva works locally with provider keys in your shell environment. Tick "Force fallback mode (demo switch)" to skip the 15–50 s live call while styling.
- **Placeholders that are yours to decide:**
  - `Tier2.tsx` is a dashed underline with a "pending ticket 21" title (ticket 21: the Tier 2 hedge treatment).
  - Pacing values in `src/engine/pacing.ts` (ticket 20): K = 2 beats per mutant, M = 3 mutants per function, free-text weights 0.8 on a mutant's first beat and 0.5 after.
  - The confidence legend buckets in `src/ui/confidence.ts` (ticket 05 Ruling): five buckets 20 points wide, with "no real belief either way" straddling 50.
- **Known UI rough edges:**
  - Inside a live viva, the report's "Unlabelled" group doesn't say its entries came from per-function fallback.
  - `SelectionScreen.tsx` adapts `DemoFixture` to `EligibleFunction` with `params: []`, a data clump from the standards review.
  - The bundle is about 590 kB (fast-check and acorn now run in the browser).

## Deploy

- **Vercel:** project `viva`, team `vnst1`. Provider keys, OAuth client id and secret, the Blob store, and a Protection Bypass secret are all set, per Hatim.
- **The session never managed to call a deployment.** First `*.vercel.app` was blocked; then Vercel Authentication redirected (302/401); the bypass secret arrived too late to reach the running session.
- **To check a preview:**
  ```
  P=https://viva-git-claude-bold-mayer-1lnkcv-vnst1.vercel.app
  H="x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET"
  curl -H "$H" $P/api/health
  curl -H "$H" -H 'content-type: application/json' -X POST -d '{"metaOnly":true}' $P/api/filter
  ```
  - The `metaOnly` call returns `available: true` and `promptVersion: "v004"` when `includeFiles` shipped the prompts. If it reports "the filter prompt hasn't been written yet", the prompts didn't ship.
  - Then run one real viva in the browser: the strip should read "Live, <provider> (<model>) chose…".
- **What was verified locally instead:** `api/filter.ts` was emitted with `tsc --module nodenext` into a directory with `"type": "module"` and called under plain Node, including a real provider call. That confirms the `.js` import specifiers and the `process.cwd()` prompt paths. Re-run this after touching `api/`:
  ```
  npx tsc api/filter.ts --outDir /tmp/x --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck --types node
  ```
  It must exit 0.
- **Demo insurance (ticket 14):** one successful live viva on the demo machine is cached in that browser's localStorage. A replay then shows "Cached" and makes zero provider calls. Only press "Clear cached filter responses" when you want fresh calls.

## Providers (details: `.scratch/providers.md`)

- **Order:** OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` (reasoning off) → Gemini `gemini-3.8-flash` (JSON mode, `thinkingLevel: low`) → NVIDIA `nvidia/nemotron-3-super-120b-a12b` (thinking off).
- **Latency** on a real three-function request (42 candidates, ~4.9k prompt tokens):
  - OpenRouter: 28–44 s.
  - Gemini: 13 s when it's up. It returned 503 "high demand" on 3 of 5 calls.
  - NVIDIA: 41–53 s. It has also returned 503 "overloaded".
- **With reasoning left on, every link timed out.** Model ids rotate, so list and probe; never hardcode from memory.
- **OpenRouter's free tier allows 50 requests a day.** The lab cache and the browser cache keep rehearsals cheap.
- **Filter quality (Hatim's call, ticket 12):** on the three-function request, v004 loaded 38 of 42 candidates via NVIDIA and 37 via OpenRouter, but only 5–6 via Gemini. The filter is permissive on the Nemotron models. `npm run filter-lab` compares versions.

## Backlog

**Hatim's decisions (`Type: hatim`):**
- 12, filter iteration: `/filter-lab`, starting from the permissiveness above.
- 20, loop pacing and weighting: the `pacing.ts` constants.
- 21, Tier 2 hedge treatment: `Tier2.tsx`.
- 26, Darija: register it in `strings/`, hidden from the picker until you say otherwise.
- Also yours to review: `prompts/triage/v001.md`, and the OAuth env var names (the code assumes `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`).

**Plumbing not started:**
- 15, candidate log from app vivas. The Blob store is connected and `BLOB_READ_WRITE_TOKEN` is set in Vercel and in the cloud environment. Use `@vercel/blob` from a serverless function. One row per candidate per live viva, same columns as `logs/candidates.csv`, `source=app`. A logging failure must never break a viva.
- 25, dynamic translation (after 24): taxonomy labels and report synthesis, into the selected language only.
- 27, disclosure draft (after 13, 15, 22, 23, 25). The facts it needs are recorded in the tickets:
  - triage threshold 20,000 tokens against the smallest window of 262,144 (ticket 13);
  - chain order and models (ticket 06);
  - which mechanism grouped the labels (ticket 22);
  - the OAuth scopes (ticket 23).

**Open review findings, not fixed:**
- `functionId` is the bare function name in the app but `fixture:name` in the lab. Two selected functions sharing a name would fail validation for every provider, and the viva would fall back, labelled.
- `src/grading/report.ts` imports `src/ui/strings`, so the boundary test only guards the direct import.
- `App.tsx` discards `Viva.drops`.
- The same filter request is built twice (`App.tsx`, `scripts/filter-lab.ts`).
- `live`/`cached` switches repeat across files.

**Known engine gaps:**
- `new Date()` without arguments reads the real clock (only `Date.now` is fixed).
- `Date` and `Map` compare as plain key bags.
- Functions nested inside a returned object still hit `DataCloneError` in the Worker.
- Shape inference is regex-based and falls back to "unknown" (ticket 09 Ruling).

**Explain-diff reports:** PRs #1–#5 were written this session and sent to Hatim as HTML files; they are not committed. PR #6's report was not written, to save credits. The brief is `.scratch/notes/explain-diff-brief.md`: run `/anthropic-skills:explain-diff-html` with it on PR #6 (range `5d47c72..<final head>`), once.

## How the work ran (for continuing it)

- **Tickets** live in `.scratch/viva/issues/NN-*.md`. Each has acceptance criteria, `**Status:**`, and `## Comments` with `Ruling:`, `Decision:` (Hatim's), `Fix:` and `Correction:` lines. Rulings from breakdown review are R1–R5; D1–D10 are Hatim's ticket-01 decisions.
- **Fan-out** used the `implement-spec` skill: `plumber` agents in isolated worktrees (`.claude/worktrees/`, gitignored), at most 3 at once, merged locally with `--no-ff`, verified (test, typecheck, build), then pushed from the session branch.
- **Two-axis reviews** (`/code-review`) ran twice:
  - on ticket 01: `.scratch/notes/2026-09-27-ticket-01-review.md`;
  - on the PR: findings summarized in the frontier handoff; fixes recorded as `Fix (orchestrator, final review of PR #6)` lines in tickets 04, 05, 08, 09 and 11.
- **Gotchas:**
  - The Playwright MCP browser is shared by every agent in a session.
  - `pkill -f` inside a Bash call matches its own command line and kills it.
  - `until pgrep -f x` waits forever for the same reason.
  - New cloud-environment secrets reach new sessions only.
  - `tsc -b` writes `tsconfig.tsbuildinfo` (it's gitignored).

## Final state (14:18 Casablanca)

- **Branch:** `claude/bold-mayer-1lnkcv`, pushed, 68 commits over `main` (`5d47c72`). [PR #6](https://github.com/Enhso/viva/pull/6) is marked ready for review.
- **Checks:** `npm ci` + `npm test` gives 35 files and 270 tests; `npm run typecheck` and `npm run build` exit 0.
- **Serverless functions:** `api/filter.ts`, `api/group-labels.ts`, `api/auth/start.ts` and `api/auth/callback.ts` each pass the `nodenext` ESM emit check.
- **Tickets done:** 01–11, 13, 14, 16–19 and 22–24.
- **Tickets open:**
  - Hatim's: 12, 20, 21, 26.
  - Plumbing: 15, 25, 27.
  - Ticket 23's last box: verify on the production alias after the merge.
- **What landed at the end:**
  - **22 (label grouping):** Jev → Gemini `gemini-embedding-001` (cosine ≥ 0.85, an untuned placeholder) → exact text. Served by `api/group-labels.ts`, called once before the report renders.
    - **Jev answered `401 authentication_error` on every call.** Check the TypeSafe key at `console.typesafe.ai/keys`. Until it's fixed, grouping runs on embeddings, and the real label pairs measured 0.64–0.79, so in practice nothing merges.
  - **23 (GitHub OAuth):**
    - `api/auth/start.ts` and `callback.ts` (callback at `/api/auth/callback`).
    - The token is held in `sessionStorage`; the code is in `src/github/`, and ingestion feeds the selection screen beside the demo corpus.
    - Env var names are assumed to be `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; confirm them.
    - **Security follow-up:** the OAuth `state` is sent but never verified, so there is no CSRF check (login CSRF). Fix: set a short-lived, signed HttpOnly cookie in `start.ts` and compare it in `callback.ts`.
    - The plumber reached its turn limit after finishing; the orchestrator committed its staged work (`4bac045`) after typecheck and tests passed.
  - **24 (English/French):**
    - A language picker on the selection screen; `fr.ts` is hand-translated, "beat" → "étape" (Ruling). A French spot check is welcome.
    - `da.ts` is registered and hidden: an English copy for ticket 26.
    - `parity.test.ts` covers the visible languages.
    - Fallback reasons are typed codes plus verbatim provider detail. Leftovers: `ProviderChainError`'s English preamble still reaches the `detail`, and the `metaOnly` reason is a bare string (never shown).
  - `outputs.test.ts` property tests now use the fixed seed.
- **Explain-diff reports:** PRs #1–#5 were sent to Hatim as files, not committed. They were checked with `html.parser` and `node --check`, and the scripts ran clean in jsdom, but nobody opened them in a real browser. Their "Defending it" sections disclose:
  - PR #1 merged with `tsc -b` failing on `node:*` types; PR #2 fixed it.
  - Vitest 5 needs Node ≥ 22.12, and nothing enforces it (consider `"engines"`, or an `.nvmrc` file).
  - The boundary test only catches direct imports.
  - The README and the GitHub repo description still say Viva "generates property-based tests" for students. It doesn't; property tests are internal engineering. Reword them before judging.

## Suggested skills

`verification-before-completion` before any done claim; `tdd` under `src/engine/` and `src/grading/`; `code-review` before merging PR #6; `anthropic-skills:explain-diff-html` for PR #6's report; `filter-lab` (Hatim) for ticket 12; `typesafe-ai` if touching Jev (ticket 22); `handoff` at the end.
