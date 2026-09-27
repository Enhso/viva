# 11: Filter-lab harness

**What to build:** Hatim runs `/filter-lab` and gets a faithful run of the fixture corpus through the current filter prompt. The harness is built to the contract in the `filter-lab` skill's §2:
- extract functions and generate candidate mutants with the engine;
- call the filter through the llm layer, with the prompt text followed by the output contract;
- make one filter call per fixture;
- cache responses by prompt + contract + fixture source + model id, so a re-run spends calls only on what changed;
- run the scope check on the out-of-scope fixtures;
- write results per prompt version;
- append one row per candidate to the candidate log.

A provider failure ends the run and shows the error and host. Fallback mode stays out of the lab.

**Blocked by:** 02, 03, 06

**Status:** done

**Type:** plumbing
**Spec:** 03 §1–2, 03 §7, `filter-lab` skill §2 (the contract)

- [x] Runs as an npm script taking the arguments the skill lists (version, `--compare`, `--only`, `--provider`).
- [x] Every item of the skill's §2 contract is met.
- [x] A second run with nothing changed makes zero provider calls.
- [x] Whatever `checklist` fields a prompt asks for come through as columns with no code change.
- [x] With no filter prompt present, the harness makes no call and says the lab needs Hatim's first prompt.
- [x] If ticket 09 has landed, every candidate the filter marked loaded is distinguish-checked and the equivalent ones are flagged. If it hasn't, ticket 09 adds this when it lands.
- [x] Verified end to end with a test prompt kept outside the filter-prompt directory, including one real run against a provider that answers (provider and outcome recorded here). The filter-prompt directory is untouched.

## Answer

