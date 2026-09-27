# 13: Over-threshold triage call

**What to build:** When one function's raw candidate-mutant list would push the filter call past a concrete token threshold, a second, smaller model call runs first and picks which of that function's candidates survive the shrink. The threshold is a named constant, sized to the smallest context window in the provider chain with margin. A deliberately branchy stress fixture trips it. That fixture is kept outside the bootcamp corpus, so the lab's corpus is unchanged. The path is exercised at least once against a real provider before demo day, so it isn't a first-time-live surprise.

**Blocked by:** 03, 06

**Status:** done

**Type:** plumbing
**Spec:** 03 §4–5

- [x] The filter call's prompt size is estimated in tokens; the threshold's number and how it was derived are recorded here (the disclosure quotes both).
- [x] Only over-threshold functions go through triage; the others are untouched.
- [x] A triage failure is treated like a filter-call failure: the chain moves on, and total failure runs the viva in fallback mode. No mechanical truncation exists anywhere (03 §4 rejected it).
- [x] The triage prompt is its own versioned file, separate from Hatim's filter prompts, and marked as agent-authored and open to Hatim's overrule.
- [x] The stress fixture trips the threshold in a test.
- [x] Whether triage fired is recorded per viva, for the disclosure and the candidate log.
- [x] One real run's outcome is recorded here: fired yes/no, provider, candidates in and out.

## Comments

Note: 03 §4 sits outside the `hatim` list, so the triage prompt is plumbing. It still shapes which candidate mutants the filter call ever sees; point Hatim at it when it lands.

**Flag for Hatim:** `prompts/triage/v001.md` (agent-authored, see `prompts/triage/README.md`) is the wording that decides which candidates an over-threshold function's shrink keeps, before your filter/checklist prompt ever sees them. It's plumbing by `CLAUDE.md`'s ownership split, but it still shapes what the filter call sees — please read it and either bless it or dictate a replacement; verbatim on any change, same as `prompts/filter/`.

### Threshold: number and derivation

**`TRIAGE_TOKEN_THRESHOLD = 20_000`** estimated tokens for one function's own block (source +
docstring + candidates, as embedded in the main prompt — `src/llm/triage.ts`).

