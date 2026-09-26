# 05 — Question Loop

Depends on: `03-mutation-pipeline.md` (labeled mutants), `04-answer-key.md`
(verified distinguishing inputs per mutant).
Feeds into: `06-confidence-widget.md`, `07-report.md`.

**Read `00-master.md` §0 and §4 before touching this file.** The exact
pacing and sequencing of the felt experience is deliberately unspecified —
that's brief §2.4's territory, and it's explicitly *not* this spec's job to
pre-decide it. What follows are the **mechanics** the experience runs on —
fixed, load-bearing decisions — not the pacing/emotional design itself.
Prototype the actual feel fast, run Hatim through it as if he were the
student, iterate from there.

---

## 1. What the student sees per question: mutated code, not a blind guess

**Decision:** the student sees the **mutated code itself** (full mutated
function, or a diff against the original — implementation's choice which
rendering, but the mutation must be visible) and predicts output on a given
input. This is not blind prediction with the mutant revealed only afterward.

Why this matters for the felt experience (context, not something to
re-derive): reading a visible diff and still getting the consequence wrong
is what produces the specific "sting" brief §2.4 describes — the failure is
legible, the student *saw* the change and still mispredicted, which lands
differently than not having seen it at all.

**Consequence for the sandbox contract:** the mutant source must be
rendered to the student **before** they answer, not hidden until reveal.

## 2. Multiple inputs per mutant, each its own predict-then-reveal beat

**Decision:** where a mutant has multiple verified-distinguishing inputs
(the common case per `04-answer-key.md`), the student sees and answers
**multiple** of them, not just one. And reveal is **per-input**, not
batched: student answers input 1 → immediate reveal (actual vs. predicted)
→ input 2 → immediate reveal → etc., all for the same mutant, before moving
to the next mutant.

**This is a real cost against the clock and was made with that cost known,
not accidentally.** More inputs per mutant means either fewer mutants fit in
N functions' worth of viva time, or the viva runs longer than a nominal
4-minute target, or both. This trades against the student-set N from
`02-selection-ordering.md` — the help box on the selection screen should
account for **both** dials (N and per-mutant question count), not just N in
isolation.

**Why multiple beats one, and why per-input beats batched (preserved
reasoning):** multiple inputs per mutant is a richer signal than one —
distinguishes "got it wrong once, unlucky" from "wrong mental model
entirely." Per-input reveal (vs. showing all inputs' results at once after
the mutant is fully answered) gives the student a chance to recalibrate
confidence mid-mutant based on immediate feedback, rather than preserving
suspense across a whole mutant only to deliver one bigger hit at the end.
(Note: suspense is still fully preserved at the *viva* level — see
`07-report.md` §1, the report is a single end-of-viva screen, so the
aggregate pattern across all mutants is still unknown until the very end
even though individual right/wrong is immediate.)

**Consequence for calibration data:** confidence must be captured
**per input**, not once per mutant. This is what the report's calibration
buckets (`07-report.md`) actually operate over — granularity matters, don't
collapse it.

## 3. Free-text vs. constrained-choice: weighted-random mix

**The goal (stated by Hatim directly, worth preserving verbatim in intent):**
prevent the student from "loading the answers and eliminating the least
plausible ones" — genuine thinking has to happen. MCQ alone is too gameable;
free-text alone risks being pure friction with no benefit; a naive fixed
alternation pattern (e.g., "always free-text first, then MCQ") is
learnable within one mutant and stops forcing genuine engagement.

**Decision:** weighted-random format selection per input, not a fixed rule
and not pure 50/50 randomness either.
- **First input for a given mutant:** heavily weighted toward free-text
  (e.g., ~80% free-text / 20% MCQ — treat this as a tunable constant, not a
  hard requirement; adjust by feel during build-day testing).
- **Subsequent inputs for the same mutant:** closer to even odds between
  free-text and MCQ (e.g., ~50/50 — also tunable).

This deliberately does **not** guarantee every mutant gets a clean
free-text-first data point (a pure fixed rule would have, at the cost of
being fully predictable and therefore gameable). It's a middle position,
chosen explicitly over both a pure-random and a pure-fixed-rule approach —
see the interview's Q21–23 resolution if the reasoning needs to be
re-explained to anyone (it's a real tension between anti-gaming and clean
calibration data; this splits the difference rather than fully solving
either).

## 4. MCQ mechanics

**Distractors:** the actual, real wrong outputs of **other candidate
mutants** on that same input — not separately generated, not
heuristically invented, not LLM-proposed. This was a deliberate choice: every
option a student sees is a genuinely reachable value from executing *this
same function* (just a different bug), so "that looks made up" can't be used
as an elimination tell. It's also free — no extra generation step, no extra
LLM call.

**Position of the correct answer must be shuffled by your own PRNG, never
by the LLM.** This is not a stylistic preference — LLM-generated multiple-
choice questions have a documented, real tendency to cluster correct answers
in certain positions (commonly B/C), well past chance. Since brief §3.2's
entire pitch is "grading never depends on an LLM's opinion," a positional
leak in MCQ answer placement would quietly undermine that same integrity
claim from a different angle — an attentive student could partially game
position-correlated questions without understanding the code at all. The
LLM (or whatever process selects/labels candidates) must never place
anything into a specific position; your code shuffles at render time, using
your own randomness source.

## 5. What this hands off

To `06-confidence-widget.md`: each question (one input, one format,
rendered) needs a confidence statement attached before the prediction is
submitted/revealed.

To `07-report.md`: per-input results — predicted value, actual value,
confidence, format used, which mutant/function/taxonomy-label it belongs
to. This is the raw material for both Tier 1 facts and calibration-bucket
placement.
