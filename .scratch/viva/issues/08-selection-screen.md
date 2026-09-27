# 08: Selection screen

**What to build:** After loading a source, the student sees every eligible function in one list, highest complexity score first. Each function is a card with its signature, its docstring or the muted "no docstring provided", and its complexity score, shown plainly enough that the ordering reads as a visible rule. The student sets N, how many functions this viva covers; the cutoff is simply where N falls in the ordered list. A help box beside the N control explains the tradeoff in plain terms: both dials that set viva length (N, and beats per mutant), with an estimated beat count for the current settings. Starting the viva hands the selected functions to the pipeline in complexity-score order.

**Blocked by:** 02

**Status:** done

**Type:** plumbing
**Spec:** 02 §1–4, 01 §6, 05 §2

- [x] The complexity score is computed from the syntax tree with no model call, and is called "complexity score" in code, copy, and names. "Information-theoretic" appears nowhere in this screen or its code.
- [x] Ordering is by complexity score descending, with deterministic tie-breaks.
- [x] N is student-set with a sensible default, bounded by the eligible-function count.
- [x] No "highlighted top N / greyed rest" split; the cutoff is legible from the list itself.
- [x] The help box names both dials and shows an estimated beat count derived from the same constants the question loop uses (beats per mutant and mutants per function, from ticket 16), so they cannot drift apart.
- [x] Out-of-scope files and functions stay visible with their reasons, separate from the eligible list.
- [x] All copy comes from the string table.
- [x] The complexity score computation is test-first.
- [x] Optional, only if cheap: leaf-first (no calls to other user-defined functions) as a secondary tiebreaker (02 §2).

## Answer

Built `src/engine/complexity.ts` (test-first, `complexity.test.ts`): `complexityScore(source)` is a cyclomatic-style count (base path 1, +1 per if/loop/ternary/catch/switch-case/short-circuit `&&`/`||`) computed from the acorn AST alone, no model call. `orderByComplexity(fns)` sorts descending by score, then leaf-first (no call to another known eligible function, self-recursion excluded), then by name — fully deterministic. Both are exported from `src/engine/index.ts`.

Replaced `StartScreen.tsx` with `SelectionScreen.tsx`: every eligible function renders as a card (signature, docstring-or-muted-placeholder, numeric complexity score) in that order; a range input sets N (default `min(3, total)`, bounded `[1, total]`); a dashed positional divider marks the N/N+1 boundary instead of a highlighted/greyed split — every card renders identically regardless of side. The out-of-scope list is untouched, already separate. All new copy lives in `en.ts` under `selection.*`.

Added `src/engine/pacing.ts` (test-first) holding `BEATS_PER_MUTANT` (K=2) and `MUTANTS_PER_FUNCTION` (M=3) as named, single-sourced, explicitly provisional placeholder constants, plus `estimateBeatCount(n)`; the help box imports these directly so its estimate cannot drift from ticket 16's question loop once 16 imports the same module. Comment and this Ruling flag them as pending ticket 20 (hatim).

`App.tsx`'s `runViva` now takes the full selected `DemoFixture[]` (in complexity order) instead of one fixture: it builds one `FilterRequest` covering every selected function (ticket 06's one-call criterion), then per function uses that function's loaded mutants live or falls back individually if a function's mutants were all equivalent, merging all beats into one `Viva`. Verified end-to-end in the browser (fallback mode, 3 functions selected, `/api/filter` 404 on plain Vite as expected per the dispatch note) — the first function's beat rendered correctly.

Fixed the ticket-01-review glossary finding in `en.ts` while already editing it: `report.noLabel` now says "taxonomy label" instead of "misconception label".

## Rulings

- Renamed `StartScreen.tsx` → `SelectionScreen.tsx` since the ticket replaces the plain list with the real selection screen; updated the one `App.tsx` import. Cost if wrong: a one-line rename to revert.
- Default N = `min(3, eligible count)`. No default is specified in spec 02 §3 beyond "sensible"; 3 keeps a first-run viva short without being empty. Cost if wrong: change one constant in `SelectionScreen.tsx`.
- Cyclomatic-style complexity formula (base 1, +1 per branch/loop/ternary/catch/switch-case, +1 per `&&`/`||`) chosen as the concrete "complexity proxy" 02 §2 leaves as implementation's choice among cyclomatic/branch-count/path-count variants. Cost if wrong: swap the `BRANCH_TYPES` set and re-run `complexity.test.ts`'s worked examples.
- Leaf tiebreak treats self-recursion as still-leaf (a function calling itself isn't a call to *another* user-defined function, per 02 §2's wording). Cost if wrong: one condition in `isLeafFunction`.
- Placeholder pacing constants K=2, M=3 (`src/engine/pacing.ts`): no numeric value is stated in spec 05 for either; chosen only to make the help box's arithmetic non-degenerate pending ticket 20. Flagged provisional in a code comment, the help box's own copy (`selection.help.provisional`), and here. Cost if wrong: ticket 20/16 change two constants in one file; nothing else references the numbers directly.
- Multi-function fallback is per-function, not per-viva: if the live filter call succeeds overall but one selected function's loaded mutants are all equivalent, only that function falls back; other functions can still be live. The banner shows one mode for the whole viva (`live` if any function went live), so a mixed viva currently reads as "Live" without per-function granularity. Left as-is given the deadline; a per-beat mode indicator would be a ticket-06/19 sized follow-up if it matters to Hatim's demo. Cost if wrong: cosmetic — the beats themselves are always correctly sourced (live loaded mutant vs. fallback default) regardless of the banner.

## Comments

Ruling (orchestrator, at merge; supersedes the single-banner ruling above for mixed vivas): in a live viva, a function whose loaded mutants were all equivalent falls back alone, and its beats show the fallback strip with that reason while the rest show live with provider and model — fallback is labelled wherever it appears (09 §4); one "live" banner over fallback beats named a model that never judged them — cost if wrong: the strip changes mid-viva, which is the point. `ModeInfo.fallback` in `src/ui/App.tsx`. Not browser-verified: plain Vite has no `/api/filter`, so no live viva runs locally yet.