Built `scripts/filter-lab.ts`, run as `npm run filter-lab -- <args>` (`tsx`, added as a
devDependency — see Ruling below). It resolves the prompt (`vNNN`, `--compare vMMM` recorded
for the downstream table, `--only <fixture>`, `--provider <name>` to narrow the chain), extracts
functions and generates candidate mutants with `src/engine/`, sends one filter call per fixture
file through `runFilterCall` (`src/llm/`), caches each provider response at
`.scratch/filter-lab/cache/<sha256>.json` keyed by prompt+contract+fixture-source+model (checked
per chain link in order, so a re-run with nothing changed hits the first link's cache and makes
zero provider calls), runs `scanFunctions` over `fixtures/functions/out-of-scope/` and records
rejected/reason per file, distinguish-checks every `loaded` candidate with
`findDistinguishingInputs` + `sharedBattery` (ticket 09 hasn't landed; this is the interim
answer-key path the ticket allows) and flags equivalents, writes
`.scratch/filter-lab/<version>/results.json`, and appends one row per candidate to
`logs/candidates.csv` (created with the ticket-15 header since it didn't exist). With no
`prompts/filter/vNNN.md` present it prints that the lab needs Hatim's first prompt and returns
before touching any fixture or provider. `checklist` fields from the prompt pass through as a
free-form object in `results.json` (no per-field code), satisfying "no code change" for new
checklist keys.

Verified end to end with a throwaway prompt kept at
`/tmp/.../scratchpad/test-prompt.md` (outside `prompts/filter/`, confirmed untouched by `git
status` before/after): `npm run filter-lab -- --prompt-file <that path> --only sumRange
--provider gemini` made one real call to Gemini (`gemini-3.8-flash`), which answered — 5
candidates, 1 loaded (fencepost boundary error, non-equivalent, 19 distinguishing inputs), 4
rejected, `checklist.note` came through per-candidate. Re-running the identical command
completed in <1s with the cache hit and made no network call (verified by timing and by the
cache directory's file count staying at 1). An `--only sumRange --provider nvidia` attempt hit
NVIDIA's real 60s provider timeout twice in a row on this larger prompt (`openai/gpt-oss-20b` is
a reasoning model that spends its token budget on `reasoning_content` first per
`.scratch/providers.md`); the harness reported it correctly as a provider failure with the
model, host, and reason, then stopped — exactly the "provider failure ends the run" contract,
just not the "answers" half of the verification, which Gemini supplied instead. Cleaned up the
test-prompt's `results.json`, its one cache file, and the test rows from `logs/candidates.csv`
before committing, so only the header ships.

## Comments

- Ruling: added `tsx` as a devDependency and run the harness with it (`scripts/filter-lab.ts`,
  `npm run filter-lab -- ...`), rather than rewriting `src/`'s extension-less imports to satisfy
  Node 22's native type-stripping — `src/` is written for the vite/vitest resolvers and ticket 06
  already relies on that. Cost if wrong: swap the npm script's runner (`tsx` -> something else);
  nothing else here is tsx-specific.
- Ruling: added `loadFilterPromptVersion(version)` and `loadFilterPromptFile(path)` to
  `src/llm/prompt-loader.ts` (additive; `loadLatestFilterPrompt` untouched) so the harness can
  pin a version for `--compare`/`vNNN` runs and load a test prompt from outside
  `prompts/filter/` without ever writing there. Cost if wrong: two small unused exports.
- Ruling: cache lookup walks the (possibly `--provider`-narrowed) chain in order and returns on
  the first cache hit, rather than keying by "whichever model actually answered last time" up
  front — that keeps "zero provider calls on an unchanged re-run" true even though the cache key
  itself includes the model id (skill §2's literal wording), since the same chain order tries the
  same link first. Cost if wrong: if provider order ever changes between runs, a stale run could
  re-call a provider whose cache entry now sits behind a different link — acceptable for a lab
  tool re-run within one session.
- Ruling: `--prompt-file <path>` is an undocumented flag (not in the skill's argument-hint) used
  only to verify the harness against a prompt outside `prompts/filter/` without touching Hatim's
  directory. It's additive and harmless to leave in, but it's not part of the ticket's contract
  and Hatim never needs it.
- Ruling: added `scripts` to `tsconfig.json`'s `include` so `npm run typecheck` covers the
  harness too (it typechecked clean standalone with equivalent compiler flags before this; adding
  it to the shared config avoids drift). `tsc -b` and `vite build` both still pass unchanged.
- Left for later (not blocking, noted for whoever owns providers.ts / ticket 06): Node's built-in
  `fetch` doesn't read `HTTPS_PROXY` unless `NODE_USE_ENV_PROXY=1` is set (this session's
  `/root/.ccr/README.md`); without it every provider call in this sandbox times out after 60s
  with no proxy-specific error, which reads exactly like a real provider outage. Ran this
  session's own verification with `NODE_USE_ENV_PROXY=1` in the environment; didn't add it inside
  `src/llm/providers.ts` since that's ticket 06's file and the flag is a Node/session concern, not
  a provider-chain one.

Correction (orchestrator, at merge `da3cc78`): the `NODE_USE_ENV_PROXY` note above is a misdiagnosis. `NODE_OPTIONS` in this environment already routes Node's `fetch` through the proxy: the same harness reached Gemini, and the orchestrator's Node probes reached all three providers. The NVIDIA timeouts were `openai/gpt-oss-20b` reasoning past 60 s; `561f3ba` moved NVIDIA to `nemotron-3-super-120b-a12b` with thinking off. Post-merge smoke run: `npm run filter-lab -- --only sumRange` on v004 → 5 candidates, 3 loaded, 2 rejected, 0 loaded-but-equivalent (`0c330ef`).

Fix (orchestrator, final review of PR #6): the response cache is keyed on the whole request (every source and candidate id) instead of the fixture source alone, so a rule-engine change can't replay a response written for other ids; a candidate with no verdict in the response is written as `missing`, never `rejected`. Old cache entries removed. Re-run on v004 `--only sumRange` after the timeout fix (ticket 04 R3) and the new chain order: served by OpenRouter `nvidia/nemotron-3-super-120b-a12b:free`; 5 candidates, 4 loaded, 1 rejected, and the loop-bound "Infinite loop" mutant is now flagged loaded-but-equivalent (0 distinguishing inputs).
