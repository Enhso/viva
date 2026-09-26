# 20: Question-loop pacing and format weighting

**What to build:** Hatim runs himself through real vivas as the student and decides the felt sequence (question → answer → reveal → next), plus the knobs the mechanics exposed as placeholders:
- beats per mutant (K) and mutants per function (M);
- the free-text/multiple-choice weighting constants;
- whether a taxonomy label appears during the loop or only in the report.

This is success criterion #2: did it produce an "oh" moment. Agents build what he dictates, verbatim. On request, the `prototype` skill's UI branch can produce throwaway variants, published as artifacts.

**Blocked by:** 05, 16, 18. The pacing half can start as soon as 16 lands; the weighting half needs 18.

**Status:** ready-for-human

**Type:** hatim
**Spec:** 05 (pacing), 00 §4, brief §2.4, 00 §5 #2

- [ ] Hatim's pacing decisions are applied verbatim.
- [ ] K, M, and the weighting constants are set to Hatim's values, and their placeholder markers are removed.
- [ ] Label-in-loop is decided.

## Comments

Options on the table, each named by what it would make observable:
- **Control beats.** Every beat's input is distinguishing, so "same as the original" is never the right answer. A student who notices gets a free elimination against exactly the shallow "this change does nothing here" read that the information-theoretic axis targets. Occasional beats where the mutant's output equals the original's would restore that trap. This changes 05 §2 (beats use distinguishing inputs) and the distractor pool in ticket 18. Not built unless Hatim says so.
- **Label at reveal vs. held for the report.** Shown at reveal, it teaches the concept in the moment; held back, it keeps the viva-level suspense that 07 §1 protects.
