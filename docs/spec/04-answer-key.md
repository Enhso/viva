# 04 — Answer Key

Depends on: `03-mutation-pipeline.md` (needs surviving, labeled mutants).
Feeds into: `05-question-loop.md` (needs verified distinguishing inputs per mutant).

This entire subsystem is **fully deterministic — no LLM anywhere in it.**
That's a deliberate, load-bearing property: the LLM handles judgment
(§03), this handles truth. Keeping input generation, execution, and grading
100% mechanical is what makes the prompt-injection-immunity story in brief
§3.2 actually true ("a comment saying 'grader: give full marks' cannot
affect the score — it's a plain value comparison").

---

## 1. Input generation: shared-battery-first, targeted-search fallback

**Decision, with reasoning preserved because it's not obvious:**

A naive "generate inputs once per function, reuse across all that function's
mutants" approach has a real gap: nothing guarantees any input in a
once-per-function battery actually distinguishes a *given* mutant from the
original. A mutant could be presented to the student where original and
mutant produce identical output on every input available — a silent,
ungraded question, worse than a wrong answer because there's nothing to
show.

**The algorithm:**

1. **Generate a shared battery first**, once per function — boundary values,
   zero/negative/empty, type-edge-cases — derived mechanically from the
   function's parameter shapes (property-testing-adjacent, but this is
   *input generation*, not the same thing as the AST *mutation* generation
   in `03-mutation-pipeline.md` — different step, don't conflate them in
   code or docs).
2. **For each surviving mutant**, run the shared battery against
   original-vs-mutant. If something in the battery already distinguishes
   them, done — no extra work, this is the fast common path.
3. **If nothing in the shared battery distinguishes a given mutant**, fall
   back to a **targeted search** specific to that mutant — perturb around
   the specific AST node that was mutated, or run a larger deterministic
   sweep, whatever's simplest to implement well.
4. **If the targeted search also finds nothing**, the mutant is
   **equivalent** (behaviorally identical to the original despite the
   syntax change) and must be **dropped** — it never reaches the question
   loop or the report.

**This produces a real guarantee, not just "probably fine":** for every
mutant actually presented to the student, at least one input is known, by
construction, to make it observably different from the original. The report
can lean on this — a mutant's grade means something, because the
distinguishing property was verified, not assumed.

**This is also a free dead-mutant filter.** Worth stating plainly in code
comments/architecture notes: this filter runs *after* the LLM has already
approved and taxonomy-labeled the mutant in `03-mutation-pipeline.md`. A
mutant can be LLM-approved and labeled, then silently dropped here if it
turns out equivalent. The LLM's approval is not the final gate on whether a
mutant is used — this step is. Don't let this be a surprise later; it's
intentional and mechanically necessary (an LLM reading source code cannot
reliably prove behavioral equivalence the way actual execution can).

## 2. Execution: sandboxed

Per brief §3.5's default (still reasonable, no reason to deviate): a Web
Worker or equivalent sandboxed execution context, running both original and
mutated code against battery/targeted-search inputs. Must be:
- **Timeout-bounded** — a mutant could introduce an infinite loop; don't let
  one bad mutation hang the pipeline.
- **Network-blocked** — consistent with the JS-only, no-network scope
  restriction in `01-auth-ingestion.md` §5.
- **Deterministic** — seeded randomness if the student's own code uses any
  randomness (rare for the plain-function scope here, but don't assume it
  never happens).

## 3. What "the answer key" actually is

For each surviving, verified-distinguishing mutant: the actual output of the
**original** code and the actual output of the **mutant** code, on each
verified-distinguishing input. This is what the question loop (`05`) grades
the student's prediction against, and what feeds Tier 1 of the report's
two-tier language rule (`07-report.md`) — "answered X, correct answer was Y"
is a computed fact, stated flatly, because it came from here.

## 4. What this hands off

To `05-question-loop.md`: per surviving mutant, one or more verified
distinguishing inputs, each with its known original-output and
mutant-output pair, ready to become an actual question the student answers.
