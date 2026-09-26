# 17: Functions that return functions

**What to build:** `makeCounter`, and anything shaped like it, produces real beats. When a function's output is itself a function, the observable output becomes the list of results from calling that returned function three times with no arguments. This makes a closure/scope-capture mutant distinguishable, a misconception the brief names explicitly. The beat's wording says what is being predicted ("`makeCounter(5)` returns a function; calling it three times gives?").

**Blocked by:** 09

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 04 §3, 05 §1

- [ ] `makeCounter` yields at least one surviving mutant with a verified distinguishing input.
- [ ] The call protocol (three zero-argument calls) is one named constant, used identically by the distinguishing check, the answer key, the beat's wording, and grading.
- [ ] A returned function that throws or times out when called follows ticket 04's output rules.
- [ ] Functions nested inside other returned values (e.g. an array of functions) keep ticket 04's fixed token and are not called.
- [ ] Test-first; the fallback pipeline test stays green.

## Comments

Ruling: when a function returns a function, the observed output is the list of results from calling it three times with no arguments — without this every `makeCounter` mutant is an equivalent mutant and the fixture asks nothing, losing closure capture, one of the brief's own examples — cost if wrong: one constant and its wording template to change. (R2, approved by Hatim at breakdown review, 2026-09-26.)
