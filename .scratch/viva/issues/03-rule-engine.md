# 03: Rule engine: full rule set with stable candidate identity

**What to build:** Every eligible function in the bootcamp corpus yields its full list of candidate mutants from a fixed, mechanical rule set that over-generates on purpose. Each candidate mutant carries the rule that produced it, its syntax-tree location, a one-line readable diff, and an id that stays stable across runs on unchanged source (the filter call's response contract and the filter-lab cache both key on it). The rule engine never invents a rewrite: every candidate mutant is one rule applied to one node.

**Blocked by:** 01

**Status:** done

**Type:** plumbing
**Spec:** 03 §2–3

- [x] Rule families include at least: relational operator flips (`<`↔`<=`, `>`↔`>=`), equality swaps (`===`↔`==`, `!==`↔`!=`), logical flips (`&&`↔`||`), negation removal and insertion, arithmetic operator swaps, off-by-one on numeric literals and index expressions, boolean literal flips, return deletion, and loop-bound changes. The list is illustrative; extend it as the fixtures suggest.
- [x] Every bootcamp fixture produces at least one candidate mutant; a rewrite that fails to parse is never emitted.
- [x] Same source in, same candidate ids in the same order out (test).
- [x] No cap on candidates per function (03 §3).
- [x] Each candidate mutant's diff renders as the original line against the mutated line.
- [x] Test-first; the fallback pipeline test stays green.

## Answer

`src/engine/mutate.ts` now has ten rule families, each a fixed AST-node rewrite: `relational-flip`, `equality-swap`, `logical-flip`, `arithmetic-swap` (BinaryExpression operator tables); `negation-removal` (strip a prefix `!`); `negation-insertion` (wrap `if`/`while`/`do...while`/ternary `test` in `!(...)`); `boolean-literal-flip` and `off-by-one-literal` (Literal node: true↔false, or n→n+1 and n→n-1 as two candidates — this also covers off-by-one on an index expression's literal bound, since indices like `arr[0]` or `slice(0, n)` are themselves numeric literals); `return-deletion` (drop a `return`'s argument); `loop-bound-change` (flip `++`↔`--` on any UpdateExpression). `MutationRule` in `src/engine/types.ts` lists all ten; `src/ui/strings/en.ts` has a `rule.*` key for each (the `t(`rule.${MutationRule}`)` template-literal type in `ReportScreen.tsx` forces this at typecheck). Candidate ids are `${fn.name}:${rule}:${start}:${end}:${replacement}`, stable and unique per node+rewrite. Every bootcamp fixture (including `average.js`) now yields at least one candidate — verified directly, not just via the property test. Property test (`src/engine/mutate.property.test.ts`, fast-check, seed `20260927`, one run per extracted bootcamp function): every candidate's mutated source parses, and repeated calls on the same function yield the same ids in the same order. `mutate.test.ts` has one focused unit test per rule family plus an id-stability/parseability check. `npm test` (8 files, 40 tests), `npm run typecheck`, and `npm run build` all exit 0.

## Comments

Note (2026-09-27): Hatim approved property-based tests (fast-check, fixed seed) for engine laws; see the decision in ticket 09's Comments. Law for this ticket: every candidate mutant parses, and the same source yields the same candidate ids in the same order. The first ticket to need fast-check installs it with `npm install -D fast-check`.

Ruling (2026-09-27): candidate order is sorted primarily by rule-family priority (relational-flip first, then equality-swap, logical-flip, arithmetic-swap, boolean-literal-flip, negation-removal, negation-insertion, off-by-one-literal, return-deletion, loop-bound-change), secondarily by source position — not by source position alone. Reason: `sumRange`'s `total = 0` literal sits before its `for`-loop test in source order, so an `off-by-one-literal` candidate on that `0` would otherwise become fallback mode's first output-changing candidate, silently swapping the fixed tracer-bullet demo (D2a/D3b: relational flip, `sumRange(3, 3)` 0 vs 3) for a different one. Cost if wrong: fallback demo shows a different mutant than the one Hatim signed off on; cheap to re-rank if he wants a different priority order.

Ruling (2026-09-27): "off-by-one on index expressions" is handled by the same `off-by-one-literal` rule as numeric literals generally, not as a separate rule that targets `MemberExpression` computed-property nodes specifically. Every index bound in the bootcamp corpus is a literal (`arr[0]`, `slice(0, n)`), so this covers the fixtures without a second, narrower rule. Cost if wrong: a future fixture with a non-literal index expression (e.g. `arr[i + 1]`) gets no dedicated off-by-one mutant on that expression, though `loop-bound-change` and `arithmetic-swap` still mutate `i`'s update and any `+`/`-` inside it.

Ruling (2026-09-27): `loop-bound-change` (the `++`/`--` flip) applies to every `UpdateExpression` the traversal finds, not only ones sitting in a `for`-loop's update clause. Detecting "is this specifically a loop bound" would need parent/field tracking the visitor doesn't carry. Cost if wrong: a rule named for loop bounds also flips e.g. `count++` inside a loop body (as in `countVowels.js`) — still a mechanical, meaningful mutant, just not literally the loop's bound; relabeling would be a one-line change to the switch in `editsForNode`.

Ruling (orchestrator, at merge): candidate ids are `${function}:${rule}:${start}-${end}:${ordinal}`, with no replacement text — the filter call's model must echo every id verbatim (ticket 06), and ids embedding rewrites like `!(s === "a b")` invite mangled quotes, which fail that provider — cost if wrong: none known; the ordinal (stable sort) separates off-by-one's n+1/n−1 on one node. Test in `mutate.test.ts`.
