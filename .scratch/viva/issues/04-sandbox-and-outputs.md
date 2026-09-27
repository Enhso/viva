# 04: Sandbox hardening and canonical outputs

**What to build:** Running original and mutant code can no longer hang, leak, or wobble, and every output has one canonical, printable form that the student can predict and the grader can compare.
- A mutant that loops forever times out without freezing the page.
- Code that reaches for the network finds nothing there.
- `Math.random` and the clock are seeded or fixed, so repeated runs agree.
- Each run receives a fresh copy of its input, so a function that mutates its argument (`topScores` sorts in place) cannot contaminate the next run.

An output is either a returned value of any JS type or a thrown error. Each has one canonical rendering and one equality rule. The distinguishing check and grading both use that equality, so a prediction that matches the original's output can never be graded right on a distinguishing input. The browser (Web Worker) and Node runners behave identically.

**Blocked by:** 01

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 04 §2–3, 01 §5

- [ ] An infinite-loop mutant times out within a fixed bound, and the viva continues.
- [ ] `fetch`, `XMLHttpRequest`, `WebSocket`, and dynamic imports are unavailable inside the sandbox.
- [ ] Two runs of code that uses `Math.random` or `Date.now` on the same input give identical outputs.
- [ ] Each run receives its own deep copy of the input.
- [ ] Canonical renderings are defined and tested for numbers (including `NaN`, `Infinity`, `-0`), strings (quoted), booleans, `null`, `undefined`, arrays, plain objects (in JS's own key enumeration order), and thrown errors (rendered by error type, e.g. "throws TypeError"; whether the message counts is a Ruling here). Returned functions render as a fixed token until ticket 17.
- [ ] Output equality ignores plain-object key order, and it is the single equality used by the distinguishing check (ticket 09) and grading (ticket 10).
- [ ] The Node and Worker runners agree on the timeout, network, and randomness cases: Node through tests, the Worker by a manual browser check recorded in this ticket.
- [ ] Test-first; the fallback pipeline test stays green.

## Comments

Ruling: a timeout never counts as a distinguishing output; a thrown error does — a timeout cannot be verified as non-termination (the code might finish later), while a thrown error is deterministic and predictable — cost if wrong: infinite-loop mutants never become beats, losing "this never returns" as a prediction. (R3, approved by Hatim at breakdown review, 2026-09-26.)

Note (2026-09-27): Hatim approved property-based tests (fast-check, fixed seed) for engine laws; see the decision in ticket 09's Comments. Law for this ticket: output equality is reflexive and symmetric and ignores plain-object key order. The first ticket to need fast-check installs it with `npm install -D fast-check`.
