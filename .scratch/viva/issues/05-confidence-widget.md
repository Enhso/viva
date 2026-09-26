# 05: Confidence widget

**What to build:** Each beat's confidence comes from a Metaculus-style widget: a slider dragged in 1% steps, +/− buttons flanking the handle for 0.1% nudges, and a numeric box beneath for direct 0.1% entry, all bound to one value. An optional legend turns percentages into felt meaning ("Guessing", "Fairly sure", …); clicking a legend bucket snaps the value to a representative point inside it. The exact value the student lands on reaches scoring unrounded. This replaces the tracer bullet's plain number box.

**Blocked by:** 01

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 06 §1–4, 07 §3

- [ ] Slider, buttons, and box stay in sync whichever of the three the student uses.
- [ ] Dragging moves in 1% steps; the buttons and box work at 0.1%.
- [ ] Values clamp to 0–100.0%; repeated button presses never produce float noise such as 67.30000000000001.
- [ ] Clicking a legend bucket snaps to a representative value inside it; dragging never snaps.
- [ ] The legend treats 50% as its indifference point ("no real belief either way"), matching the report's fixed threshold.
- [ ] The confidence recorded for the beat equals what the widget shows: 67.3% stays 67.3% through to the Brier calculation.
- [ ] Legend labels and widget copy come from the string table.

## Comments
