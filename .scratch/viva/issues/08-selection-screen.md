# 08: Selection screen

**What to build:** After loading a source, the student sees every eligible function in one list, highest complexity score first. Each function is a card with its signature, its docstring or the muted "no docstring provided", and its complexity score, shown plainly enough that the ordering reads as a visible rule. The student sets N, how many functions this viva covers; the cutoff is simply where N falls in the ordered list. A help box beside the N control explains the tradeoff in plain terms: both dials that set viva length (N, and beats per mutant), with an estimated beat count for the current settings. Starting the viva hands the selected functions to the pipeline in complexity-score order.

**Blocked by:** 02

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 02 §1–4, 01 §6, 05 §2

- [ ] The complexity score is computed from the syntax tree with no model call, and is called "complexity score" in code, copy, and names. "Information-theoretic" appears nowhere in this screen or its code.
- [ ] Ordering is by complexity score descending, with deterministic tie-breaks.
- [ ] N is student-set with a sensible default, bounded by the eligible-function count.
- [ ] No "highlighted top N / greyed rest" split; the cutoff is legible from the list itself.
- [ ] The help box names both dials and shows an estimated beat count derived from the same constants the question loop uses (beats per mutant and mutants per function, from ticket 16), so they cannot drift apart.
- [ ] Out-of-scope files and functions stay visible with their reasons, separate from the eligible list.
- [ ] All copy comes from the string table.
- [ ] The complexity score computation is test-first.
- Optional, only if cheap: leaf-first (no calls to other user-defined functions) as a secondary tiebreaker (02 §2).

## Comments
