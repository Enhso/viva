# 10: Grading: reading predictions, Brier score, calibration buckets

**What to build:** A typed prediction is graded by plain value comparison against the answer key, never through a model. The grader reads the student's text as a JS literal: numbers, quoted strings, booleans, `null`, `undefined`, arrays, objects, and error answers in the "throws TypeError" style. Text that doesn't parse as a literal is read as a bare string. The reveal shows how the answer was read ("read as: the number 5"), so the reading itself is a visible Tier 1 fact. Each beat gets a Brier score computed on the exact confidence value, and lands in one of four calibration buckets split at a fixed 50%. The report's mean Brier comes from here.

**Blocked by:** 04

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 04 §3, 06 §3, 07 §3

- [ ] `5` and `"5"` are different predictions; `[1,2]` and `[1, 2]` are the same; `'a'` and `"a"` are the same.
- [ ] Unparseable text is graded as a bare string, so typing `Free` for `formatPrice(0)` is right.
- [ ] Error outputs can be predicted and graded; the accepted syntax is a Ruling here and is shown to the student as the input's hint.
- [ ] Grading uses ticket 04's output equality, so a prediction equal to the original's output is always graded wrong on a distinguishing input (test).
- [ ] The Brier score is computed on the exact confidence with no rounding anywhere in the path (test: 67.3% and 67.0% score differently).
- [ ] Calibration buckets: confident is ≥ 50%, uncertain is < 50%; exactly 50% counts as confident (test).
- [ ] The reveal shows the reading of the student's answer.
- [ ] Test-first; the determinism-boundary test stays green.

## Comments

Ruling: typed answers are read as JS literals, anything unparseable is read as a bare string, and the reveal shows the reading — this keeps type distinctions (`5` vs `"5"`) that JS comprehension turns on, without punishing a student who types `Free` unquoted — cost if wrong: a student who means the string "5" must type the quotes. (R4, approved by Hatim at breakdown review, 2026-09-26.)

Note (2026-09-27): Hatim approved property-based tests (fast-check, fixed seed) for engine laws; see the decision in ticket 09's Comments. Law for this ticket: a prediction equal to the original's output never grades right on a distinguishing input. The first ticket to need fast-check installs it with `npm install -D fast-check`.
