# 19: Report

**What to build:** After the last beat of the whole viva, one report screen assembles the pattern.
- **Summary:** all four bucket counts and the mean Brier score. If any beat was confidently wrong, the summary points there; if none was, it congratulates the student plainly and redirects nowhere.
- **Four calibration buckets:** confidently right, confidently wrong, uncertain & right, uncertain & wrong. Each groups its beats by taxonomy label, exact label text for now (ticket 22 adds same-concept grouping). The label comes first and is most prominent, with Tier 1 facts under it stated flatly.
- **Confidently wrong** additionally re-shows each entry's mutated code and gives each label group a short connecting line built from Tier 1 facts ("you got 2 of 2 boundary questions wrong with over 70% confidence").

All Tier 2 content (labels now, grouping later) renders through one component, whose treatment ticket 21 decides.

**Blocked by:** 10

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 07 §1–5

- [ ] The report appears once, after the final beat; nothing aggregated shows earlier.
- [ ] The summary shows four counts, the mean Brier score, and either the confidently-wrong pointer or the plain congratulation at zero.
- [ ] Bucket placement uses grading's fixed 50% threshold.
- [ ] Tier 1 facts are unhedged: "answered X, correct answer was Y, confidence Z%".
- [ ] All four buckets share the base structure; only confidently wrong adds re-shown code and connecting lines.
- [ ] Connecting lines are templated from computed facts plus the label, and the templates live in the string table; no model call assembles the report.
- [ ] Every Tier 2 element goes through one component, visibly distinct from Tier 1, with a placeholder treatment marked as pending ticket 21.
- [ ] A fallback-mode viva shows its entries in an explicit "unlabelled" group, and the report says it ran in fallback mode.
- [ ] Verified against a recorded, labelled viva checked in as a test fixture, and against a live fallback run.
- [ ] Aggregation (counts, grouping, the facts behind connecting lines) is test-first in grading.

## Comments
