import { sharedBattery } from "./battery";
import { extractFunctions } from "./extract";
import { generateCandidateMutants } from "./mutate";
import { buildBeatsForMutant, MULTIPLE_CHOICE_SEED } from "./multiple-choice";
import { sameOutput } from "./outputs";
import { BEATS_PER_MUTANT } from "./pacing";
import { createPrng } from "./prng";
import { inferParamShapes } from "./shapes";
import type { SandboxRunner } from "./sandbox/types";
import { targetedSearch } from "./targeted-search";
import type { AnswerKey, CandidateMutant, EligibleFunction, EquivalentDrop, Input, Viva } from "./types";

// The reason recorded against an EquivalentDrop (09 §1 step 4): both stages of input
// generation ran and neither found a distinguishing input, so the mutant is dropped as
// equivalent before any beat is built. This runs *after* the filter call has already approved
// and labeled a mutant (04 §1); it is the final gate on whether a mutant is used, not the
// filter call's approval.
export const EQUIVALENT_DROP_REASON =
  "no distinguishing input found in the shared battery or the bounded targeted search";

export interface FallbackVivaRequest {
  source: string;
  functionName: string;
}

/**
 * Fallback mode (03 §6): no model. Default edge-case inputs, the first candidate mutant (in
 * source order) whose output changes, templated wording. Works with any SandboxRunner.
 *
 * Ticket 16: that one mutant is asked over up to BEATS_PER_MUTANT (K) of its distinguishing
 * inputs, taken from the front of its answer key -- never all of them, and never batched into
 * one beat. Fallback never asks about more than this single mutant (M doesn't apply here: 03 §6
 * fixes fallback to "the first output-changing mutant per function").
 */
export async function runFallbackViva({ source, functionName }: FallbackVivaRequest, runner: SandboxRunner): Promise<Viva> {
  const fn = extractFunctions(source).find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`No function named ${functionName} in the given source`);

  const battery = sharedBattery(fn);
  const drops: EquivalentDrop[] = [];
  const allCandidates = generateCandidateMutants(fn);
  const random = createPrng(MULTIPLE_CHOICE_SEED);
  for (const candidate of allCandidates) {
    const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
    if (answerKey.length === 0) {
      drops.push({ mutant: candidate, reason: EQUIVALENT_DROP_REASON });
      continue;
    }
    const mutant = { ...candidate, answerKey, taxonomyLabel: null };
    const otherCandidates = allCandidates.filter((other) => other.id !== candidate.id);
    const beats = await buildBeatsForMutant(fn, mutant, answerKey.slice(0, BEATS_PER_MUTANT), otherCandidates, runner, random);
    return { mode: "fallback", beats, drops };
  }
  return { mode: "fallback", beats: [], drops };
}

/**
 * Shared with the live path (06): the answer key for one candidate against the shared battery
 * first (09 §1 step 2), falling back to a bounded, fixed-seed targeted search (step 3) only
 * when the battery distinguished nothing. An empty result here means both stages ran and found
 * nothing -- the caller records the equivalent-mutant drop (step 4); this function itself only
 * ever reports what it found.
 */
export async function findDistinguishingInputs(
  fn: EligibleFunction,
  mutant: CandidateMutant,
  battery: Input[],
  runner: SandboxRunner,
): Promise<AnswerKey> {
  const answerKey: AnswerKey = [];
  for (const input of battery) {
    const originalOutput = await runner.run({ source: fn.source, functionName: fn.name, input });
    const mutantOutput = await runner.run({ source: mutant.source, functionName: fn.name, input });
    if (!sameOutput(originalOutput, mutantOutput)) answerKey.push({ input, originalOutput, mutantOutput });
  }
  if (answerKey.length > 0) return answerKey;

  const shapes = inferParamShapes(fn);
  const found = await targetedSearch(fn, mutant, shapes, runner);
  return found ? [found] : [];
}
