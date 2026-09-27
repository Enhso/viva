// Model-free by construction: nothing here may import from src/llm (architecture-boundary.test.ts).
// The Node runner (sandbox/node-runner.ts) is deliberately not re-exported: browser code must not bundle node:vm.
export { extractFunctions, scanFunctions, type RejectedFunction } from "./extract";
export { type ScopeViolation } from "./scope";
export { generateCandidateMutants } from "./mutate";
export { complexityScore, orderByComplexity, type OrderedFunction } from "./complexity";
export {
  BEATS_PER_MUTANT,
  MUTANTS_PER_FUNCTION,
  FIRST_BEAT_FREE_TEXT_WEIGHT,
  LATER_BEAT_FREE_TEXT_WEIGHT,
  estimateBeatCount,
} from "./pacing";
export { createPrng } from "./prng";
export {
  chooseBeatFormat,
  collectDistractorOutputs,
  shuffleOptions,
  MAX_DISTRACTOR_CANDIDATES_TRIED,
  MAX_MULTIPLE_CHOICE_OPTIONS,
  MULTIPLE_CHOICE_SEED,
} from "./multiple-choice";
export { sharedBattery } from "./battery";
export { inferParamShapes, type ParamShape } from "./shapes";
export { targetedSearch, TARGETED_SEARCH_SEED, TARGETED_SEARCH_RUNS } from "./targeted-search";
export { canonicalText, renderCall, renderOutput, sameOutput, type CanonicalRendering } from "./outputs";
export { runFallbackViva, findDistinguishingInputs, EQUIVALENT_DROP_REASON, type FallbackVivaRequest } from "./fallback";
export { runLiveViva, type LiveVivaRequest, type LoadedMutant } from "./live";
export * from "./sandbox/types";
export type * from "./types";
