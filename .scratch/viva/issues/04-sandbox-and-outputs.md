# 04: Sandbox hardening and canonical outputs

**What to build:** Running original and mutant code can no longer hang, leak, or wobble, and every output has one canonical, printable form that the student can predict and the grader can compare.
- A mutant that loops forever times out without freezing the page.
- Code that reaches for the network finds nothing there.
- `Math.random` and the clock are seeded or fixed, so repeated runs agree.
- Each run receives a fresh copy of its input, so a function that mutates its argument (`topScores` sorts in place) cannot contaminate the next run.

An output is either a returned value of any JS type or a thrown error. Each has one canonical rendering and one equality rule. The distinguishing check and grading both use that equality, so a prediction that matches the original's output can never be graded right on a distinguishing input. The browser (Web Worker) and Node runners behave identically.

**Blocked by:** 01

**Status:** done

**Type:** plumbing
**Spec:** 04 §2–3, 01 §5

- [x] An infinite-loop mutant times out within a fixed bound, and the viva continues.
- [x] `fetch`, `XMLHttpRequest`, `WebSocket`, and dynamic imports are unavailable inside the sandbox.
- [x] Two runs of code that uses `Math.random` or `Date.now` on the same input give identical outputs.
- [x] Each run receives its own deep copy of the input.
- [x] Canonical renderings are defined and tested for numbers (including `NaN`, `Infinity`, `-0`), strings (quoted), booleans, `null`, `undefined`, arrays, plain objects (in JS's own key enumeration order), and thrown errors (rendered by error type, e.g. "throws TypeError"; whether the message counts is a Ruling here). Returned functions render as a fixed token until ticket 17.
- [x] Output equality ignores plain-object key order, and it is the single equality used by the distinguishing check (ticket 09) and grading (ticket 10).
- [x] The Node and Worker runners agree on the timeout, network, and randomness cases: Node through tests, the Worker by a manual browser check recorded in this ticket.
- [x] Test-first; the fallback pipeline test stays green.

## Comments

Ruling: a timeout never counts as a distinguishing output; a thrown error does — a timeout cannot be verified as non-termination (the code might finish later), while a thrown error is deterministic and predictable — cost if wrong: infinite-loop mutants never become beats, losing "this never returns" as a prediction. (R3, approved by Hatim at breakdown review, 2026-09-26.)

Note (2026-09-27): Hatim approved property-based tests (fast-check, fixed seed) for engine laws; see the decision in ticket 09's Comments. Law for this ticket: output equality is reflexive and symmetric and ignores plain-object key order. The first ticket to need fast-check installs it with `npm install -D fast-check`.

Ruling: a thrown output's message never counts, in rendering or equality — only `errorName` does (`sandbox/types.ts` drops `RunOutcome.threw.message` entirely; it was flagged Speculative Generality in the ticket-01 review since nothing read it). Why: Node (V8) and the browser word the same error differently, and messages can carry the student's own data (a range in a `RangeError`, say) that a mutation might shift without changing the *kind* of failure — comparing text would make the two runners disagree on code that behaves identically, and would sometimes distinguish on message wording rather than misconception. Cost if wrong: a mutant that changes an error's message but not its type is never distinguishable — probably rare and probably fine to lose relative to the parity guarantee.

Ruling: `renderOutput` (`outputs.ts`) now returns a structured `CanonicalRendering` (`{kind:"value",text}` / `"function"` / `"error"` / `"timeout"`), not an English string. The prior version baked "times out" and "throws X" straight into engine output, which a spec review of ticket 01 flagged (rendering must not carry UI copy). The three fixed words now live in `en.ts` (`output.timeout`/`output.function`/`output.error`) behind a small `describeOutput(rendering, t)` helper in `src/ui/strings/index.ts`, used by `RevealScreen.tsx` and (bound to `translate("en", …)`, since ticket 24 hasn't threaded a selected language into `src/grading/` yet) by `report.ts`. This is the one place ticket 04 reaches from `src/grading/` into `src/ui/strings/` rather than `src/llm/` — the architecture-boundary test only forbids the latter, and `ui/strings` is a plain data/string-table module, not React. Cost if wrong: when ticket 24 lands, `report.ts`'s hardcoded `"en"` needs replacing with the viva's actual selected language — a one-line change at a clearly-marked call site.

Ruling: added a `RunOutcome` kind, `{kind:"returnedFunction"}`, produced by both runners the moment a returned value is `typeof "function"` — before either attempts to clone/postMessage it. Previously Node reported `threw DataCloneError` and the Worker hung waiting for the timeout (ticket 01's known gap, per the 2026-09-27 review). Both runners now agree, and `renderOutput` maps it to the fixed `"function"` rendering the checklist asks for (a richer treatment is ticket 17). A value that *contains* a function nested inside it (not itself a function) still fails structured-clone/postMessage; both runners now catch that at the clone/send boundary and report it as `{kind:"threw", errorName:"DataCloneError"}` instead of crashing (Node) or hanging (Worker) — deliberately not distinguished from a "real" thrown DataCloneError, out of scope here.

Ruling: sandbox hardening (network blocking, seeded `Math.random`, fixed `Date.now`) is one preamble (`SANDBOX_PREAMBLE` in `sandbox/types.ts`) prepended to every invocation body by both runners, rather than each runner reimplementing it. It monkey-patches the *execution realm's* `Math.random`/`Date.now`/`fetch`/`XMLHttpRequest`/`WebSocket` directly (not local `const` shadowing, which dynamic `globalThis.x` access would bypass) — safe because Node's `vm.runInNewContext` gives each run its own fresh realm, and the preamble re-runs (and so reseeds) at the top of every single invocation in the Worker too, so state never leaks between runs or between an original and its mutant. Dynamic `import(...)` isn't a value that can be reassigned; it's left to Node's own `vm` restriction (no import callback configured, confirmed by test) and to the browser's own refusal from inside a `new Function`-constructed body (confirmed by the manual check below — it surfaces as a rejected promise, which the runners already turn into `{kind:"threw", errorName:"DataCloneError"}` since a `Promise` isn't structured-clone-safe either).

Also fixed while in these files (already pointed here by the ticket-01 review, `worker-runner.ts:32`): the Worker runner now has an `onerror` handler, both while waiting for `ready` and during a run, so a worker that fails to load (or crashes unexpectedly) resolves as `{kind:"threw", errorName:"WorkerLoadError"}` instead of hanging the pipeline forever. No test exercises this (D1a's seams don't cover it, and forcing a real worker-load failure from a Node test isn't practical); it's a straightforward mirror of the existing timeout-replaces-worker pattern, read-reviewed rather than test-driven — flagged here rather than left silent.

### Manual browser check (Worker runner), 2026-09-27, Vite dev server on 127.0.0.1:5174, Playwright MCP

Drove `createWorkerRunner` directly (`import('/src/engine/sandbox/worker-runner.ts')` in the page) with the same cases as the Node test file:
- `while(true){}` → `{kind:"timeout"}`.
- `typeof fetch` / `typeof XMLHttpRequest` / `typeof WebSocket` → all `"undefined"`; calling `fetch(...)` → `{kind:"threw", errorName:"TypeError"}`.
- `import('data:text/javascript,...')` → rejects; observed as `{kind:"threw", errorName:"DataCloneError"}` (the rejected promise, structured-clone-unsafe) — same outcome shape as Node's `import()` case, confirming parity.
- Two runs of `Math.random()` on the same input → identical value (`0.41157995723187923`); two runs of `Date.now()` → identical (`1700000000000`).
- `topScores`-style in-place `.sort()`: caller's array left as `[3,1,2]` after the run, and a second run against the same untouched array sorts again rather than no-op-ing — confirms the deep copy.
- A function returned directly → `{kind:"returnedFunction"}`, matching Node exactly.

All match the Node runner's outcomes case-for-case. No code changes came out of this pass beyond what's already committed; it's confirmation, not discovery.

## Answer

Shipped: Node-`vm`/Worker parity for timeouts (already true from ticket 01, kept), network blocking and seeded `Math.random`/fixed `Date.now` (`SANDBOX_PREAMBLE` in `src/engine/sandbox/types.ts`, applied via `invocationBody`, so both runners get it for free), per-run deep-copied input (already `structuredClone` in the Node runner; the Worker's `postMessage` does this implicitly, confirmed by the manual check), a new `returnedFunction` outcome so both runners treat a returned function identically instead of diverging, and a `describeOutput`/`CanonicalRendering` split so canonical rendering data lives in `src/engine/outputs.ts` (numbers incl. `NaN`/`Infinity`/`-0`, quoted strings, booleans, `null`, `undefined`, arrays, and plain objects in JS's own key order — all engine-pure, property-tested with fast-check for the reflexive/symmetric/key-order-ignoring law plus the `0`/`-0` and array-order-matters edge cases) while the three fixed English words for non-value outcomes live in `en.ts` behind a small UI-facing helper. `sameOutput` is a real structural equality (`Object.is` at the leaves, so `NaN`≡`NaN` and `0`≠`-0`), not a string comparison, and is what both `fallback.ts`'s distinguishing check and `grade.ts`'s grading already call. Also closed the Worker-runner-hangs-on-load-failure gap flagged in the ticket-01 review. Verified: `npm test` (7 files / 43 tests, up from 6/14), `npm run typecheck`, `npm run build`, all exit 0; Worker parity confirmed live in a browser via Playwright (see above). Left for later tickets: functions nested inside a returned object/array still surface as `DataCloneError` rather than their own fixed token (ticket 17); `report.ts`'s output text is hardcoded to `"en"` until ticket 24 threads a selected language through grading.
