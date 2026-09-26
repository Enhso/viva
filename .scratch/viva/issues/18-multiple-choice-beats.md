# 18: Multiple-choice beats

**What to build:** Some beats ask the student to pick from options instead of typing. The format is chosen per beat by weighted chance: a mutant's first beat favours free text (about 80/20), and later beats are closer to even (about 50/50). Both are named tunable constants that Hatim settles in ticket 20. The options are the correct output plus distractors: other candidate mutants' real outputs on the same input. Distractors are never invented and never model-proposed, so no option can be eliminated for looking made up. The correct option's position is shuffled by the app's own random source at render time; no model output ever places an option.

**Blocked by:** 10, 16

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 05 §3–4

- [ ] The answer key records every candidate mutant's output on each distinguishing input, not only the surviving ones', so distractors exist to draw from.
- [ ] Distractors are distinct from the correct output and from each other, under ticket 04's output equality.
- [ ] Too few distinct distractors means fewer options; none at all means the beat falls back to free text. The option count is a Ruling here.
- [ ] The position shuffle uses the app's own PRNG; a test over many renders shows the correct position spread uniformly.
- [ ] The weighting constants are named, single-sourced, and marked tunable pending ticket 20.
- [ ] Multiple-choice picks are graded with the same equality as free text (ticket 10), and each beat records its format.
- [ ] Options render in the canonical output form.
- [ ] Distractor selection, shuffle, and format choice are test-first.

## Comments

Note: other candidates' outputs on a distinguishing input often equal the original's output, which is never right on a distinguishing input. Spec 05 §4 is followed literally here; ticket 20 carries the design question this raises.
