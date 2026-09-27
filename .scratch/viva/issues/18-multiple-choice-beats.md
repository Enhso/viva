# 18: Multiple-choice beats

**What to build:** Some beats ask the student to pick from options instead of typing. The format is chosen per beat by weighted chance: a mutant's first beat favours free text (about 80/20), and later beats are closer to even (about 50/50). Both are named tunable constants that Hatim settles in ticket 20. The options are the correct output plus distractors: other candidate mutants' real outputs on the same input. Distractors are never invented and never model-proposed, so no option can be eliminated for looking made up. The correct option's position is shuffled by the app's own random source at render time; no model output ever places an option.

**Blocked by:** 10, 16

**Status:** done

**Type:** plumbing
**Spec:** 05 §3–4

- [x] The answer key records every candidate mutant's output on each distinguishing input, not only the surviving ones', so distractors exist to draw from.
- [x] Distractors are distinct from the correct output and from each other, under ticket 04's output equality.
- [x] Too few distinct distractors means fewer options; none at all means the beat falls back to free text. The option count is a Ruling here.
- [x] The position shuffle uses the app's own PRNG; a test over many renders shows the correct position spread uniformly.
- [x] The weighting constants are named, single-sourced, and marked tunable pending ticket 20.
- [x] Multiple-choice picks are graded with the same equality as free text (ticket 10), and each beat records its format.
- [x] Options render in the canonical output form.
- [x] Distractor selection, shuffle, and format choice are test-first.

## Comments

Note: other candidates' outputs on a distinguishing input often equal the original's output, which is never right on a distinguishing input. Spec 05 §4 is followed literally here; ticket 20 carries the design question this raises.

Ruling: distractor sourcing regenerates the full candidate list (`generateCandidateMutants(fn)`) inside `runLiveViva` itself, rather than threading an `allCandidates` parameter through from `App.tsx`'s orchestration. `fallback.ts` already had this list in scope (it iterates candidates directly); `live.ts` only had `loadedMutants` (the filter call's picks), which per this ticket's comments is not enough — distractors need *every* candidate, loaded or not. Regenerating is deterministic and cheap (no sandbox runs, just parsing) compared to the extra sandbox runs distractors themselves cost. Cost if wrong: a future caller that already has the candidate list in hand (e.g. ticket 11's filter-lab) does one redundant `generateCandidateMutants` call; trivial to thread through as a parameter later if that ever shows up as measurable cost.

Ruling: distractor sandbox runs are bounded by `MAX_DISTRACTOR_CANDIDATES_TRIED = 12` — the number of *other* candidates tried, not the number of distractors found — and short-circuit once `MAX_MULTIPLE_CHOICE_OPTIONS - 1` (3) distinct distractors are collected. Candidates are tried in the rule engine's own deterministic order (`mutate.ts`), so a function with many candidates costs at most 12 extra sandbox runs per multiple-choice beat, and computing distractors is skipped entirely for beats that land on free-text (the weighted draw happens first). Cost if wrong: a function whose first 12 candidates all happen to agree with the correct output yields zero distractors and that beat falls back to free-text even though a distractor exists further down the list — acceptable for a hackathon bound; raising the cap is a one-line change.

Ruling: multiple-choice option count isn't fixed by the spec (05 §4 only fixes where distractors come from and that position is shuffled), so `MAX_MULTIPLE_CHOICE_OPTIONS = 4` (correct + up to 3 distractors) is a plumbing default, not a hatim call — Hatim can retune it independently of the weighting constants next to K/M in `pacing.ts`.

Ruling: a beat whose correct output is a `"returnedFunction"` or `"timeout"` outcome is always forced to free-text, regardless of the weighted draw. Their canonical text ("a function" / "times out") isn't one of the literal shapes ticket 10's `readPrediction` reads back into that same `RunOutcome` kind — it falls through to a bare string — so a multiple-choice pick of the *correct* option there would be graded wrong by the very equality this ticket is required to reuse. Free text has no such gap. Cost if wrong: those two output kinds simply never appear as multiple-choice, which the spec never asked for; lifting the restriction would need `readPrediction`/`gradeBeat` (ticket 10's files) to accept a typed option directly instead of round-tripping through text.

Ruling: format/shuffle draws are seeded (`MULTIPLE_CHOICE_SEED` in `multiple-choice.ts`, mirroring `targeted-search.ts`'s fixed seed), not real per-viva randomness. This keeps a viva reproducible run-to-run and makes the uniformity tests deterministic, matching the existing pattern in this codebase (ticket 09's targeted search) and the context note that "a seeded PRNG in app code is fine." Cost if wrong: every viva of the same function draws the same format/shuffle sequence rather than varying viva to viva; ticket 20 can swap the seed for something viva-specific (e.g. derived from a session id) without touching the shuffle/format logic itself.

## Answer

Added `src/engine/prng.ts` (seeded mulberry32, distinct from the sandbox's own monkey-patched `Math.random`) and `src/engine/multiple-choice.ts`: `chooseBeatFormat` (weighted draw, forced free-text for function/timeout outputs), `collectDistractorOutputs` (bounded, deduplicated real candidate outputs), `shuffleOptions` (Fisher-Yates via the app's PRNG, null when no distractors), and `buildBeatsForMutant` (the shared per-mutant beat builder both `fallback.ts` and `live.ts` now call, replacing their old inline `.slice(...).map(...)`). `pacing.ts` gained `FIRST_BEAT_FREE_TEXT_WEIGHT` (0.8) and `LATER_BEAT_FREE_TEXT_WEIGHT` (0.5), provisional next to K/M. `Beat` (`types.ts`) gained `format: BeatFormat`, `options?: RunOutcome[]`, `correctOptionIndex?: number`; `BeatFormat` moved from `grading/grade.ts` (which now just re-exports it) to `engine/types.ts` so `Beat` itself can carry it without a grading→engine→grading cycle. `gradeBeat` now reads `beat.format` instead of a hardcoded `"free-text"` — no other change to its equality/reading logic, so multiple-choice picks are graded exactly the way free text already was (a picked option's canonical text is submitted as the prediction, same as typed text). `BeatScreen.tsx`'s prediction field renders `beat.options` as buttons (canonical text via `describeOutput`/`renderOutput`) when `format === "multiple-choice"`, otherwise the existing text input; `RevealScreen.tsx` needed no change (it already renders `result.prediction` generically). New tests: `src/engine/prng.test.ts`, `src/engine/multiple-choice.test.ts` (format draw incl. the function/timeout forcing rule, distractor bounding/dedup, shuffle uniformity over 6000 draws), plus format/MCQ-invariant tests added to `fallback.test.ts`, `live.test.ts`, and `grading.test.ts`.

Verification: `npx vitest run` — 25 files, 192 tests, all passing (including `src/architecture-boundary.test.ts`); `npx tsc -b` — clean.
