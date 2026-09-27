import { sameOutput } from "./outputs";
import type { RunOutcome } from "./sandbox/types";

/**
 * Whether an input distinguishes a mutant from the original: the outputs differ under the single
 * output equality, and neither side timed out. Ticket 04, R3 (Hatim): a timeout never counts as a
 * distinguishing output — it can't be verified as non-termination, and no prediction can name it.
 */
export function distinguishes(originalOutput: RunOutcome, mutantOutput: RunOutcome): boolean {
  if (originalOutput.kind === "timeout" || mutantOutput.kind === "timeout") return false;
  return !sameOutput(originalOutput, mutantOutput);
}
