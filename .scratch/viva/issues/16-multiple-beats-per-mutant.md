# 16: Multiple beats per mutant, reveal after each

**What to build:** Each surviving mutant is asked over several of its distinguishing inputs, each its own beat. The student sees the mutated code and one input, predicts, states confidence, and gets an immediate reveal. Then comes the next input of the same mutant, and only after that the next mutant. Viva length is governed by two named constants: beats per mutant (K) and mutants per function (M). Both are placeholders until Hatim settles them in ticket 20; the selection screen's estimate reads the same constants.

**Blocked by:** 09

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 05 §1–2, 06 §4

- [ ] Beats for one mutant run consecutively, with a reveal after every beat, never batched.
- [ ] Prediction, actual output, confidence, grade, and format are recorded per beat, never collapsed per mutant.
- [ ] A mutant with fewer distinguishing inputs than K asks as many as it has.
- [ ] K and M are named, single-sourced, and marked as placeholders pending ticket 20; the placeholder values chosen are recorded here.
- [ ] The mutated code stays visible for every beat of its mutant.
- [ ] Each beat's record carries what the report needs: prediction, actual output, confidence, format, mutant, function, and taxonomy label (live mode).
- [ ] Works in fallback mode (the first output-changing mutant per function, up to K beats) and in live mode.

## Comments
