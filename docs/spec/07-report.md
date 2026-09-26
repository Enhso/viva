# 07 — Report

Depends on: `03-mutation-pipeline.md` (taxonomy labels), `05-question-loop.md`
(per-input results), `06-confidence-widget.md` (exact confidence values).
Feeds into: `08-language-layer.md` (report text needs translation if Darija/
French selected), `09-disclosure.md` (Jev/embedding usage needs disclosure).

This is where brief §4's success criterion #3 lives: "does the report
visibly and legibly separate the two tiers such that Hatim could point at it
in a demo and explain the rule in one sentence, and have it land as
considered rather than defensive." Everything below is in service of that.

---

## 1. Timing: one single report screen at the end

**Decision:** no per-mutant micro-reveal beyond what `05-question-loop.md`
already specifies (immediate right/wrong per individual prediction). The
**aggregated** report — patterns across mutants, calibration buckets, the
"here's what you actually understood" synthesis — appears **once**, after
the entire viva is complete across all selected functions.

**Why this is a real design choice, not a default (preserved reasoning):**
this preserves suspense at the *viva* level even though individual
right/wrong is known immediately as the student goes (`05-question-loop.md`
§2) — the *pattern* of understanding isn't visible until the report
assembles it, which is something a per-mutant micro-reveal structurally
couldn't show (e.g., "confidently wrong specifically on boundary questions,
well-calibrated everywhere else" is a cross-mutant claim, invisible mutant-
by-mutant).

## 2. Top-level structure: summary, then four calibration buckets

```
[Summary]
  - Per-bucket counts (all four)
  - Aggregate calibration metric (mean Brier score across all answers, or
    equivalent — implementation's call on exact metric)
  - If confidently-wrong count > 0: points toward that bucket
  - If confidently-wrong count == 0: genuine congratulation, no redirect
    (see §3)
  ↓
[Confidently right]  [Confidently wrong]  [Uncertain & right]  [Uncertain & wrong]
   (baseline)          (enriched, see §5)      (baseline)          (baseline)
```

**Organizing principle: calibration bucket, not function and not taxonomy
category.** This was chosen deliberately over two alternatives (per-function
grouping, per-taxonomy-category grouping) specifically so the report's
primary axis matches brief §1.5's pitch claim — "surfaces exactly where a
student is sure of something they've got backwards" — rather than the pitch
promising one story and the report telling a differently-organized one.

## 3. The four buckets and the threshold

- **Confidently right** — confidence ≥ 50%, prediction correct.
- **Confidently wrong** — confidence ≥ 50%, prediction incorrect. *This is
  the headline bucket* per brief §1.5.
- **Uncertain & right** — confidence < 50%, prediction correct.
- **Uncertain & wrong** — confidence < 50%, prediction incorrect.

