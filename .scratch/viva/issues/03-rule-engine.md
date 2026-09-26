# 03: Rule engine: full rule set with stable candidate identity

**What to build:** Every eligible function in the bootcamp corpus yields its full list of candidate mutants from a fixed, mechanical rule set that over-generates on purpose. Each candidate mutant carries the rule that produced it, its syntax-tree location, a one-line readable diff, and an id that stays stable across runs on unchanged source (the filter call's response contract and the filter-lab cache both key on it). The rule engine never invents a rewrite: every candidate mutant is one rule applied to one node.

**Blocked by:** 01

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §2–3

- [ ] Rule families include at least: relational operator flips (`<`↔`<=`, `>`↔`>=`), equality swaps (`===`↔`==`, `!==`↔`!=`), logical flips (`&&`↔`||`), negation removal and insertion, arithmetic operator swaps, off-by-one on numeric literals and index expressions, boolean literal flips, return deletion, and loop-bound changes. The list is illustrative; extend it as the fixtures suggest.
- [ ] Every bootcamp fixture produces at least one candidate mutant; a rewrite that fails to parse is never emitted.
- [ ] Same source in, same candidate ids in the same order out (test).
- [ ] No cap on candidates per function (03 §3).
- [ ] Each candidate mutant's diff renders as the original line against the mutated line.
- [ ] Test-first; the fallback pipeline test stays green.

## Comments
