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
 * One over-threshold function's triage call (ticket 13, 03 §4): which provider/model shrank it,
 * and how many candidates went in versus survived to the main filter call.
 */
export interface TriageFunctionOutcome {
  functionId: string;
  provider: string;
  model: string;
  candidatesIn: number;
  candidatesOut: number;
}

/**
 * Whether the triage call fired for this viva, and the per-function detail — recorded on every
 * `FilterApiResponse` (live or fallback) for the disclosure and the candidate log (ticket 13
 * checklist: "whether triage fired is recorded per viva"). `fired: false` (functions: []) is the
 * overwhelmingly common case — most student functions never generate enough raw candidates to
 * trip the threshold (03 §4).
 */
export interface TriageSummary {
  fired: boolean;
  functions: TriageFunctionOutcome[];
}

/**
 * What a cache key must cover (ticket 14, brief §3.2): the prompt text, the output contract, and
 * the provider chain's model ids — anything the server knows and the browser doesn't. The
 * functions' sources and candidate lists are already in the `FilterRequest` the browser holds.
 * `promptVersion` alone isn't enough (Hatim can edit a `vNNN.md` file in place without bumping
 * its number), so `promptHash`/`contractHash` are hashes of the actual file text.
 *
 * `triagePromptHash` (ticket 13): editing `prompts/triage/vNNN.md`, or nothing existing there yet,
 * changes which candidates survive an over-threshold function's shrink even though the browser's
 * `FilterRequest` is unchanged — so it must be part of the key too, or a stale cache entry could
 * outlive a triage-prompt edit. `null` when no triage prompt exists on disk.
 */
export interface FilterCacheMeta {
  promptVersion: string;
  promptHash: string;
  contractHash: string;
  chainSignature: string;
  triagePromptHash?: string | null;
}

/**
 * Why a viva (or one function within a served viva) ran in fallback mode, as a code the UI maps
 * through the string table (ticket 24) rather than a hardcoded English sentence. `detail`, when
 * present, is a provider's own error text or a caught error's message — verbatim, never itself
 * translated (08 §2: dynamic content stays as-is; only the surrounding chrome is static).
 */
export type FallbackReasonCode =
  | "demo-switch"
  | "filter-prompt-missing"
  | "provider-chain-failed"
  | "filter-endpoint-unreachable"
  | "no-mutant-loaded"
  | "all-mutants-equivalent";

export interface FallbackReason {
  code: FallbackReasonCode;
  detail?: string;
}

/** What the browser gets back from `POST /api/filter`: either a live result, or a labelled fallback. */
export type FilterApiResponse =
  | ({ mode: "live"; cacheMeta?: FilterCacheMeta; triage?: TriageSummary } & FilterCallSuccess)
  | { mode: "fallback"; reason: FallbackReason; failures?: ProviderFailure[]; cacheMeta?: FilterCacheMeta; triage?: TriageSummary };

/**
 * `POST /api/filter { metaOnly: true }` (ticket 14): returns the cache-key ingredients without
 * touching the provider chain, so the browser can check its cache — zero provider calls — before
 * deciding whether to make a real filter call at all.
 */
export type FilterMetaApiResponse = { available: true; meta: FilterCacheMeta } | { available: false; reason: string };

/** What a viva actually ran on: the server's own two modes, plus "cached" (ticket 14), which the
 * server never returns — it's synthesized in the browser when a stored response is replayed. */
export type FilterOutcome = FilterApiResponse | ({ mode: "cached" } & FilterCallSuccess);