Derivation:
- Smallest context window in the provider chain: **262,144 tokens**, `nvidia/nemotron-3-super-120b-a12b` — the model behind *both* the NVIDIA and OpenRouter links (`src/llm/providers.ts`). Confirmed live on 2026-09-27: NVIDIA's own `GET /v1/models` doesn't expose context length, but OpenRouter's listing for the identical model id (`nvidia/nemotron-3-super-120b-a12b` / `:free`) reports `context_length: 262144` both times. Gemini's `gemini-3.8-flash` reports `inputTokenLimit: 1048576` (`GET /v1beta/models/gemini-3.8-flash`) — well above nemotron's, so it isn't the binding constraint.
- Margin: reserve the large majority of that window for everything a single function's own block doesn't cover — the prompt prose + output contract (~1-2k tokens, measured), every *other* selected function's own block (N is student-set with no cap, `02` §3), the model's completion budget, and slack in the token estimator below (it's a heuristic, not an exact count). Concretely: no single function's block may cost more than ~7.6% of the smallest window. 262,144 / 13 ≈ 20,165, rounded down to a clean **20,000**.
- Token estimate: `estimateTokens(text) = Math.ceil(text.length / 4)`, chars/4 — matches the measured ratio on a real filter-call payload (`.scratch/providers.md`, 2026-09-27: a three-function/42-candidate request was ~19.6k chars ↔ ~4.9k prompt tokens ≈ 4.0 chars/token). Applied to `JSON.stringify()` of exactly the per-function block `buildFilterPrompt` sends (`estimateFunctionTokens`).

Disclosure framing (09-disclosure.md §3): "one LLM call per viva, plus a rare second triage call only when a single function's raw candidate list exceeds 20,000 estimated tokens."

Ruling: the check is per-function, not over the whole request's total size — matching 03 §4's wording ("a single function's raw candidate list is large enough to push the main call past a context-size threshold") and the checklist's "only over-threshold functions go through triage." A viva selecting many merely-average-sized functions can still, in principle, exceed a real context window in total; that's the accepted risk 03 §3 already named for the uncapped main call, and this ticket doesn't re-litigate it. Cost if wrong: a pathological many-function viva could still blow a context window with no single function tripping triage; 03 §3 already calls that an accepted risk, not this ticket's job to close.

Ruling: `runFilterCallWithTriage` (`src/llm/triage.ts`) is a new orchestrator that wraps `runFilterCall`, not a change to `runFilterCall` itself — `api/filter.ts` calls the wrapper; `scripts/filter-lab.ts` (ticket 11) still calls `runFilterCall` directly and keeps working unchanged (verified: full suite green, no filter-lab file touched). Follow-up, not done here: `/filter-lab` doesn't yet exercise the triage path, so Hatim can't rehearse it from the lab — flagging for a later ticket if he wants that.

Ruling: a triage call's contract only asks the model to pick surviving candidate ids (`prompts/triage/_output-contract.md`: `{ "surviving_candidate_ids": [...] }`) — no labeling. Labeling still happens once in the main filter call, on whatever the triage call kept, so no mutant is ever labeled by two different calls. Cost if wrong: the triage call reads candidates without their rule/diff framing being judged against a checklist yet; if that turns out to over/under-shrink, a Tier-2-style checklist could be added to the triage contract later.

Ruling: an over-threshold function whose triage call is answered with zero survivors is allowed through as-is (empty candidate list into the main call) — a legitimate model judgment, not an error. 03 §4 rejected mechanical truncation, not a model genuinely finding nothing worth keeping. Cost if wrong: a stingy triage model could occasionally drop every candidate for a branchy function, silently costing it any beats it would have contributed; not naming a floor keeps the code honest about what actually happened.

Ruling: the cache key (ticket 14, `src/llm/cache-key.ts`) now also hashes the triage prompt's text (`FilterCacheMeta.triagePromptHash`, `null` when no triage prompt exists) — a request that's byte-identical from the browser's side can still be judged differently after `prompts/triage/vNNN.md` is edited, since triage runs server-side on data the browser already sent. `api/filter.ts`'s `buildCacheMeta` computes it the same way it computes `promptHash`/`contractHash`. Existing cache-key tests (ticket 14) still pass unchanged; two new ones cover the triage-hash dimension (`src/llm/cache-key.test.ts`).

Ruling: "whether triage fired" is carried on `FilterApiResponse.triage: { fired, functions: [{functionId, provider, model, candidatesIn, candidatesOut}] }`, present on both the "live" and "fallback" response shapes (`src/llm/types.ts`). Nothing in the UI reads it yet — `App.tsx`, `ModeIndicator.tsx`, and the "candidate log" mentioned in `03` §7 don't currently exist as a live-viva writer (only `scripts/filter-lab.ts`'s own `logs/candidates.csv`, a separate harness-only log, does). Flagging as a follow-up for whichever ticket builds the live candidate log / disclosure page: the data is on the wire, ready to log or display, nothing more was built per this ticket's "don't over-invest" note and CLAUDE.md's UI-ships-without-tests scope.

### Stress fixture

`fixtures/triage-stress/scoreWithBands.js` — a deliberately branchy score-adjustment function (30
range-check `if` statements over two parameters), kept outside `fixtures/functions/bootcamp/`
*and* `fixtures/functions/own/` (both are `/filter-lab`'s corpus — `scripts/filter-lab.ts` only
reads `bootcamp/` and `own/`, so this whole new top-level directory is what keeps the lab's corpus
unchanged, not just avoiding `bootcamp/` alone). It generates 331 raw candidate mutants, estimating
to ~23.1k tokens — over the 20,000-token threshold with a comfortable margin, so the test isn't
sitting exactly on the boundary. Covered by `src/llm/triage.test.ts`'s
"the real stress fixture" test (uses the actual rule engine via `generateCandidateMutants`, not a
hand-built candidate list).

### Verification

