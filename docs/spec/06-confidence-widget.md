# 06 — Confidence Widget

Depends on: `05-question-loop.md` (each question needs a confidence
statement attached).
Feeds into: `07-report.md` (exact confidence values drive Brier scoring and
calibration-bucket placement).

---

## 1. The widget: three coupled controls, one underlying value

Modeled on Metaculus-style forecasting input (Hatim's own daily-use
reference point, not an arbitrary UX choice):

- **Slider** — coarse, fast interaction. Dragging moves in **1% increments**.
- **+/− buttons**, flanking the slider handle — fine correction, **0.1%
  increments**. These exist specifically so a student can nudge precisely
  without needing to switch to the numeric box for small adjustments.
- **Numeric input box**, beneath the slider — direct entry at full **0.1%**
  precision.

**All three stay in sync to the same underlying value at all times.** This
is one widget with three input paths, not three separate modes the student
picks between.

## 2. Optional legend, with click-to-snap

An optional interpretive legend may be shown (e.g., "Guessing: 0–20%,"
"Fairly sure: ...," "Certain: ..." — exact bucket boundaries and count are
implementation's call, not specified here) to help students without
Hatim's forecasting background translate a percentage into a felt meaning.

**Clicking a legend bucket snaps the slider to a representative value inside
that bucket** (e.g., clicking "Guessing" might jump to 10%) — it is not
purely decorative text sitting next to the scale. This is the only "snap"
behavior in the widget; the slider drag itself does not snap to legend
boundaries.

## 3. Scoring precision: exact value, no rounding

**Decision:** the Brier score is computed on the **exact numeric value** the
student lands on — 67.3% and 67.0% are genuinely different for scoring
purposes. The numeric box's extra precision (0.1% vs. the slider drag's 1%)
is not cosmetic — it's real precision that feeds real scoring. Do not round
to a coarser bucket (e.g., nearest 1% or 5%) "for simplicity" anywhere in
the calculation path.

## 4. Granularity: per input, not per mutant

Per `05-question-loop.md` §2: confidence is stated **once per input**
(i.e., once per predict-then-reveal beat), not once per mutant covering
multiple inputs. This is what allows the report's Tier 1 language (brief
§2.5's example: "gave the wrong answer with high confidence on 2 of 2
boundary questions") to be a genuinely computed fact rather than an average
or approximation.

## 5. What this hands off

To `07-report.md`: an exact confidence value (0–100.0%, 0.1% precision) per
individual answered input, ready for Brier calculation and the fixed-50%
confident/uncertain threshold used in calibration-bucket placement.
