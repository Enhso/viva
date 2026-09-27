# 09: Shared battery, targeted search, equivalent-mutant drop

**What to build:** Every mutant that reaches the student has at least one input verified by execution to make it behave differently from the original. Every mutant without one is dropped as an equivalent mutant before any beat is asked.
1. For each function, a shared battery is generated once from its parameters' shapes: boundary values, zero/negative/empty, and type edge cases. Shapes are inferred from JSDoc types, default values, and how the body uses each parameter.
2. Each mutant is tried against the shared battery first.
3. Only if nothing there distinguishes it does a targeted search run, perturbing around the mutated node or sweeping a larger deterministic range.

The answer key records the original's and the mutant's outputs on every distinguishing input found. Fallback mode's "first mutant that changes output" now draws on this.

**Blocked by:** 04

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 04 §1, 04 §3

- [ ] Every bootcamp fixture gets a shared battery matched to its parameters (strings for `countVowels`, arrays of objects for `findUser`, a number pair for `sumRange`, and so on).
- [ ] Input generation is deterministic: same function, same battery.
- [ ] The targeted search runs only for mutants the shared battery didn't distinguish, and is bounded.
- [ ] A mutant with no distinguishing input after both steps is dropped: it never reaches the question loop or the report, and the drop is recorded with a reason.
- [ ] For each surviving mutant, the answer key holds its distinguishing inputs with both outputs.
- [ ] Distinguishing inputs are ordered with type-conforming inputs before type edge cases, so a mutant's first beat asks about an input the function was written for.
- [ ] Code comments state plainly that this drop runs after the filter call and is the final gate on whether a mutant is used.
- [ ] Input generation is named and kept separate from the rule engine's candidate generation (04 §1 step 1).
- [ ] If the filter-lab harness (ticket 11) already exists, it now flags loaded-but-equivalent candidates.
- [ ] Test-first; the fallback pipeline test stays green.

## Comments

Note (2026-09-27, proposal awaiting Hatim's yes): Hatim asked whether property-based testing can join the workflow. Proposal: fast-check with a fixed seed powers step 3's targeted search, since a counterexample to the property "original ≡ mutant" is exactly a distinguishing input and exhausting the run budget is the equivalent-mutant evidence. Shrinking chooses the search's result only; it never reorders beats (it shrinks `sumRange`'s case to `(0, 1)`, which Hatim rejected as the first beat in favour of a degenerate boundary like `(3, 3)`). Engine laws in 03/04/10 (every candidate parses; output equality symmetric and key-order-blind; a prediction equal to the original's output never grades right) are natural property tests too.
