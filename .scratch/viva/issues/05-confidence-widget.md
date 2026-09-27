# 05: Confidence widget

**What to build:** Each beat's confidence comes from a Metaculus-style widget: a slider dragged in 1% steps, +/− buttons flanking the handle for 0.1% nudges, and a numeric box beneath for direct 0.1% entry, all bound to one value. An optional legend turns percentages into felt meaning ("Guessing", "Fairly sure", …); clicking a legend bucket snaps the value to a representative point inside it. The exact value the student lands on reaches scoring unrounded. This replaces the tracer bullet's plain number box.

**Blocked by:** 01

**Status:** done

**Type:** plumbing
**Spec:** 06 §1–4, 07 §3

- [x] Slider, buttons, and box stay in sync whichever of the three the student uses.
- [x] Dragging moves in 1% steps; the buttons and box work at 0.1%.
- [x] Values clamp to 0–100.0%; repeated button presses never produce float noise such as 67.30000000000001.
- [x] Clicking a legend bucket snaps to a representative value inside it; dragging never snaps.
- [x] The legend treats 50% as its indifference point ("no real belief either way"), matching the report's fixed threshold.
- [x] The confidence recorded for the beat equals what the widget shows: 67.3% stays 67.3% through to the Brier calculation.
- [x] Legend labels and widget copy come from the string table.

## Comments

Ruling: value arithmetic lives in `src/ui/confidence.ts` as an integer count of
tenths-of-a-percent (0..1000), converted to a plain percent number only at the
component boundary (rendering and the one `onChange(percent)` call up to
`BeatScreen`) — this is what makes repeated 0.1% nudges float-noise-free
without ever touching a rounding rule that could leak into scoring. Cost if
wrong: a different internal representation (e.g. holding a string, or plain
floats with post-hoc rounding) would need re-deriving the same tenths-safe
math anyway; low cost to change since the tenths boundary is one module.

Ruling: five legend buckets (Guessing/Leaning/No real belief either
way/Fairly sure/Certain at 0–20/20–40/40–60/60–80/80–100, snapping to
10/30/50/70/90%) — spec 06 §2 leaves bucket count and boundaries to
implementation. The middle bucket straddles 50% exactly and snaps to 50.0,
satisfying the indifference-point requirement. Cost if wrong: Hatim can
retune boundaries/snap points by editing `LEGEND_BUCKETS` in
`src/ui/confidence.ts` and the five label strings in `en.ts`; no other file
changes.

Ruling: default confidence on a fresh beat is 50.0% (the indifference point)
rather than empty/invalid, since a range slider has no natural "unset"
state. Cost if wrong: trivial one-line change in `BeatScreen.tsx`.

Ruling: skipped the slider's visual fill (CLAUDE.md D8a forbids inline
styles, and reading a CSS custom property from a `data-` attribute via
`attr()` for a length isn't reliably supported); a plain native `<input
type="range">` still shows the handle position, so no information is lost.
Cost if wrong: adding the fill later is a self-contained CSS + one
class/`data-` attribute change to `ConfidenceWidget.tsx` and the widget's
delimited block in `styles.css`.

## Answer

Built `src/ui/confidence.ts` (tenths-based clamp/nudge/slider-step/legend-snap
arithmetic, unit-tested in `src/ui/confidence.test.ts`) and
`src/ui/ConfidenceWidget.tsx` (slider + ± buttons + numeric box + legend, all
bound to one value), and swapped it into `BeatScreen.tsx` in place of the
ticket-01 plain number box. Legend and control copy added to
`src/ui/strings/en.ts`. Styles added as a single delimited block in
`src/ui/styles.css` reusing existing tokens, no inline styles. Verified in
the browser via a fallback-mode viva run: box entry of 67.3% reached the
reveal screen's "Your confidence: 67.3%" unrounded, legend clicks snap
(e.g. "Certain" → 90.0%), and nudge buttons move the box by exactly 0.1
without drifting the slider's whole-percent display.
