# 17: Functions that return functions

**What to build:** `makeCounter`, and anything shaped like it, produces real beats. When a function's output is itself a function, the observable output becomes the list of results from calling that returned function three times with no arguments. This makes a closure/scope-capture mutant distinguishable, a misconception the brief names explicitly. The beat's wording says what is being predicted ("`makeCounter(5)` returns a function; calling it three times gives?").

**Blocked by:** 09

**Status:** done

**Type:** plumbing
**Spec:** 04 §3, 05 §1

- [x] `makeCounter` yields at least one surviving mutant with a verified distinguishing input.
- [x] The call protocol (three zero-argument calls) is one named constant, used identically by the distinguishing check, the answer key, the beat's wording, and grading.
- [x] A returned function that throws or times out when called follows ticket 04's output rules.
- [x] Functions nested inside other returned values (e.g. an array of functions) keep ticket 04's fixed token and are not called.
- [x] Test-first; the fallback pipeline test stays green.

## Comments

Ruling: when a function returns a function, the observed output is the list of results from calling it three times with no arguments — without this every `makeCounter` mutant is an equivalent mutant and the fixture asks nothing, losing closure capture, one of the brief's own examples — cost if wrong: one constant and its wording template to change. (R2, approved by Hatim at breakdown review, 2026-09-26.)

Ruling: implemented as `RETURNED_FUNCTION_CALLS = 3` (`sandbox/types.ts`), applied *inside* `invocationBody` itself (shared by both runners): when the directly-returned value is `typeof "function"`, the script calls it 3 times before the structured-clone/postMessage boundary and returns the results wrapped in an internal marker object; both runners unwrap that marker into a plain `{kind:"returned", value:[...], calledReturnedFunction:true}` — the same `RunOutcome` shape any array-returning function gets, so `sameOutput`/grading/`readPrediction` need zero changes (a student typing `[6, 7, 8]` already parses and compares as this array). `calledReturnedFunction` is an optional flag ignored by equality/rendering; it exists only so the beat's question heading (new `beatQuestion` helper, `src/ui/strings/index.ts`) can pick the "returns a function; calling it {count} times gives?" wording (`beat.question.returnsFunction` in `en.ts`), with `{count}` bound to the same `RETURNED_FUNCTION_CALLS` constant — the one place ticket 16/19's files were touched was the single question-heading line in `BeatScreen.tsx` and `RevealScreen.tsx`, swapping `t("beat.question", ...)` for `beatQuestion(beat, t)`, no sequencing/display logic changed. The old `{kind:"returnedFunction"}` outcome and `{kind:"function"}` rendering (ticket 04's fixed token) are removed entirely — replaced, not kept alongside — since a directly-returned function can no longer reach that code path; a function *nested* inside another returned value (e.g. `[fn, fn]`) is untouched and still fails structured-clone as a thrown `DataCloneError`, confirmed by a new test.

Bug fix (pre-existing, ticket 04's code, exposed by this ticket's makeCounter fixture): `node-runner.ts` crashed with a spurious `{kind:"threw", errorName:"TypeError"}` for any mutant that legitimately returns `undefined` (e.g. a return-deletion mutant on `makeCounter`) — `value !== null && typeof (value as {catch}).catch === "function"` read `.catch` off `undefined` without checking for it first. One-line fix: also guard `value !== undefined`. Flagging here since it's outside this ticket's own diff area but was blocking checklist item 1.

## Answer

Shipped: a directly-returned function is now called `RETURNED_FUNCTION_CALLS` (3) times inside the sandbox and reported as an ordinary `{kind:"returned", value:[...]}` array outcome, so the existing answer-key/grading/equality machinery handles it with no changes of its own — verified end-to-end against the `makeCounter` bootcamp fixture: the closure-capture mutant (`count++`→`count--`) is distinguishable on all 9 battery inputs, and the fallback pipeline surfaces a real beat for it. A returned function that throws or times out when called reports that (thrown/timeout), not an array, by construction (the call loop runs inside the same timeout-bound script). A function nested inside another returned value is untouched — still not called, still a thrown `DataCloneError`. The beat's question heading now reads "`{call}` returns a function; calling it 3 times gives?" for this case via a new `beatQuestion` helper. Also fixed a pre-existing Node-runner bug (see Comments) that this fixture exposed. Verified: `npm test` (23/23 files, 173/173 tests) and `npm run typecheck`, both exit 0.
