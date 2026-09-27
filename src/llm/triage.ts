// The over-threshold triage call (03 §4, ticket 13): the one deliberate exception to "one LLM
// call per viva" (09-disclosure.md §3 must state this plainly). If a single function's raw
// candidate list would push the main filter call past a context-size threshold, a second,
// smaller LLM call shrinks that function's candidates *before* the main call runs — never a
// mechanical truncation rule (03 §4 rejected that as less honest).
import { runFilterCall, type FilterPromptText } from "./filter.js";
import { PROVIDER_CHAIN, ProviderChainError, type ProviderLink } from "./providers.js";
import type {
  FilterCallSuccess,
  FilterCandidateInput,
  FilterFunctionInput,
  FilterRequest,
  ProviderFailure,
  TriageFunctionOutcome,
  TriageSummary,
} from "./types.js";

/**
 * Ruling: the threshold is derived from the smallest context window across the provider chain
 * (262,144 tokens — `nvidia/nemotron-3-super-120b-a12b`, the model behind both the NVIDIA and
 * OpenRouter links per each provider's live `GET /v1/models` listing on 2026-09-27; Gemini's
 * `gemini-3.8-flash` reports a 1,048,576-token input limit, well above that, so it isn't the
 * binding constraint), with a wide margin: no single function's own block (source + docstring +
 * candidates, as embedded in the main prompt's data block) may cost more than ~7.6% of that
 * window. The rest is reserved for the prompt prose + output contract (~1-2k tokens measured),
 * every *other* selected function's own block (N is student-set with no cap — 02 §3), the model's
 * completion budget, and slack in the chars/4 token estimate below. 262,144 / 13 ≈ 20,165,
 * rounded to a clean 20,000. Recorded here because 09-disclosure.md quotes both this number and
 * this derivation. Cost if wrong: too low triages functions that would have fit fine (one extra,
 * mostly-harmless call); too high risks the main call actually exceeding a real context window.
 */
export const TRIAGE_TOKEN_THRESHOLD = 20_000;

/**
 * A cheap, deterministic token estimate: chars/4. Matches the measured ratio on a real filter-call
 * payload (`.scratch/providers.md`, 2026-09-27: a three-function/42-candidate request was ~19.6k
 * chars and ~4.9k prompt tokens, ≈4.0 chars/token). Approximate on purpose — this only needs to
 * decide "does this function need triage," not bill a provider.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * The estimated token cost of one function's own block exactly as it appears in the main filter
 * prompt's data block (`buildFilterPrompt`'s `JSON.stringify(request, ...)`): source, docstring,
 * and its full candidate list.
 */
export function estimateFunctionTokens(fn: FilterFunctionInput): number {
  return estimateTokens(JSON.stringify(fn));
}

/** The function_ids whose own candidate block alone estimates over the threshold. Checklist item:
 * "only over-threshold functions go through triage; the others are untouched." */
