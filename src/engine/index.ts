// Model-free by construction: nothing here may import from src/llm (architecture-boundary.test.ts).
// The Node runner (sandbox/node-runner.ts) is deliberately not re-exported: browser code must not bundle node:vm.
export { extractFunctions } from "./extract";
export { generateCandidateMutants } from "./mutate";
export { sharedBattery } from "./battery";
export { renderCall, renderOutput, sameOutput } from "./outputs";
export { runFallbackViva, type FallbackVivaRequest } from "./fallback";
export * from "./sandbox/types";
export type * from "./types";
