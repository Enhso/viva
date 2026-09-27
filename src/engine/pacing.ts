// Placeholder pacing constants (05 §1-2, 06 §4; ticket 16, ticket 20). Question-loop pacing is
// Hatim's call (CLAUDE.md, `hatim`) — these are scaffolding values, not settled ones. Single-
// sourced here so the selection screen's beat estimate (08) and the question loop (16) read the
// same numbers instead of drifting apart. Ticket 20 replaces both values with Hatim's dictated
// ones and removes this placeholder marker.

/** K: beats per mutant — how many of its distinguishing inputs the student answers. Provisional. */
export const BEATS_PER_MUTANT = 2;

/** M: mutants per function — how many surviving mutants of one function the viva asks about. Provisional. */
export const MUTANTS_PER_FUNCTION = 3;

/**
 * Ticket 18 (05 §3): weighted-random free-text/multiple-choice format draw, not a fixed rule.
 * Both weights are the *free-text* probability and, like K/M above, are placeholder values
 * pending Hatim's call in ticket 20 -- single-sourced here so the question loop reads the same
 * numbers the spec's "~80/20" and "~50/50" describe.
 */
/** Weight for a mutant's first beat: heavily free-text (spec's "~80% free-text / 20% MCQ"). Provisional. */
export const FIRST_BEAT_FREE_TEXT_WEIGHT = 0.8;

/** Weight for a mutant's later beats: close to even (spec's "~50/50"). Provisional. */
export const LATER_BEAT_FREE_TEXT_WEIGHT = 0.5;

/** A rough beat count for N selected functions, from the two placeholder constants above. */
export function estimateBeatCount(selectedFunctionCount: number): number {
  return selectedFunctionCount * MUTANTS_PER_FUNCTION * BEATS_PER_MUTANT;
}
