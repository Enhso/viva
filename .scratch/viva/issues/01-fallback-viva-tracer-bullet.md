# 01: Fallback viva on one fixture, end to end

**What to build:** The thinnest complete viva, with no model and no OAuth. The student opens the app, picks the `sumRange` fixture from a labelled demo-fixture source, and runs a viva in fallback mode. The engine extracts the function, the rule engine produces candidate mutants from at least one rule family, and a shared battery (numeric parameters are enough here) finds the first output-changing mutant. The student sees that mutant's code with the change visible, plus one distinguishing input; types a prediction; states a confidence; and gets an immediate reveal of actual against predicted. A report screen follows with the four calibration-bucket counts and the beat's Tier 1 facts ("answered X, correct answer was Y, confidence was Z%"). Every screen says the viva is running in fallback mode.

This ticket also lays the seams later tickets extend instead of retrofitting:
- all visible copy comes from an English string table, keyed so later languages slot in;
- one mode indicator (fallback now; live and cached arrive later);
- the pipeline's shared types (eligible function, candidate mutant, surviving mutant, answer key, beat, prediction);
- a sandbox-runner interface, with a Web Worker implementation for the browser and a Node implementation for tests.

**Blocked by:** None (can start immediately).

**Status:** done

**Type:** plumbing
**Spec:** 03 §6, 04 §1–3 (minimal), 05 §1–2 (one beat), 06 §3, 07 §2–4 (Tier 1 only), 08 §2 (string-table seam), 09 §4

- [x] Choosing `sumRange` from the demo-fixture source runs a complete viva in the browser with no request to any model provider.
- [x] The beat shows the mutated function, or a diff against the original, before the student answers.
- [x] The distinguishing input shown was verified by executing original and mutant; the reveal shows both outputs.
- [x] Confidence is captured per beat at 0.1% precision (a plain number box is enough here; ticket 05 builds the real widget).
- [x] The report shows all four calibration-bucket counts (fixed 50% threshold) and the beat's Tier 1 facts.
- [x] "Fallback mode" is visible on every screen of the viva, report included.
- [x] All visible copy comes from the English string table.
- [x] Engine and grading are built test-first. A Node test runs the whole fallback pipeline on the fixture and asserts it yields a beat with a verified distinguishing input; this test is the "fallback mode works at every commit" guard.
- [x] The determinism-boundary test stays green; typecheck and `npm test` pass.

## Answer

Shipped 2026-09-27 on `claude/awesome-knuth-idxfha` ([Enhso/viva#4](https://github.com/Enhso/viva/pull/4)). The demo-fixture source runs `sumRange` in fallback mode in the browser: the relational-flip rule yields `i < end` → `i <= end`, the boundary-first numeric battery finds `sumRange(3, 3)` (original 0, mutant 3) by executing both in a Web Worker, the student predicts and states confidence, the reveal shows prediction and both outputs, and the report shows the four calibration-bucket counts and the beat's Tier 1 facts under a rule heading. The fallback strip and tinted frame appear on every screen. Browser check (Playwright, 11:10–11:11): network log shows only `127.0.0.1` requests, 0 console errors; 67.3% reached the report unrounded. `npm test` 6 files / 14 tests, `npm run typecheck` exit 0, `npm run build` exit 0 (worker emitted as its own chunk; `node:vm` absent from the browser bundle). Screenshots: `.scratch/handoffs/screens/`.

Test-first caveat: the Node runner and the `>=` flip were written before their seam tests; the `>=` test was shown red by deleting the rule, the runner tests never went red.

## Comments

Ruling: the demo-fixture source ships as a labelled source beside GitHub, not as a dev-only hack — spec 01 §3 rules out a paste-a-URL flow, not a fixture list, and the source doubles as demo insurance if OAuth or GitHub fails — cost if wrong: one picker to remove. (R6, approved by Hatim at breakdown review, 2026-09-26.)

Note: `sumRange`'s docstring says "inclusive" while its loop is exclusive. The answer key follows execution, never the docstring; a test pinning that is worth having.

Decisions by Hatim (2026-09-27, D1–D10 in `.scratch/handoffs/2026-09-27-1148-ticket-01-fallback.md`): seams = pipeline, extraction, rule engine, Node runner, grading/report; relational flips only; degenerate boundary input first; full mutated function with the changed line highlighted and the original hidden; fallback strip plus tinted frame; rule as the Tier 1 heading where a label would sit; question wording "`sumRange(3, 3)` → ?"; plain CSS (Hatim iterates design with Impeccable); push per slice plus draft PR; no Sonnet in 01.

Ruling: mutants are built by splicing one token's source range (found with acorn's tokenizer between the node's operands), not by re-printing the tree — keeps the student's formatting and comments, so the highlighted line is exactly what they wrote — cost if wrong: swap in a printer inside `mutate.ts`.
Ruling: both runners live in `src/engine/sandbox/` behind the async `SandboxRunner`, and neither is re-exported from `src/engine/index.ts` — `node:vm` must not reach the browser bundle and `Worker` does not exist in Node — cost if wrong: move two files.
Ruling: the Worker runner keeps one worker, waits for a `ready` message before starting a run's timer (a slow first module load must not read as a timeout), and terminates and respawns on timeout; 1000 ms default for both runners — cost if wrong: one constant.
Ruling: the beat shows the JSDoc above the mutated function — it is the student's code as written, and a docstring that disagrees with the code is part of what they should read — cost if wrong: drop two lines in `CodeBlock.tsx`.
Ruling: `EligibleFunction.docstring` is the verbatim `/** */` block directly above the declaration, or null — cost if wrong: ticket 02 reshapes it for the cards.
Ruling: candidate mutant id is `<function>:<rule>:<offset>`; stable while source is unchanged — ticket 03 may replace it.
Ruling: prediction reading is JSON literal else bare string (plus `undefined`, `NaN`, `±Infinity`), compared by rendered output — ticket 04 and 10 replace both.
Ruling: the confidence box starts empty and is required (a prefilled 50 would silently count as confident), validated on its text to one decimal so no float arithmetic touches it, and stored unrounded.

Known gaps for later tickets: (04/17) a returned function fails structured cloning, and the runners disagree on it — Node reports `threw DataCloneError`, the Worker hangs until the timeout (both read from the code, not executed); (02) `export function …` declarations are not extracted yet; (09) the battery treats every parameter as numeric.
