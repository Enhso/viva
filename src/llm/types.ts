// Shapes for the filter call (03 §2, ticket 06). The request/response wire format, kept apart
// from src/engine/types.ts: the engine never imports src/llm (architecture-boundary.test.ts), so
// this module translates engine data (CandidateMutant, EligibleFunction) into plain ids and back.

export interface FilterCandidateInput {
  candidateId: string;
  rule: string;
  rewrite: { from: string; to: string };
  diff: { line: number; before: string; after: string };
}

export interface FilterFunctionInput {
  functionId: string;
  name: string;
  source: string;
  docstring: string | null;
  candidates: FilterCandidateInput[];
}

export interface FilterRequest {
  functions: FilterFunctionInput[];
}

export interface LoadedCandidate {
  functionId: string;
  candidateId: string;
  label: string;
  checklist: Record<string, unknown>;
}

export interface RejectedCandidate {
  functionId: string;
  candidateId: string;
  reason: string;
  checklist: Record<string, unknown>;
}

/** Rejected candidates are kept beside the loaded ones, for the report and the candidate log (03 §7). */
export interface FilterResult {
  loaded: LoadedCandidate[];
  rejected: RejectedCandidate[];
}

export interface ProviderFailure {
  provider: string;
  model: string;
  reason: string;
}

export interface FilterCallSuccess {
  provider: string;
  model: string;
  result: FilterResult;
}

/** What the browser gets back from `POST /api/filter`: either a live result, or a labelled fallback. */
export type FilterApiResponse =
  | ({ mode: "live" } & FilterCallSuccess)
  | { mode: "fallback"; reason: string; failures?: ProviderFailure[] };
