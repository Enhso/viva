# 02: Extraction and scope check across the fixture corpus

**What to build:** Loading the fixture corpus (bootcamp, out-of-scope, and anything in `own/`) lists every eligible function with its signature, and its docstring/JSDoc when present. When a docstring is absent the card says so, with an explicit, muted "no docstring provided": never a heuristic stand-in and never a model-written description. Files and functions the scope check excludes (React components/JSX, code touching the DOM, code touching the network) appear with a visible reason; nothing is silently skipped. The student can start a viva on any eligible function; the tracer bullet's flow is now fed by the full list.

**Blocked by:** 01

**Status:** done

**Type:** plumbing
**Spec:** 01 §5–7

- [x] All twelve bootcamp functions are extracted as eligible functions, `average` included (see Ruling).
- [x] Each eligible function carries its full source, signature, and docstring or an absence flag.
- [x] A function without a docstring shows "no docstring provided" in muted styling. No first-line-of-body or model-generated fallback exists anywhere in the code path.
- [x] `Counter.jsx`, `getWeather`, and `toggleMenu` are rejected, each with a visible reason naming what triggered it (JSX/React, network, DOM).
- [x] The scope check reads the syntax tree: a comment or string that merely mentions `fetch` or `document` does not trigger a rejection.
- [x] Nested functions stay part of their parent's source; they are not separate eligible functions.
- [x] A file that fails to parse is reported with a visible reason and does not stop the rest of the corpus.
- [x] Engine changes are test-first; the fallback pipeline test stays green.

## Comments

Ruling: arrow functions and function expressions assigned to a top-level `const`/`let` are eligible functions, as are their exported forms — spec said "function declarations", `average.js` is an arrow function in a `const` and bootcamp code writes functions this way constantly, so both forms are included — cost if wrong: a few extra eligible functions on the selection screen. (R1, approved by Hatim at breakdown review, 2026-09-26.)

Ruling: fixed the real bug flagged in `.scratch/notes/2026-09-27-ticket-01-review.md` (Spec (c)1) — `docstringBefore` matched any block comment whose end fell before the position, but `String.prototype.slice(end, start)` silently returns `""` when `end > start`, so a comment written *after* the function (or inside a sibling's body) passed the "whitespace only in between" check by accident. Added an explicit `comment.end <= position` guard before the whitespace check — cheapest fix, no behavior change for the correct case — cost if wrong: none observed, both the original passing tests and three new regression tests (multi-function file, doc-for-later-function, comment-inside-a-body) are green.

Ruling: an eligible function's `EligibleFunction.source` is the declaration's own text starting at `function`/`const`/`let`, with any leading `export` keyword stripped — needed because `invocationBody` (`sandbox/types.ts`) runs `source` as a plain script/function body, which cannot contain a top-level `export` statement — cost if wrong: sandbox execution throws a SyntaxError on any exported function, caught as a "threw" outcome rather than a real answer key entry. Verified by two new extract tests (`export function`, `export const` arrow).

Ruling: JSX detection uses `acorn-jsx` (installed, `package.json`) rather than a `.jsx` extension check or regex, so the scope check can name "JSX/React" from the syntax tree itself (a `JSXElement`/`JSXFragment` node) instead of failing to parse — this also means a `.jsx` file with no actual JSX would extract normally rather than being blanket-rejected by extension. Cost if wrong: none identified; acorn-jsx's grammar is additive and every existing plain-JS fixture still parses and extracts identically (26/26 tests green after adding it).

Ruling: DOM/network detection walks the AST for `MemberExpression` on `document`/`window`/`navigator`/`localStorage`/`sessionStorage`, and `CallExpression`/`NewExpression` on `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource` — a small fixed identifier list rather than a broader heuristic, matching the ticket's three known fixtures and the "reads the syntax tree" requirement (a regression test confirms a comment/string mentioning `fetch`/`document` is never flagged). Cost if wrong: a real function using an unlisted global (e.g. `IntersectionObserver`) would wrongly pass the scope check; cheap to extend the identifier sets in `src/engine/scope.ts` when that surfaces.

Ruling: kept `extractFunctions` returning `EligibleFunction[]` (scope-filtered, silent) for backward compatibility with `fallback.ts` and its existing tests, and added a separate `scanFunctions(fileSource)` returning `{ eligible, rejected }` with a named `ScopeViolation` per rejection, for the corpus-listing use case that needs visible reasons. Cost if wrong: two call paths through the same underlying candidate-extraction code (`extractCandidates`) instead of one; kept the duplication minimal by sharing `extractCandidates`/`toEligibleFunction`.

Ruling: `src/ui/demo-fixtures.ts` now globs `bootcamp/*.js`, `out-of-scope/*`, and `own/*.js` and runs `scanFunctions` per file (catching a parse failure per file so one bad file never drops the rest of the corpus), instead of the single hard-coded `sumRange` fixture. `DemoFixture.source` is now the function's own isolated source (not the whole file), which `runFallbackViva`/`extractFunctions` still parse standalone correctly. `StartScreen.tsx` renders the eligible list (signature, docstring or muted "no docstring provided", Start viva button) and a second "Excluded from this corpus" list (name/path/reason) — a plain list per the dispatch note, not ticket 08's real selection screen (no complexity-score ordering, no function-card visual design).

## Leftovers for later tickets

- No complexity-score ordering on the list (ticket 08's job, per `02-selection-ordering.md`).
- No visual design pass on the eligible/rejected lists — reused `StartScreen`'s existing `.fixture` styling; ticket 08 owns the real selection screen.
- `own/` fixtures folder is empty (`.gitkeep` only) so it's untested with a real file; the glob pattern handles zero matches fine.
- Scope check's DOM/network identifier lists are fixed and small (see Ruling above) — may need widening once ticket 03/04 or Hatim's own fixtures exercise a global not on the list.

## Answer

Fixed the real `docstringBefore` adjacency bug (a JSDoc from a later or sibling function could leak onto an earlier one) with a failing-test-first regression suite. Extended `extractFunctions`/new `scanFunctions` to cover top-level `function` declarations, top-level `const`/`let` arrow and function-expression bindings, and both forms' `export`/`export default` variants, stripping the `export` keyword from stored source so the sandbox can still run it as a plain script. Added `src/engine/scope.ts`: an AST-only scope check (no regex on raw source) that names `jsx`, `dom`, or `network` violations, using `acorn-jsx` so JSX is a syntax-tree fact rather than a parse failure. Widened `src/ui/demo-fixtures.ts` to load and scan the whole fixture corpus (bootcamp + out-of-scope + own), and `StartScreen.tsx` now lists every eligible function (signature, docstring or "no docstring provided") plus a second list of every rejected file/function with its reason — a plain list, not ticket 08's ordered selection screen. All twelve bootcamp functions, including the arrow-function `average`, extract as eligible; `Counter.jsx`/`getWeather.js`/`toggleMenu.js` are rejected with `jsx`/`network`/`dom` respectively; a comment or string merely mentioning `fetch`/`document` is confirmed (by test) not to trigger a rejection. Verified live in the browser via Playwright: the corpus renders correctly and a full fallback viva runs end to end on `sumRange` after the extraction rewrite.
