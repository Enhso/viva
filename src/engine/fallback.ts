import { sharedBattery } from "./battery";
import { extractFunctions } from "./extract";
import { generateCandidateMutants } from "./mutate";
import { sameOutput } from "./outputs";
import type { SandboxRunner } from "./sandbox/types";
import type { AnswerKey, CandidateMutant, EligibleFunction, Input, Viva } from "./types";

export interface FallbackVivaRequest {
  source: string;
  functionName: string;
}

/**
 * Fallback mode (03 §6): no model. Default edge-case inputs, the first candidate mutant (in
 * source order) whose output changes, templated wording. Works with any SandboxRunner.
 */
export async function runFallbackViva({ source, functionName }: FallbackVivaRequest, runner: SandboxRunner): Promise<Viva> {
  const fn = extractFunctions(source).find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`No function named ${functionName} in the given source`);

  const battery = sharedBattery(fn);
  for (const candidate of generateCandidateMutants(fn)) {
    const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
    if (answerKey.length === 0) continue;
    const mutant = { ...candidate, answerKey, taxonomyLabel: null };
    return { mode: "fallback", beats: [{ id: `${mutant.id}#0`, function: fn, mutant, ...answerKey[0] }] };
  }
  return { mode: "fallback", beats: [] };
}

/** Shared with the live path (06): the answer key for one candidate against the shared battery. */
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
  return answerKey;
}
