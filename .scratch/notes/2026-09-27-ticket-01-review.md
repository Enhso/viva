# Code review: ticket 01 (`0988400..64f5773`)

Two-axis review (`/code-review`), run 2026-09-27 ~12:50 Casablanca. Line numbers are against the `64f5773` tree. Plumber dispatches point here: fix the findings that land in files your ticket already changes; leave the rest.

## Standards

**Passes.** No `src/engine/` or `src/grading/` import of `src/llm/` (boundary test scans both recursively). "complexity score" / "information-theoretic" unused. No provider client yet. D8a holds (no `style=`, CSS variables). `worker-runner.ts` in `src/engine/` is a ticket-01 ruling; no Worker test is allowed by D1a.

**Documented-standard breaches**
1. tdd routing (CLAUDE.md): the Node runner and the `>=` flip were written before their tests (disclosed in ticket 01). Can't be undone; don't repeat it.
2. Glossary (CONTEXT.md, Eligible function, _Avoid_: candidate function): `fallback.ts:18` names an `EligibleFunction` `candidate`; line 22 reuses `candidate` for a candidate mutant.
3. Glossary drift in UI copy (judgement call): `en.ts:44` "misconception label" → taxonomy label; `en.ts:31` "This version returns" vs "mutant" at `en.ts:9,19`; `App.tsx:22,33` action `"loaded"` collides with *Loaded mutant*.
4. "All visible copy comes from the English string table" (ticket 01): `App.tsx:77` renders `String(error)`, so engine English (`fallback.ts:19`) reaches the screen; `App.tsx:108` reuses `report.restart` on the error screen.

**Smells (judgement calls)**
- Duplicated Code: question heading in `BeatScreen.tsx:24-26` and `RevealScreen.tsx:12-14`; `renderCall(beat.function.name, beat.input)` ×3 (those two + `report.ts:29`, also Feature Envy on `Beat`); trimming ×3 (`grade.ts:44`, `report.ts:30`, `RevealScreen.tsx:20`); `state.viva.beats[state.results.length]` ×2 (`App.tsx:38,90`); card block ×3 in `styles.css` (159-164, 276-282, 290-295), code font ×2 (71, 234-236); fixture path ×3 (`demo-fixtures.ts:2,17,18`).
- Data Clumps: source + function name (`fallback.ts:8-11`, `sandbox/types.ts:7-12,22`, `demo-fixtures.ts:8-12`, `App.tsx:73`); prediction + confidence (`BeatScreen.tsx:10`, `App.tsx:24`, `grade.ts:17-20,26`) wants an answer type.
- Primitive Obsession: confidence is a bare `number` (`grade.ts:26`); its 0–100 / 0.1% rule lives only in a UI regex (`BeatScreen.tsx:8`), so `gradeBeat` accepts 150 or NaN. Ids built as strings (`mutate.ts:36`, `fallback.ts:26`).
- Mysterious Name: `CodeBlock.tsx` exports `MutantCode`; `sandbox/types.ts` holds runtime code (`invocationBody`, `thrownOutcome`, `DEFAULT_TIMEOUT_MS`) and `engine/index.ts:8` re-exports it all.
- Speculative Generality: `CandidateMutant.functionName` (`types.ts:23`) and `RunOutcome` `threw.message` (`sandbox/types.ts:4`) never read.
- Repeated Switches: per-mode `[data-mode]` rules twice (`styles.css:80-88`, `98-107`); one `--mode-color` per mode would cover both.

## Spec

All D1–D10 check out in code (D3b `battery.ts:14-16`, D4b `CodeBlock.tsx:5-13`, D5c `App.tsx:82-83` + `styles.css:76-88`, D6a `ReportScreen.tsx:26-29`, D7b `en.ts:21`); fallback wording `en.ts:8-9` matches 09 §4. `npm test` 6 files / 14 tests.

**(c) Implemented but wrong**
1. **Docstring extraction picks up the wrong comment** → ticket 02. Ruling: `docstring` is "the verbatim `/** */` block directly above the declaration, or null"; 01 §6: no heuristic stand-in. `extract.ts:27-31`: when a comment ends after the function starts, `fileSource.slice(comment.end, position)` is `""`, so the adjacency check passes; any comment inside or after the function becomes its docstring. Probe: `function a(){}` then `/** doc for b */ function b(){}` gives `a` b's doc; a `/** inner */` inside a body becomes that function's docstring. The beat shows it (`CodeBlock.tsx:5`). No multi-function test exists.
2. **Worker runner can hang silently** → ticket 04. 04 §2: "Timeout-bounded … don't let one bad mutation hang the pipeline." `worker-runner.ts:32` waits for `ready` before starting the timer and has no `onerror`; a worker that fails to load leaves the start screen on "Running your code…" forever. The ticket-01 ruling covers a slow load, not a failed one.

**(a) Missing or partial**
1. No prediction type (ticket 01 asked for "prediction" among the shared types); it's a bare `string` in `grade.ts:18,26` → ticket 10.
2. Copy bypassing the string table: `outputs.ts:10` returns English "times out", shown by `RevealScreen.tsx:22` and `report.ts:31` → ticket 04 (canonical renderings); `fallback.ts:19` "No function named …" reaches the screen via `App.tsx:77` → ticket 06 (surfacing reasons).

**(b) Not asked for (minor)**: live/cached copy and styling already written (`en.ts:10-13`, `styles.css:83-88,102-107`); wording belongs to 06/14, which may rewrite it.

**Recorded elsewhere**: returned functions vs structured clone (04/17), `export function` (02), numeric-only battery (09) in ticket 01; network/randomness (04), Brier, zero-confidently-wrong, re-show code (10/19), "throws X" predictions (10) in later tickets. Consequence of the last until 10: a mutant that throws or times out can never be graded right.

## Summary

Standards: 4 documented-standard breaches + 6 smell groups; worst: engine English reaching the screen (`App.tsx:77`). Spec: 2 wrong, 2 partial, 1 minor creep; worst: docstring extraction attaches the wrong comment.
