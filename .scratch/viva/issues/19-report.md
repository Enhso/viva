# 19: Report

**What to build:** After the last beat of the whole viva, one report screen assembles the pattern.
- **Summary:** all four bucket counts and the mean Brier score. If any beat was confidently wrong, the summary points there; if none was, it congratulates the student plainly and redirects nowhere.
- **Four calibration buckets:** confidently right, confidently wrong, uncertain & right, uncertain & wrong. Each groups its beats by taxonomy label, exact label text for now (ticket 22 adds same-concept grouping). The label comes first and is most prominent, with Tier 1 facts under it stated flatly.
- **Confidently wrong** additionally re-shows each entry's mutated code and gives each label group a short connecting line built from Tier 1 facts ("you got 2 of 2 boundary questions wrong with over 70% confidence").

All Tier 2 content (labels now, grouping later) renders through one component, whose treatment ticket 21 decides.

**Blocked by:** 10

**Status:** done

**Type:** plumbing
**Spec:** 07 §1–5

- [x] The report appears once, after the final beat; nothing aggregated shows earlier.
- [x] The summary shows four counts, the mean Brier score, and either the confidently-wrong pointer or the plain congratulation at zero.
- [x] Bucket placement uses grading's fixed 50% threshold.
- [x] Tier 1 facts are unhedged: "answered X, correct answer was Y, confidence Z%".
- [x] All four buckets share the base structure; only confidently wrong adds re-shown code and connecting lines.
- [x] Connecting lines are templated from computed facts plus the label, and the templates live in the string table; no model call assembles the report.
- [x] Every Tier 2 element goes through one component, visibly distinct from Tier 1, with a placeholder treatment marked as pending ticket 21.
- [x] A fallback-mode viva shows its entries in an explicit "unlabelled" group, and the report says it ran in fallback mode.
- [x] Verified against a recorded, labelled viva checked in as a test fixture, and against a live fallback run.
- [x] Aggregation (counts, grouping, the facts behind connecting lines) is test-first in grading.

## Comments

Ruling: the connecting line's "X of Y" denominator is the label's total occurrences across the *whole* viva (every bucket), not just the group's size within confidently-wrong — so "2 of 3" means 2 of that label's 3 total occurrences were wrong-and-confident, rather than a number trivially equal to itself. Cost if wrong: easy to change `labelTotals`'s scope in `report.ts`'s `buildReport`.

Ruling: the connecting line's confidence figure is the group's *minimum* confidence, floored to the nearest 10 ("over 70%") — a floor that's true of every entry in the group, cheaper than a mean and conservative rather than flattering. Cost if wrong: one-line change in `groupByLabel`.

Ruling: `ReportEntry` now carries the underlying `Beat` (not just the flat Tier 1 fields ticket 10 had), so confidently-wrong's re-shown code reuses the existing `MutantCode` component unchanged instead of `report.ts` re-deriving docstring/diff-line fields itself. Cost if wrong: `Report`'s public shape is now wider (a full `Beat` per entry) than the minimal set ticket 10 exposed; trivial to narrow later since nothing outside `ReportScreen.tsx` reads it.

Ruling: the connecting line's template assembly (via `t()`) stays inside `report.ts` (grading), on the same path ticket 10 already used for `correctAnswer` — keeps "no model call assembles the report" and "templates live in the string table" both provable from grading's own tests, rather than splitting template-filling into the UI layer.

Ruling: the `<Tier2>` component wraps both the raw taxonomy label and the synthesized connecting line (the line names the label, so it's exactly as provisional), even though the ticket text says "labels now, grouping later" without mentioning the line. This reads as the more literal match for "every Tier 2 element goes through one component." Cost if wrong: ticket 21 may want the connecting line treated as Tier 1 prose instead; a one-line unwrap in `ReportScreen.tsx`.

## Answer

Built the full report: `buildReport(results, mode)` (`src/grading/report.ts`) now returns `{ bucketCounts, meanBrier, fallback, buckets }`, where each of the four `BucketReport`s groups its `ReportEntry`s into `LabelGroup`s by exact taxonomy-label text (`label: null` is the explicit "unlabelled" group for fallback beats). Confidently-wrong's labelled groups additionally carry a `connectingLine` (null everywhere else, and null for the unlabelled group), templated through the existing `t()`/string-table path via the new `report.connectingLine` key. `ReportScreen.tsx` renders the summary (counts, mean Brier, pointer-or-congratulation per `report.bucketCounts["confidently-wrong"]`), a fallback banner when `report.fallback`, and each bucket's label groups — re-showing `MutantCode` and the connecting line only for confidently-wrong. Every Tier 2 element (the label, the connecting line) routes through the new `Tier2` component (`src/ui/Tier2.tsx`), a placeholder treatment (dashed underline + marker, `title` naming ticket 21) visibly distinct from Tier 1's plain text. `App.tsx`'s one call site now passes `state.viva.mode`. New test-first coverage in `src/grading/report.test.ts` uses a hand-assembled recorded viva (`src/grading/fixtures/recorded-labelled-viva.ts`, kept out of `fixtures/functions/` per the ticket) covering all four buckets, multi-entry label groups, the unlabelled group, and both connecting-line cases; `grading.test.ts`'s stale `buildReport` block (ticket 10's flat shape) was removed in favor of this file. Verified live in fallback mode via `npm run dev` + Playwright: the report screen showed the fallback banner, the four counts, mean Brier, the confidently-wrong pointer, an "Unlabelled" group (all fallback beats carry no taxonomy label), and re-shown mutated code with flat Tier 1 facts per entry.
