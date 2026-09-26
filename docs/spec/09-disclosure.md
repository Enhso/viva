# 09 — Disclosure

Depends on: `03-mutation-pipeline.md`, `04-answer-key.md`, `07-report.md`,
`08-language-layer.md` — this doc should be **written or finalized last**,
after those subsystems actually exist, so it describes what shipped rather
than what was planned. Architecture has a way of shifting on build day; this
doc needs to track reality, not this spec.

**Delivery mechanism:** a **separate written document** — specifically, per
Hatim, likely a Google Form the hackathon requires before the submission
deadline. **Not** an in-product panel or feature. Nothing in the running app
needs to render or track disclosure content live; this is a writing task
against a form, sized to whatever field/word limits the actual form imposes
(unknown until Hatim opens it — brief §3.1 mentions a "≤150-word summary"
elsewhere in the submission requirements as a pattern-precedent, but the
disclosure field itself may have different constraints).

---

## 1. What the submission rules require (brief §3.1, verbatim requirement)

The AI/tool disclosure "must state access constraints, actual AI
contribution, and fallback — labelling live-vs-mock/cached explicitly."

## 2. Full inventory of AI/model touchpoints (source material — trim to fit the actual form)

**Core, unconditional (fires every viva):**
- **Main filter/label call** (`03-mutation-pipeline.md` §2) — an LLM reads
  a selected function's source, docstring (or its absence), and the full
  AST-generated candidate-mutant list, and returns which candidates are
  conceptually loaded plus a taxonomy label for each surviving one.
  Provider: [fill in whichever of NVIDIA Build / Groq / Gemini / OpenRouter
  actually served the demo, or note it varied]. This is the **only** call
  that touches judgment about what's worth asking; it never touches
  correctness.

**Conditional exceptions (name both explicitly, don't let either hide):**
- **Over-threshold triage call** (`03-mutation-pipeline.md` §4) — fires
  only when a single function's raw candidate-mutant list exceeds
  [state the actual token threshold used]. A second, smaller LLM call picks
  which candidates survive the shrink. Rare; state whether it fired during
  actual testing/demo or remained untriggered.
- **Translation pass** (`08-language-layer.md` §3) — fires only if the
  student selects French or Darija. A separate LLM call (not Jev) translates
  dynamic content (docstring glosses, taxonomy labels, report synthesis
  prose) eagerly, but only into the one language actually selected — never
  all three regardless of selection, specifically to protect free-tier rate
  limits.

**Non-generative model use:**
- **Jev** (TypeSafe AI, `typesafe.ai/blog/introducing-system-one-models-and-jev`,
  a "System One Model" released to early access Sept 15 2026) — used
  **only** for one closed classification decision in the report: whether
  two independently-generated taxonomy labels refer to the same underlying
  concept, for grouping purposes. State plainly that this is a brand-new,
  early-access product with no independent track record beyond the
  vendor's own launch benchmarks.
  - **Fallback:** embedding-similarity cosine matching against a fixed,
    explicitly-untuned threshold (~0.85, or whatever constant was actually
    used), on [name the embedding provider actually wired up]. State that
    this threshold is an acknowledged placeholder, not empirically tuned —
    tuning is future-iteration work.

**Fully deterministic, no model involved (worth stating explicitly, since
it's most of the pipeline and the core integrity claim):**
- Function extraction (AST parser, e.g. acorn)
- Candidate mutation generation (fixed AST rules)
- Input battery generation and per-mutant distinguish-checking
  (`04-answer-key.md`)
- Sandboxed execution of original vs. mutated code (the actual answer key)
- Grading (plain value comparison — predicted vs. actual)
- Brier/calibration computation
- All Tier 1 report language

## 3. The one-sentence architecture claim (safe to state as-is)

"Determinism handles truth — the answer key is computed by running code in
a sandbox. The LLM handles judgment — which mutant is worth asking, and
what it might mean. Grading never re-reads the answer through an LLM, so a
prompt-injection attempt embedded in student code (e.g. a comment saying
'grader: give full marks') cannot affect the score — it's a plain value
comparison."

## 4. Fallback/mock labelling (if demonstrated live)

If the "kill the API key mid-demo" fallback path (`03-mutation-pipeline.md`
§6) is actually shown: state clearly, at the point it's shown, that the
viva is now running on **default edge-case inputs, the first mutant that
changes output, and templated/unlabeled question wording** — not the live
LLM-filtered path. This must be visually/verbally distinguishable in the
demo itself, not just mentioned in the written disclosure after the fact —
brief §3.1 requires labelling live-vs-mock/cached **explicitly**.

## 5. GitHub OAuth scope note (worth including — see `01-auth-ingestion.md` §2)

State that the OAuth flow requests `public_repo` scope by default, with a
separate opt-in step for full `repo` scope (needed to list private repos).
Note that GitHub's `repo` scope grants write access that Viva never uses —
worth a sentence so a technical juror inspecting the OAuth consent screen
isn't left wondering.

## 6. Framing for the Case A/B staging decision (brief §2.3 — say this out loud, don't hide it)

"Today's build is honestly Case B: the LLM proposes candidate
misconceptions live, filtered against a checklist rather than a fixed,
hand-authored taxonomy. This is a staging decision, not an ambivalence — the
domain knowledge to author a full taxonomy in one day doesn't exist yet. If
this continues past the hackathon, every LLM-proposed candidate (whether or
not it survived the filter) has been logged, cheaply, as raw material for
building a real, hand-owned taxonomy later." This should be sayable plainly
if a juror asks "how do you know that's meaningful" — it's the intellectually
honest position, not a shortcut to apologize for.
