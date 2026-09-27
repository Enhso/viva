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

/**
 * What a cache key must cover (ticket 14, brief §3.2): the prompt text, the output contract, and
 * the provider chain's model ids — anything the server knows and the browser doesn't. The
 * functions' sources and candidate lists are already in the `FilterRequest` the browser holds.
 * `promptVersion` alone isn't enough (Hatim can edit a `vNNN.md` file in place without bumping
 * its number), so `promptHash`/`contractHash` are hashes of the actual file text.
 */
export interface FilterCacheMeta {
  promptVersion: string;
  promptHash: string;
  contractHash: string;
  chainSignature: string;
}

/** What the browser gets back from `POST /api/filter`: either a live result, or a labelled fallback. */
export type FilterApiResponse =
  | ({ mode: "live"; cacheMeta?: FilterCacheMeta } & FilterCallSuccess)
  | { mode: "fallback"; reason: string; failures?: ProviderFailure[]; cacheMeta?: FilterCacheMeta };

/**
 * `POST /api/filter { metaOnly: true }` (ticket 14): returns the cache-key ingredients without
 * touching the provider chain, so the browser can check its cache — zero provider calls — before
 * deciding whether to make a real filter call at all.
 */
export type FilterMetaApiResponse = { available: true; meta: FilterCacheMeta } | { available: false; reason: string };

/** What a viva actually ran on: the server's own two modes, plus "cached" (ticket 14), which the
 * server never returns — it's synthesized in the browser when a stored response is replayed. */
export type FilterOutcome = FilterApiResponse | ({ mode: "cached" } & FilterCallSuccess);
