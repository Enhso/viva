# 01: Fallback viva on one fixture, end to end

**What to build:** The thinnest complete viva, with no model and no OAuth. The student opens the app, picks the `sumRange` fixture from a labelled demo-fixture source, and runs a viva in fallback mode. The engine extracts the function, the rule engine produces candidate mutants from at least one rule family, and a shared battery (numeric parameters are enough here) finds the first output-changing mutant. The student sees that mutant's code with the change visible, plus one distinguishing input; types a prediction; states a confidence; and gets an immediate reveal of actual against predicted. A report screen follows with the four calibration-bucket counts and the beat's Tier 1 facts ("answered X, correct answer was Y, confidence was Z%"). Every screen says the viva is running in fallback mode.

This ticket also lays the seams later tickets extend instead of retrofitting:
- all visible copy comes from an English string table, keyed so later languages slot in;
- one mode indicator (fallback now; live and cached arrive later);
- the pipeline's shared types (eligible function, candidate mutant, surviving mutant, answer key, beat, prediction);
- a sandbox-runner interface, with a Web Worker implementation for the browser and a Node implementation for tests.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §6, 04 §1–3 (minimal), 05 §1–2 (one beat), 06 §3, 07 §2–4 (Tier 1 only), 08 §2 (string-table seam), 09 §4

- [ ] Choosing `sumRange` from the demo-fixture source runs a complete viva in the browser with no request to any model provider.
- [ ] The beat shows the mutated function, or a diff against the original, before the student answers.
- [ ] The distinguishing input shown was verified by executing original and mutant; the reveal shows both outputs.
- [ ] Confidence is captured per beat at 0.1% precision (a plain number box is enough here; ticket 05 builds the real widget).
- [ ] The report shows all four calibration-bucket counts (fixed 50% threshold) and the beat's Tier 1 facts.
- [ ] "Fallback mode" is visible on every screen of the viva, report included.
- [ ] All visible copy comes from the English string table.
- [ ] Engine and grading are built test-first. A Node test runs the whole fallback pipeline on the fixture and asserts it yields a beat with a verified distinguishing input; this test is the "fallback mode works at every commit" guard.
- [ ] The determinism-boundary test stays green; typecheck and `npm test` pass.

## Comments

Ruling: the demo-fixture source ships as a labelled source beside GitHub, not as a dev-only hack — spec 01 §3 rules out a paste-a-URL flow, not a fixture list, and the source doubles as demo insurance if OAuth or GitHub fails — cost if wrong: one picker to remove. (R6, approved by Hatim at breakdown review, 2026-09-26.)

Note: `sumRange`'s docstring says "inclusive" while its loop is exclusive. The answer key follows execution, never the docstring; a test pinning that is worth having.