export function functionsOverThreshold(request: FilterRequest, threshold = TRIAGE_TOKEN_THRESHOLD): string[] {
  return request.functions.filter((fn) => estimateFunctionTokens(fn) > threshold).map((fn) => fn.functionId);
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Builds the triage call's prompt: the triage prompt's own text, then a fenced JSON block of just
 * this one function's data (source, docstring, full candidate list), then the triage output
 * contract. Mirrors `buildFilterPrompt`'s shape but for one function, not the whole request.
 */
export function buildTriagePrompt(prompt: FilterPromptText, fn: FilterFunctionInput): string {
  const dataBlock = JSON.stringify(fn, null, 2);
  return `${prompt.promptText.trim()}\n\n## Function and candidates\n\n\`\`\`json\n${dataBlock}\n\`\`\`\n\n${prompt.contractText.trim()}\n`;
}

/**
 * Validates a triage response against `prompts/triage/_output-contract.md`: every surviving id
 * must be one of `fn`'s candidate ids, none repeated. An empty array is a valid answer (the model
 * may keep nothing) — 03 §4 rejected mechanical truncation, not a model legitimately keeping
 * zero. Any contract violation throws, which `runTriageChain` treats as this provider failing.
 */
export function parseTriageResponse(raw: string, fn: FilterFunctionInput): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (error) {
    throw new Error(`triage response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.surviving_candidate_ids)) {
    throw new Error('triage response is missing a "surviving_candidate_ids" array');
  }

  const knownIds = new Set(fn.candidates.map((c) => c.candidateId));
  const seen = new Set<string>();
  const survivors: string[] = [];
  for (const entry of parsed.surviving_candidate_ids) {
    if (typeof entry !== "string") throw new Error("a surviving_candidate_ids entry is not a string");
    if (!knownIds.has(entry)) throw new Error(`candidate_id "${entry}" was not among the candidates sent`);
    if (seen.has(entry)) throw new Error(`candidate_id "${entry}" appears more than once in surviving_candidate_ids`);
    seen.add(entry);
    survivors.push(entry);
  }
  return survivors;
}

/**
 * Runs the triage call for one over-threshold function through the provider chain, in priority
 * order, exactly like `runFilterCall`'s chain loop: a network failure, a timeout, or a response
 * that fails `parseTriageResponse` all count as that provider failing and move on. Throws
 * `ProviderChainError` (checklist: "a triage failure is treated like a filter-call failure") once
 * the whole chain is exhausted for this function — the caller runs fallback mode.
 */
async function runTriageChain(
  fn: FilterFunctionInput,
  prompt: FilterPromptText,
  env: Record<string, string | undefined>,
  chain: ProviderLink[],
): Promise<{ provider: string; model: string; survivingCandidateIds: string[] }> {
  const fullPrompt = buildTriagePrompt(prompt, fn);
  const failures: ProviderFailure[] = [];

  for (const link of chain) {
    const apiKey = env[link.envVar] || undefined;
    const keyNote = apiKey ? "" : `${link.envVar} is not set; `;
    let raw: string;
    try {
      raw = await link.call(fullPrompt, apiKey);
    } catch (error) {
      failures.push({
        provider: link.provider,
        model: link.model,
        reason: `triage for function "${fn.functionId}": ${keyNote}${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    try {
      const survivingCandidateIds = parseTriageResponse(raw, fn);
      return { provider: link.provider, model: link.model, survivingCandidateIds };
    } catch (error) {
      failures.push({
        provider: link.provider,
        model: link.model,
        reason: `triage for function "${fn.functionId}": invalid response: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  throw new ProviderChainError(failures);
}

function shrinkFunction(fn: FilterFunctionInput, survivingCandidateIds: string[]): FilterFunctionInput {
  const survivors = new Set(survivingCandidateIds);
  const candidates: FilterCandidateInput[] = fn.candidates.filter((c) => survivors.has(c.candidateId));
  return { ...fn, candidates };
}

export type TriagedFilterCallSuccess = FilterCallSuccess & { triage: TriageSummary };

/**
 * The full pipeline (03 §4): find any function whose raw candidate list alone estimates over
 * `TRIAGE_TOKEN_THRESHOLD`, shrink each one via its own triage call, then run the ordinary main
 * filter call on the resulting (mostly untouched) request. Functions under the threshold are
 * passed through byte-for-byte (checklist: "the others are untouched").
 *
 * Throws `ProviderChainError` when a triage call exhausts the chain for some function, or when
 * triage is needed but no triage prompt exists on disk yet — both are total failures, and the
 * caller (api/filter.ts) already turns any `ProviderChainError` into a labelled fallback response,
 * so this needs no separate fallback path of its own.
 */
export async function runFilterCallWithTriage(
  request: FilterRequest,
  filterPrompt: FilterPromptText,
  triagePrompt: FilterPromptText | null,
  env: Record<string, string | undefined> = process.env,
  chain: ProviderLink[] = PROVIDER_CHAIN,
): Promise<TriagedFilterCallSuccess> {
  const overIds = functionsOverThreshold(request);

  if (overIds.length === 0) {
    const outcome = await runFilterCall(request, filterPrompt, env, chain);
    return { ...outcome, triage: { fired: false, functions: [] } };
  }

  if (!triagePrompt) {
    throw new ProviderChainError(
      overIds.map((functionId) => ({
        provider: "(none)",
        model: "(none)",
        reason: `function "${functionId}" exceeds the triage threshold (${TRIAGE_TOKEN_THRESHOLD} tokens) but the triage prompt hasn't been written yet`,
      })),
    );
  }

  const overSet = new Set(overIds);
  const triageOutcomes: TriageFunctionOutcome[] = [];
  const shrunkFunctions: FilterFunctionInput[] = [];

  for (const fn of request.functions) {
    if (!overSet.has(fn.functionId)) {
      shrunkFunctions.push(fn);
      continue;
    }
    const { provider, model, survivingCandidateIds } = await runTriageChain(fn, triagePrompt, env, chain);
    triageOutcomes.push({
      functionId: fn.functionId,
      provider,
      model,
      candidatesIn: fn.candidates.length,
      candidatesOut: survivingCandidateIds.length,
    });
    shrunkFunctions.push(shrinkFunction(fn, survivingCandidateIds));
  }

  const shrunkRequest: FilterRequest = { functions: shrunkFunctions };
  const outcome = await runFilterCall(shrunkRequest, filterPrompt, env, chain);
  return { ...outcome, triage: { fired: true, functions: triageOutcomes } };
}
