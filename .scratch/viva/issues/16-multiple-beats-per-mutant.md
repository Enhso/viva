# 16: Multiple beats per mutant, reveal after each

**What to build:** Each surviving mutant is asked over several of its distinguishing inputs, each its own beat. The student sees the mutated code and one input, predicts, states confidence, and gets an immediate reveal. Then comes the next input of the same mutant, and only after that the next mutant. Viva length is governed by two named constants: beats per mutant (K) and mutants per function (M). Both are placeholders until Hatim settles them in ticket 20; the selection screen's estimate reads the same constants.

**Blocked by:** 09

**Status:** done

**Type:** plumbing
**Spec:** 05 §1–2, 06 §4

- [x] Beats for one mutant run consecutively, with a reveal after every beat, never batched.
- [x] Prediction, actual output, confidence, grade, and format are recorded per beat, never collapsed per mutant.
- [x] A mutant with fewer distinguishing inputs than K asks as many as it has (`.slice(0, K)` on an answer key shorter than K just returns what's there).
- [x] K and M are named, single-sourced, and marked as placeholders pending ticket 20; the placeholder values chosen are recorded here (unchanged from ticket 08: `BEATS_PER_MUTANT = 2`, `MUTANTS_PER_FUNCTION = 3`, `src/engine/pacing.ts`).
- [x] The mutated code stays visible for every beat of its mutant.
- [x] Each beat's record carries what the report needs: prediction, actual output, confidence, format, mutant, function, and taxonomy label (live mode).
- [x] Works in fallback mode (the first output-changing mutant per function, up to K beats) and in live mode.

## Comments

Ruling: fallback caps the one mutant it finds to K beats (front of its answer key); it never
asks about M mutants (M is meaningless for fallback, which by design (03 §6) only ever surfaces
"the first output-changing mutant"). Live caps at M mutants, taken in the order the filter call
handed them back (loadedMutants' own order — the simplest defensible order available without
touching the hatim-owned filter/pacing work), and K beats per mutant, front of its answer key
(conforming/degenerate-first per battery.ts's ordering, so the earliest beats stay the easiest).
A mutant that turns out equivalent doesn't count against M — only mutants actually asked do.
Cost if wrong: Hatim (ticket 20) picks a different mutant order or a different beat-selection
rule within a mutant's answer key; both are a small, local change inside runLiveViva/
runFallbackViva, not a redesign.

Ruling: added `format: "free-text"` to `BeatResult` (`src/grading/grade.ts`), since the ticket
asks each beat's record to carry format and none existed yet. A one-value union
(`BeatFormat = "free-text"`) rather than a bare string, so ticket 18's `"multiple-choice"` is a
type-checked addition, not a magic string introduced later. Cost if wrong: trivial — one field,
one call site (`gradeBeat`).

## Answer

`runFallbackViva` and `runLiveViva` (`src/engine/fallback.ts`, `src/engine/live.ts`) now cap
beats at `BEATS_PER_MUTANT` (K) per mutant, and `runLiveViva` additionally caps at
`MUTANTS_PER_FUNCTION` (M) mutants asked per function; both constants stay single-sourced in
`src/engine/pacing.ts` (ticket 08, unchanged, still placeholders pending ticket 20). Beats of one
mutant are pushed consecutively before the loop moves to the next mutant, so the existing flat
`viva.beats` array and the UI's index-into-it (`src/ui/App.tsx`) already give a reveal after
every beat with no batching and no UI change needed. `BeatResult` (`src/grading/grade.ts`) gained
a `format` field (`"free-text"` for now) so ticket 18/19 have it to read. `fallback.test.ts` was
updated to assert K beats (2) instead of 1 for the one mutant it finds, keeping the D3b beat[0]
invariant (`sumRange(3, 3)`, mutant output 3, original output 0) and adding the same checks for
beat[1] (`sumRange(5, 5)`). New tests cover the K cap, the M cap, and mutant-beat consecutiveness
in `live.test.ts`, and the `format` field in `grading.test.ts`.
