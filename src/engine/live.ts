import { extractFunctions } from "./extract";
import { findDistinguishingInputs } from "./fallback";
import { sharedBattery } from "./battery";
import type { SandboxRunner } from "./sandbox/types";
import type { Beat, CandidateMutant, SurvivingMutant, Viva } from "./types";

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
  for (const { candidate, taxonomyLabel } of loadedMutants) {
    const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
    if (answerKey.length === 0) continue;
    const mutant: SurvivingMutant = { ...candidate, answerKey, taxonomyLabel };
    answerKey.forEach((entry, index) => beats.push({ id: `${mutant.id}#${index}`, function: fn, mutant, ...entry }));
  }
  return { mode: "live", beats };
}
