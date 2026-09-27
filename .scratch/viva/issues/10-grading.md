# 10: Grading: reading predictions, Brier score, calibration buckets

**What to build:** A typed prediction is graded by plain value comparison against the answer key, never through a model. The grader reads the student's text as a JS literal: numbers, quoted strings, booleans, `null`, `undefined`, arrays, objects, and error answers in the "throws TypeError" style. Text that doesn't parse as a literal is read as a bare string. The reveal shows how the answer was read ("read as: the number 5"), so the reading itself is a visible Tier 1 fact. Each beat gets a Brier score computed on the exact confidence value, and lands in one of four calibration buckets split at a fixed 50%. The report's mean Brier comes from here.

**Blocked by:** 04

**Status:** done

**Type:** plumbing
**Spec:** 04 §3, 06 §3, 07 §3

- [x] `5` and `"5"` are different predictions; `[1,2]` and `[1, 2]` are the same; `'a'` and `"a"` are the same.
- [x] Unparseable text is graded as a bare string, so typing `Free` for `formatPrice(0)` is right.
- [x] Error outputs can be predicted and graded; the accepted syntax is a Ruling here and is shown to the student as the input's hint.
- [x] Grading uses ticket 04's output equality, so a prediction equal to the original's output is always graded wrong on a distinguishing input (test).
- [x] The Brier score is computed on the exact confidence with no rounding anywhere in the path (test: 67.3% and 67.0% score differently).
- [x] Calibration buckets: confident is ≥ 50%, uncertain is < 50%; exactly 50% counts as confident (test).
- [x] The reveal shows the reading of the student's answer.
- [x] Test-first; the determinism-boundary test stays green.

## Comments

Ruling: typed answers are read as JS literals, anything unparseable is read as a bare string, and the reveal shows the reading — this keeps type distinctions (`5` vs `"5"`) that JS comprehension turns on, without punishing a student who types `Free` unquoted — cost if wrong: a student who means the string "5" must type the quotes. (R4, approved by Hatim at breakdown review, 2026-09-26.)

Note (2026-09-27): Hatim approved property-based tests (fast-check, fixed seed) for engine laws; see the decision in ticket 09's Comments. Law for this ticket: a prediction equal to the original's output never grades right on a distinguishing input. The first ticket to need fast-check installs it with `npm install -D fast-check`.

Note (2026-09-27, ticket 01 review, `.scratch/notes/2026-09-27-ticket-01-review.md`): ticket 01 asked for a prediction type among the shared types; it is still a bare `string` (`grade.ts:18,26`), and confidence is a bare `number` that `gradeBeat` accepts at 150 or NaN. Until this ticket reads "throws X" predictions, a mutant that throws or times out can never be graded right.

## Answer

Built `src/grading/read-prediction.ts`: `readPrediction(text)` returns a `PredictionReading` (`Extract<RunOutcome, "returned" | "threw">`) by parsing the trimmed text with acorn (wrapped in parens so a leading `{` reads as an object, not a block) and walking only literal-shaped nodes (`Literal`, `undefined`/`NaN`/`Infinity` identifiers, unary `-`/`+` on those, arrays, plain objects); anything else, or a parse error, falls back to the trimmed text as a bare string — no `eval`/`Function` anywhere, so the determinism boundary holds. The `throws <ErrorName>` syntax (case-insensitive keyword) is matched first and shown verbatim in `beat.prediction.hint`. `gradeBeat` (`src/grading/grade.ts`) now reads the prediction, compares it to `beat.mutantOutput` with ticket 04's `sameOutput`, rejects an out-of-[0,100] or NaN confidence (`RangeError`), and returns the reading plus a `brier` field (`(confidence/100 − outcome)²` on the exact, unrounded confidence). `buildReport` adds `meanBrier` (null when there are no beats); the fuller report display is ticket 19's, per the existing code comment. `RevealScreen` shows "Read as: …" via the existing `describeOutput(renderOutput(reading), t)` path, reusing 04's rendering — no new copy path.

Ruling: the accepted error syntax is the keyword `throws` (case-insensitive) followed by the error's bare name, e.g. `throws TypeError`; no attempt to parse `new TypeError("msg")` or similar, matching 04's ruling that thrown messages never count. Cost if wrong: a student typing a different error phrasing is read as a bare string and graded wrong even when they had the right idea; easy to widen the regex later without touching call sites.

Ruling: `canonicalText` is now also exported from `src/engine/index.ts` (was previously internal to `outputs.ts`, already used internally by `renderOutput`) so grading's literal-reading property test and law test can round-trip a value through the same rendering the UI uses, instead of re-implementing value-to-text. Pure export addition, no behavior change to the already-merged ticket 04 code. Cost if wrong: a genuinely unwanted new public surface on the engine barrel; trivial to un-export.

Ruling: kept `gradeBeat(beat, prediction: string, confidence: number)`'s external signature unchanged (did not introduce a combined `Answer { prediction, confidence }` type or a branded `Confidence` type) to avoid touching `BeatScreen.tsx`/`App.tsx` call sites that ticket 05 (confidence widget) is about to redo; the "missing prediction type" and "unbounded confidence" smells from the ticket-01 review are addressed instead by the new internal `PredictionReading` type (now a real, typed part of `BeatResult`) and by `gradeBeat` throwing `RangeError` on an invalid confidence rather than silently accepting 150 or NaN. Cost if wrong: ticket 05 may still want a combined `Answer` value type; it can introduce one on top of this without re-touching `read-prediction.ts` or `grade.ts`'s grading logic.

Verification: `npx tsc -b` (clean) and `npx vitest run` — 12 files, 87 tests, all passing, including `src/architecture-boundary.test.ts` (no `src/grading`/`src/engine` file imports `src/llm`).
