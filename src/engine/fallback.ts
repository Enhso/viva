import { sharedBattery } from "./battery";
import { extractFunctions } from "./extract";
import { generateCandidateMutants } from "./mutate";
import { distinguishes } from "./distinguish";
import { BEATS_PER_MUTANT } from "./pacing";
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
  for (const candidate of generateCandidateMutants(fn)) {
    const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
    if (answerKey.length === 0) {
      drops.push({ mutant: candidate, reason: EQUIVALENT_DROP_REASON });
      continue;
    }
    const mutant = { ...candidate, answerKey, taxonomyLabel: null };
    const beats = answerKey
      .slice(0, BEATS_PER_MUTANT)
      .map((entry, index) => ({ id: `${mutant.id}#${index}`, function: fn, mutant, ...entry }));
    return { mode: "fallback", beats, drops };
  }
  return { mode: "fallback", beats: [], drops };
}

/**
 * Ruling (orchestrator, review fix): a timeout never distinguishes (ticket 04, R3), and each one
 * costs a full sandbox timeout, so a mutant stops probing after this many and skips the targeted
 * search (which would pay one timeout per run) — cost if wrong: a mutant that loops on some
 * inputs but differs on later ones loses those beats.
 */
export const TIMEOUT_BUDGET = 2;

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
  let timeouts = 0;
  for (const input of battery) {
    const originalOutput = await runner.run({ source: fn.source, functionName: fn.name, input });
    const mutantOutput = await runner.run({ source: mutant.source, functionName: fn.name, input });
    if (originalOutput.kind === "timeout" || mutantOutput.kind === "timeout") {
      if (++timeouts >= TIMEOUT_BUDGET) break;
      continue;
    }
    if (distinguishes(originalOutput, mutantOutput)) answerKey.push({ input, originalOutput, mutantOutput });
  }
  if (answerKey.length > 0 || timeouts > 0) return answerKey;

  const shapes = inferParamShapes(fn);
  const found = await targetedSearch(fn, mutant, shapes, runner);
  return found ? [found] : [];
}
