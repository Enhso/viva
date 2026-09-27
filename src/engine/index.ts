// Model-free by construction: nothing here may import from src/llm (architecture-boundary.test.ts).
// The Node runner (sandbox/node-runner.ts) is deliberately not re-exported: browser code must not bundle node:vm.
export { extractFunctions, scanFunctions, type RejectedFunction } from "./extract";
export { type ScopeViolation } from "./scope";
export { generateCandidateMutants } from "./mutate";
export { complexityScore, orderByComplexity, type OrderedFunction } from "./complexity";
export { BEATS_PER_MUTANT, MUTANTS_PER_FUNCTION, estimateBeatCount } from "./pacing";
export { sharedBattery } from "./battery";
export { inferParamShapes, type ParamShape } from "./shapes";
export { targetedSearch, TARGETED_SEARCH_SEED, TARGETED_SEARCH_RUNS } from "./targeted-search";
export { renderCall, renderOutput, sameOutput, type CanonicalRendering } from "./outputs";
export { runFallbackViva, findDistinguishingInputs, EQUIVALENT_DROP_REASON, type FallbackVivaRequest } from "./fallback";
export { runLiveViva, type LiveVivaRequest, type LoadedMutant } from "./live";
export * from "./sandbox/types";
export type * from "./types";
