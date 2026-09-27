// The pipeline's shared types. Names follow CONTEXT.md.
import type { RunOutcome } from "./sandbox/types";

/** A plain JavaScript function from the student's code that passed the scope check. */
export interface EligibleFunction {
  name: string;
  /** Parameter source text, e.g. ["start", "end"]. */
  params: string[];
  /** Name and parameter list as written, e.g. "sumRange(start, end)". */
  signature: string;
  /** The declaration's own text, from `function` to its closing brace. */
  source: string;
  /** The JSDoc block directly above the declaration, verbatim; null when there is none. */
  docstring: string | null;
}

export type MutationRule = "relational-flip";

/** A mechanical rewrite of one syntax-tree node, produced by the rule engine. */
export interface CandidateMutant {
  /** Stable across runs on unchanged source. */
  id: string;
  functionName: string;
  rule: MutationRule;
  /** The rewritten token, e.g. { from: "<", to: "<=" }. */
  rewrite: { from: string; to: string };
  /** Offsets of the rewritten text within the function's source. */
  location: { start: number; end: number };
  /** The function's source with the rewrite applied. */
  source: string;
  /** `line` is 1-based within the function's source. */
  diff: { line: number; before: string; after: string };
}

/** Arguments for one call of the function under test. */
export type Input = unknown[];

export interface AnswerKeyEntry {
  input: Input;
  originalOutput: RunOutcome;
  mutantOutput: RunOutcome;
}

/** The original's and the mutant's actual outputs on each distinguishing input. */
export type AnswerKey = AnswerKeyEntry[];

/**
 * A candidate mutant with at least one distinguishing input. In fallback mode no filter call runs,
 * so every candidate may survive and none carries a taxonomy label.
 */
export interface SurvivingMutant extends CandidateMutant {
  answerKey: AnswerKey;
  taxonomyLabel: string | null;
}

/** One predict-then-reveal cycle for a single distinguishing input of a single mutant. */
export interface Beat extends AnswerKeyEntry {
  id: string;
  function: EligibleFunction;
  mutant: SurvivingMutant;
}

export type VivaMode = "live" | "cached" | "fallback";

export interface Viva {
  mode: VivaMode;
  beats: Beat[];
}
