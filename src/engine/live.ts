import { extractFunctions } from "./extract";
import { EQUIVALENT_DROP_REASON, findDistinguishingInputs } from "./fallback";
import { sharedBattery } from "./battery";
import { BEATS_PER_MUTANT, MUTANTS_PER_FUNCTION } from "./pacing";
import type { SandboxRunner } from "./sandbox/types";
import type { Beat, CandidateMutant, EquivalentDrop, SurvivingMutant, Viva } from "./types";

export interface LiveVivaRequest {
  source: string;
  functionName: string;
}

/** One candidate mutant that survived the filter call, with the label the model gave it. */
export interface LoadedMutant {
  candidate: CandidateMutant;
  taxonomyLabel: string;
}

/**
 * Live mode (03 §2, ticket 06): the filter call runs outside the engine (src/llm), which
 * selects and labels candidates. This seam takes that result as plain data — the engine
 * never imports src/llm (architecture-boundary.test.ts) — and computes the answer key the
 * same way fallback does: shared battery first, execution-verified.
 *
 * A loaded mutant with no distinguishing input on the battery is an equivalent mutant
 * (CONTEXT.md) and is dropped before any question is asked.
 *
 * Viva length is bounded by two placeholder constants (ticket 16, pacing.ts): at most
 * MUTANTS_PER_FUNCTION (M) surviving mutants are asked about, taken in the order the filter
 * call handed them back (its own ranking; simplest defensible order for a placeholder -- ticket
 * 20 owns the real one), and each gets at most BEATS_PER_MUTANT (K) beats, taken from the front
 * of its answer key (conforming/degenerate-first, per the shared battery's ordering). A mutant
 * that turns out equivalent doesn't count against M -- only mutants actually asked do.
 */
export async function runLiveViva(
  { source, functionName }: LiveVivaRequest,
  loadedMutants: LoadedMutant[],
  runner: SandboxRunner,
): Promise<Viva> {
  const fn = extractFunctions(source).find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`No function named ${functionName} in the given source`);

  const battery = sharedBattery(fn);
  const beats: Beat[] = [];
  const drops: EquivalentDrop[] = [];
  let mutantsAsked = 0;
  for (const { candidate, taxonomyLabel } of loadedMutants) {
    if (mutantsAsked >= MUTANTS_PER_FUNCTION) break;
    const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
    if (answerKey.length === 0) {
      drops.push({ mutant: candidate, reason: EQUIVALENT_DROP_REASON });
      continue;
    }
    const mutant: SurvivingMutant = { ...candidate, answerKey, taxonomyLabel };
    answerKey
      .slice(0, BEATS_PER_MUTANT)
      .forEach((entry, index) => beats.push({ id: `${mutant.id}#${index}`, function: fn, mutant, ...entry }));
    mutantsAsked++;
  }
  return { mode: "live", beats, drops };
}