**Threshold is a fixed 50%, identical for every student and every viva.**
A per-student median-adjusted threshold was considered and explicitly
rejected: it would make the cutoff a function of the very data it
categorizes, unstable with the handful of data points one viva produces (a
single unusual answer could shift the threshold and retroactively flip other
answers' buckets), and would silently convert "confidently wrong" from a
flat, computed behavioral fact (which is the entire reason Tier 1 language
in §4 gets to be stated plainly, no hedging) into a claim relative to the
student's own other answers — requiring its own footnote to remain honest,
which defeats the purpose. Fixed 50% also has a clean, one-sentence
justification for a demo: it's the natural indifference point, and it's the
same number the confidence widget's own legend (`06-confidence-widget.md`)
already uses to mean "no real belief either way."

**Zero-confidently-wrong is a genuinely good outcome, not an edge case to
patch around.** The summary should say so plainly — a real congratulation —
and **not** redirect attention to another bucket instead. Don't manufacture
a "but here's what to look at" when there's honestly nothing to flag.

## 4. The two-tier language rule (settled — do not re-litigate without a real reason)

Per brief §2.5, this rule governs every entry in every bucket:

- **Tier 1 — behavioral facts, stated flatly, no hedging.** Things the
  system *computed* by executing code in a sandbox: "answered X, correct
  answer was Y, confidence was Z%." Deterministic, earns confident language.
- **Tier 2 — the LLM's guessed misconception category, visibly
  provisional.** E.g., "the system's best guess: this tests off-by-one
  reasoning (unverified category)." Needs **different visual treatment**,
  not just softer wording buried in the same sentence — the hedge has to be
  structurally visible, not a qualifier easy to skim past.

**The reasoning to preserve, verbatim in spirit:** hedge exactly where the
epistemics actually live. Stating a computed fact with false modesty is
dishonest in the other direction from overclaiming a guess. This should be
sayable to a jury as one clear rule, and it should visibly hold up as
something meant, not a reflexive hedge-everything habit.

**Exact wording/visual treatment of the Tier 2 hedge is explicitly NOT
settled by this spec** — see `00-master.md` §4. The rule is fixed; its
execution is build-day work.

## 5. Within-bucket structure: uniform base, "confidently wrong" enriched

**All four buckets share the same base structure:** entries grouped by
taxonomy label (see §6 for how grouping/matching actually works), each
group showing its member entries' Tier 1 facts.

**"Confidently wrong" additionally gets, on top of that same base
structure:**
- **Structural addition:** each entry's mutated code is **re-displayed**
  alongside its Tier 1 facts — the student re-confronts the actual diff,
  not just a text summary of what happened.
- **Narrative addition:** each taxonomy-label group gets a short
  **synthesized connecting line**, written as prose tying the pattern
  together — e.g., "you got 2 of 2 boundary questions wrong with over 70%
  confidence" — rather than presenting the same information as disconnected
  line items.

**The other three buckets (confidently right, uncertain & right, uncertain
& wrong) stay at the baseline:** taxonomy-grouped Tier 1 facts, no
re-displayed code, no synthesized prose. This was a deliberate scoping
decision — the headline bucket earns the deeper treatment because that's
where brief §1.5's actual claim lives; the other three don't need forensic
depth to serve the report's purpose.

**Why lead with the label, not the raw facts (preserved reasoning, stated by
Hatim directly and worth keeping close to this exact framing):** the goal is
for the student to understand the *abstract concept* they're missing, not
the specific technical implementation detail they got wrong. This matters
especially in an LLM-assisted-coding context — a student can produce code
that passes checkpoints without ever forming the concept it embodies, so
"you don't yet have a working model of inclusive-vs-exclusive boundaries"
(conceptual, transferable) is more useful than "you got the boundary
condition wrong on line 12" (technical, local) — the former is what'll
actually bite them on different code next week. This is why the taxonomy
label is the primary, most prominent thing displayed on a bucket entry, with
Tier 1 facts as supporting detail underneath — even though Tier 2 is the
*less certain* tier. The hedge (different visual treatment, per §4) has to
survive being visually first, not rely on being visually secondary to read
as provisional.

## 6. Taxonomy-label grouping: Jev primary, embedding-similarity fallback

Grouping entries within a bucket by shared taxonomy label requires deciding
whether two independently-generated labels (e.g., "off-by-one" and "index
boundary handling," produced in two separate LLM judgments) refer to the
**same underlying concept**. This is itself a judgment call riding on top of
already-provisional labels — worth being precise about, since it compounds
uncertainty rather than just repeating it.

**Primary mechanism: Jev** (TypeSafe AI, `typesafe.ai` — a "System One
Model," announced Sept 15 2026, currently in early access). Used
**specifically and only** for this same-concept classification decision —
not for the main filter/label call in `03-mutation-pipeline.md`, not for the
over-threshold triage call, not for anything else. Jev's own positioning
(per TypeSafe's launch post) is closed, structured classification — "typed
probabilistic decisions out" — which is a reasonable fit for a same/
different binary decision, though it's a brand-new, early-access product
with no independent track record; treat integration as untested until
proven during build.

**Fallback mechanism: embedding similarity.** If Jev integration fails or
doesn't land in time:
- Embed both labels (free-tier embedding provider — no preference stated;
  default to whichever is cheapest/fastest to wire up given existing
  provider keys).
- Compute cosine similarity.
- **Fixed, untuned threshold** for the same/different cutoff (pick a
  reasonable constant, e.g. ~0.85, during build — this is explicitly a
  placeholder, not a principled number; threshold tuning is future-iteration
  work, not tomorrow's).

**This fallback relationship must be stated plainly in `09-disclosure.md`**
— both mechanisms exist, Jev is primary, embedding similarity is the
tested-if-needed fallback, and the threshold is an acknowledged rough
placeholder.

## 7. What this hands off

To `08-language-layer.md`: all report text (bucket names, synthesized
narrative lines, taxonomy labels, summary copy) needs to route through
whatever language-rendering approach that doc specifies, if the student is
using French or Darija.

To `09-disclosure.md`: full accounting of Jev usage, embedding fallback,
and the fixed-threshold caveat.
