# Viva

Viva generates a short oral-style exam from a student's own JavaScript and grades it by executing the code, so correctness never depends on a model's opinion.

## Session

**Viva**:
One exam session over the functions a student selected from the latest commit of one repository.
_Avoid_: quiz, test, assessment

**Eligible function**:
A plain JavaScript function from the student's repository that passed the scope check.
_Avoid_: candidate function

**Scope check**:
The rule that excludes React components and code touching the DOM or network, with a visible reason shown to the student.
_Avoid_: filter (reserved for the filter call)

**Complexity score**:
A cheap, model-free heuristic computed from a function's syntax tree that orders eligible functions on the selection screen.
_Avoid_: IT score, information-theoretic score, loadedness score

## Mutants

**Candidate mutant**:
A mechanical rewrite of one syntax-tree node, produced by the rule engine before any judgment is applied.
_Avoid_: variant, mutation (for the object)

**Rule engine**:
The fixed set of syntax-tree transformation rules that produces candidate mutants; it never invents a rewrite.

**Loaded mutant**:
A candidate mutant that passes both axes: it carries a plausible misconception label, and it changes output on an input a shallow read would not flag as risky.
_Avoid_: good mutant, interesting mutant

**Taxonomy axis**:
Whether a mutant is evidence of a nameable misconception.

**Information-theoretic axis**:
Whether a mutant is informative for this specific code: a careful trace catches it where a shallow read misses it. A property of a mutant, never of a function.

**Taxonomy label**:
The model's name for the misconception a loaded mutant probes. Always provisional.
_Avoid_: category, tag, concept

**Filter call**:
The one model call per viva that selects loaded mutants from the candidate list and labels them.
_Avoid_: main prompt, grader call

**Triage call**:
The conditional second model call that shrinks one function's candidate list when it exceeds the context threshold.

**Surviving mutant**:
A candidate mutant that passed the filter call and has at least one distinguishing input.

**Equivalent mutant**:
A mutant whose behavior matched the original on every input tried; it is dropped before any question is asked.
_Avoid_: dead mutant

**Distinguishing input**:
An input on which the original and a mutant produce observably different outputs, verified by execution.

**Shared battery**:
The per-function set of inputs generated once and tried against every mutant first.

**Targeted search**:
The per-mutant input search that runs when the shared battery distinguishes nothing.

**Answer key**:
The original's and the mutant's actual outputs on each distinguishing input.

## Questions

**Beat**:
One predict-then-reveal cycle for a single distinguishing input of a single mutant.
_Avoid_: round, step, question (when the reveal is included)

**Prediction**:
The output a student states for a beat, as free text or as a multiple-choice pick.

**Distractor**:
A multiple-choice option taken from another candidate mutant's real output on the same input.

**Confidence**:
The student's stated probability, per beat, that their prediction is right, from 0 to 100% at 0.1% precision.

## Report

**Calibration bucket**:
One of four report groups split at a fixed 50% confidence: confidently right, confidently wrong, uncertain and right, uncertain and wrong.

**Confidently wrong**:
A beat answered incorrectly at 50% confidence or above; the headline bucket.

**Tier 1**:
Report content the system computed by execution, stated flatly.

**Tier 2**:
Report content a model guessed, such as taxonomy labels and their grouping, shown with visibly provisional treatment.

**Label grouping**:
The decision whether two independently produced taxonomy labels name the same concept.

## Modes and staging

**Fallback mode**:
A viva running with no model: default edge-case inputs, the first output-changing mutant, templated wording, labelled as fallback wherever it appears.

**Case B**:
Today's staging: the model proposes taxonomy labels live, constrained by a checklist.

**Case A**:
The later staging: a hand-authored taxonomy owned by Hatim, built from logged candidates.

**Static chrome**:
Fixed-vocabulary UI text, hand-translated once per language.

**Dynamic content**:
Text that exists only after the pipeline runs (taxonomy labels, report synthesis); translated per viva into the selected language only.
