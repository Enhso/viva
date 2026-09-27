# 09: Shared battery, targeted search, equivalent-mutant drop

**What to build:** Every mutant that reaches the student has at least one input verified by execution to make it behave differently from the original. Every mutant without one is dropped as an equivalent mutant before any beat is asked.
1. For each function, a shared battery is generated once from its parameters' shapes: boundary values, zero/negative/empty, and type edge cases. Shapes are inferred from JSDoc types, default values, and how the body uses each parameter.
2. Each mutant is tried against the shared battery first.
3. Only if nothing there distinguishes it does a targeted search run, perturbing around the mutated node or sweeping a larger deterministic range.

The answer key records the original's and the mutant's outputs on every distinguishing input found. Fallback mode's "first mutant that changes output" now draws on this.

**Blocked by:** 04

**Status:** done

**Type:** plumbing
**Spec:** 04 §1, 04 §3

- [x] Every bootcamp fixture gets a shared battery matched to its parameters (strings for `countVowels`, arrays of objects for `findUser`, a number pair for `sumRange`, and so on).
- [x] Input generation is deterministic: same function, same battery.
- [x] The targeted search runs only for mutants the shared battery didn't distinguish, and is bounded.
- [x] A mutant with no distinguishing input after both steps is dropped: it never reaches the question loop or the report, and the drop is recorded with a reason.
- [x] For each surviving mutant, the answer key holds its distinguishing inputs with both outputs.
- [x] Distinguishing inputs are ordered with type-conforming inputs before type edge cases, so a mutant's first beat asks about an input the function was written for.
- [x] Code comments state plainly that this drop runs after the filter call and is the final gate on whether a mutant is used.
- [x] Input generation is named and kept separate from the rule engine's candidate generation (04 §1 step 1).
- [ ] If the filter-lab harness (ticket 11) already exists, it now flags loaded-but-equivalent candidates. **Leftover:** ticket 11's `scripts/filter-lab.*` hadn't landed on this branch at the time of this work. `findDistinguishingInputs`/`sharedBattery` kept their exported names and signatures unchanged so ticket 11 can call them as before; `runLiveViva`/`runFallbackViva` now also return `Viva.drops: EquivalentDrop[]` (`{ mutant, reason }`) whenever a loaded/candidate mutant is dropped as equivalent, which the filter-lab harness can read to flag "loaded-but-equivalent" candidates once it lands. Orchestrator: please point ticket 11 at `Viva.drops` (or `findDistinguishingInputs` returning `[]`) for that flag.
- [x] Test-first; the fallback pipeline test stays green.

## Answer

Shipped shape-matched shared batteries, a bounded fast-check-powered targeted search, and the recorded equivalent-mutant drop, all test-first:
- `src/engine/shapes.ts` (+ `shapes.test.ts`): infers a `ParamShape` (`number`/`string`/`boolean`/`array<element>`/`object<fields>`/`unknown`) per parameter from JSDoc `@param` types, default values, then body-usage regexes (indexing + string methods, for-of + field access, array methods, arithmetic/comparison). Covers all twelve bootcamp fixtures, verified by a table-driven test per fixture.
- `src/engine/battery.ts` rewritten (+ `battery.test.ts`) to build each parameter's ordered value list from its shape (conforming values before edge cases) and cross-product them, with same-value tuples across all params pulled to the front regardless of shape count — preserving `sumRange(3, 3)` as the very first battery entry (D3b) without touching `fallback.test.ts`.
- `src/engine/targeted-search.ts` (+ `targeted-search.test.ts`): `targetedSearch(fn, mutant, shapes, runner)` runs `fc.check(fc.asyncProperty(...))` with a fixed seed (`TARGETED_SEARCH_SEED = 20260927`) and bounded run count (`TARGETED_SEARCH_RUNS = 200`) over shape-derived arbitraries; a counterexample to "original ≡ mutant" is returned as the distinguishing input (re-run once outside `fc.check` to get clean outputs), `null` when the budget is exhausted with none found.
- `src/engine/fallback.ts`'s `findDistinguishingInputs` now falls back to `targetedSearch` when the shared battery finds nothing, before reporting empty. `runFallbackViva`/`runLiveViva` now record each equivalent drop as `{ mutant, reason: EQUIVALENT_DROP_REASON }` in the new `Viva.drops` array (types.ts) instead of only silently `continue`-ing.
- `src/ui/App.tsx`'s hand-built `Viva` literal got `drops: []` added (typecheck-only fix; not a UI change) with a `TODO(ticket 09 -> UI)` pointing at surfacing per-mutant drop reasons once a report screen wants them — that surfacing is ticket 10's/UI's call, not built here.

Ruling: parameter-shape inference uses regex over the function's source text, not a full AST walk over acorn's tree — the signals needed (indexing, method calls, for-of + field access, comparisons/arithmetic) are all lexical and the existing fixtures only need shallow matching. Cost if wrong: an unusual body style could be misread as `unknown`, which only widens that parameter's generated values (numbers, strings, booleans) rather than mis-typing it outright — never silently narrows to the wrong shape.

Ruling: `EquivalentDrop`/`Viva.drops` is a new additive field on the shared `Viva` type rather than a side-channel return from `findDistinguishingInputs`, so that function's signature stays exactly as ticket 11 may already depend on it. Cost if wrong: if ticket 11's harness wants the drop reason from a bare `findDistinguishingInputs` call (function-level, no `Viva` in scope), it will need `EQUIVALENT_DROP_REASON` from `src/engine` (now exported) and can treat an empty return as that reason directly.

## Comments

Decision (Hatim, 2026-09-27): property-based testing joins the workflow, as proposed here. fast-check with a fixed seed powers step 3's targeted search, since a counterexample to the property "original ≡ mutant" is exactly a distinguishing input and exhausting the run budget is the equivalent-mutant evidence. Shrinking chooses the search's result only; it never reorders beats (it shrinks `sumRange`'s case to `(0, 1)`, which Hatim rejected as the first beat in favour of a degenerate boundary like `(3, 3)`). Engine laws in 03/04/10 (every candidate parses; output equality symmetric and key-order-blind; a prediction equal to the original's output never grades right) are natural property tests too.

Ruling (orchestrator, final review of PR #6): with timeouts no longer distinguishing (ticket 04 R3 fix), a non-terminating mutant would fall through to the 200-run targeted search and pay a full sandbox timeout per run (minutes in the browser). `findDistinguishingInputs` stops probing a mutant after `TIMEOUT_BUDGET` (2) timeouts and skips the targeted search when any timeout occurred; the mutant is then dropped with the equivalent-drop reason — cost if wrong: a mutant that loops on some inputs but differs on later ones loses those beats.
