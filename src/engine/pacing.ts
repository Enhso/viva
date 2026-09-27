// Placeholder pacing constants (05 §1-2, 06 §4; ticket 16, ticket 20). Question-loop pacing is
// Hatim's call (CLAUDE.md, `hatim`) — these are scaffolding values, not settled ones. Single-
// sourced here so the selection screen's beat estimate (08) and the question loop (16) read the
// same numbers instead of drifting apart. Ticket 20 replaces both values with Hatim's dictated
// ones and removes this placeholder marker.

/** K: beats per mutant — how many of its distinguishing inputs the student answers. Provisional. */
export const BEATS_PER_MUTANT = 2;

/** M: mutants per function — how many surviving mutants of one function the viva asks about. Provisional. */
export const MUTANTS_PER_FUNCTION = 3;

/** A rough beat count for N selected functions, from the two placeholder constants above. */
export function estimateBeatCount(selectedFunctionCount: number): number {
  return selectedFunctionCount * MUTANTS_PER_FUNCTION * BEATS_PER_MUTANT;
}