`npx vitest run`: 25 files, 201 tests pass (adds `src/llm/triage.test.ts`, 18 tests; extends
`src/llm/cache-key.test.ts` with 2), including the pre-existing `architecture-boundary.test.ts`
(untouched, still green). `npx tsc -b --noEmit`: clean. `npx tsc api/filter.ts --outDir <scratch>
--module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck --types node`: exit
0 (relative imports in the new runtime import graph — `api/filter.ts` → `src/llm/triage.js` →
`src/llm/{filter,providers}.js` — all carry `.js`, per ticket 06's packaging Ruling).

### One real run (2026-09-27, ~13:48)

Ran `runFilterCallWithTriage` directly (not through `vercel dev`, per this ticket's mechanics
note) against `fixtures/triage-stress/scoreWithBands.js`'s 331 real candidates, the real
`prompts/filter/v004.md` + `prompts/triage/v001.md`, and the real `PROVIDER_CHAIN`:

- **Triage fired: yes.** NVIDIA's triage call for `scoreWithBands` failed over to the next link
  (chain moved on, as designed); **Gemini** (`gemini-3.8-flash`) served the triage call and shrank
  331 candidates in → **15** out.
- The main filter call then ran on the shrunk request (that one function now carrying only 15
  candidates) and was served by **NVIDIA** (`nvidia/nemotron-3-super-120b-a12b`): **13 loaded**,
  **2 rejected** — accounting for all 15 survivors.

This is the exact "rare path exercised before demo day" the ticket asks for: a real over-threshold
function, a real triage call, a real shrink, a real main call on the result, with the chain's
move-on-failure behavior exercised for real (NVIDIA failed the triage sub-call, Gemini answered).

## Answer

Built the over-threshold triage call as a wrapper around the existing filter call, not a change
to it: `src/llm/triage.ts` exports `TRIAGE_TOKEN_THRESHOLD` (20,000 estimated tokens, derived
above), `estimateTokens`/`estimateFunctionTokens` (a chars/4 heuristic against exactly the
per-function JSON block `buildFilterPrompt` sends), `functionsOverThreshold` (per-function check,
leaves everything else untouched), `buildTriagePrompt`/`parseTriageResponse` (mirroring
`filter.ts`'s shape but for one function and a narrower "which ids survive" contract), and
`runFilterCallWithTriage`: for each over-threshold function, runs a triage call through the same
provider chain with the same move-on-failure semantics as `runFilterCall` (throwing
`ProviderChainError` — reused, not a new error type — when a function's triage exhausts the chain,
or when triage is needed but no triage prompt exists on disk), shrinks that function's candidate
list to the survivors, then runs the ordinary `runFilterCall` on the resulting request. Added
`prompts/triage/` (`README.md`, agent-authored `v001.md`, `_output-contract.md`) as its own
directory outside Hatim's `prompts/filter/`, and `src/llm/prompt-loader.ts` grew
`loadLatestTriagePrompt()` alongside the existing filter-prompt loaders (same "load, never write"
contract, over a different directory and its own contract file). `api/filter.ts` now calls
`runFilterCallWithTriage` instead of `runFilterCall` directly, loads the triage prompt the same way
it loads the filter prompt, and its cache-meta builder (ticket 14) now also hashes the triage
prompt's text so an edit to it invalidates a stale cache hit
(`FilterCacheMeta.triagePromptHash`, `src/llm/cache-key.ts`). `FilterApiResponse` gained an
additive, optional `triage: { fired, functions: [...] }` field (present on both live and fallback
shapes) recording whether triage fired, and per function: which provider/model triaged it and
candidates in/out — ready for a future disclosure page or live candidate-log writer to read; none
exists yet to wire it into (flagged above). Added the stress fixture
(`fixtures/triage-stress/scoreWithBands.js`, 331 real candidates, ~23.1k estimated tokens) in a
new top-level directory so `/filter-lab`'s corpus (`bootcamp/` + `own/`) is unchanged. Verified
with the full offline test suite (25 files, 201 tests, including a real-fixture test that runs the
actual rule engine and checks it trips the threshold), a clean `tsc -b --noEmit`, a clean
Vercel-packaging `tsc` emit check, and one real, unmocked end-to-end run against the live provider
chain (see above): triage fired, NVIDIA failed over to Gemini for the triage call (331 → 15
candidates), and the main call was then served by NVIDIA (13 loaded, 2 rejected) — no mocked
response stood in for a real call at any point.
