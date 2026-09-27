// The filter call (03 §2, ticket 06): build the prompt, run the provider chain, validate the
// response against `_output-contract.md`. A malformed or incomplete response counts as that
// provider failing (checklist item) and the chain moves on.
import { PROVIDER_CHAIN, ProviderChainError, type ProviderLink } from "./providers.js";
import type { FilterCallSuccess, FilterRequest, FilterResult, LoadedCandidate, ProviderFailure, RejectedCandidate } from "./types.js";

export interface FilterPromptText {
  promptText: string;
  contractText: string;
}

/**
 * Ruling: the prompt file's text, then a fenced JSON block naming every function/candidate id
 * the model must account for, then the output contract. Keeping the data block separate from
 * the prompt prose is what lets `_output-contract.md` stay fixed while `vNNN.md` wording changes
 * freely (prompts/filter/README.md) — cost if wrong: reformatting this block later.
 */
export function buildFilterPrompt(prompt: FilterPromptText, request: FilterRequest): string {
  const dataBlock = JSON.stringify(request, null, 2);
  return `${prompt.promptText.trim()}\n\n## Functions and candidates\n\n\`\`\`json\n${dataBlock}\n\`\`\`\n\n${prompt.contractText.trim()}\n`;
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
 * Validates the response against the contract (`_output-contract.md`): every function_id and
 * candidate_id sent must appear exactly once. A loaded verdict without a label, or an unrecognized
 * verdict, becomes a rejection naming the problem rather than failing the whole response. Any violation
 * throws, which the caller (runFilterCall) treats as this provider failing.
 */
export function parseFilterResponse(raw: string, request: FilterRequest): FilterResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (error) {
    throw new Error(`response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.functions)) {
    throw new Error('response is missing a "functions" array');
  }

  const loaded: LoadedCandidate[] = [];
  const rejected: RejectedCandidate[] = [];
  const seenFunctionIds = new Set<string>();

  for (const fnEntry of parsed.functions) {
    if (!isRecord(fnEntry)) throw new Error("a function entry is not an object");
    const functionId = fnEntry.function_id;
    if (typeof functionId !== "string") throw new Error("a function entry is missing function_id");
    if (seenFunctionIds.has(functionId)) throw new Error(`function_id "${functionId}" appears more than once`);
    seenFunctionIds.add(functionId);

    const expectedFunction = request.functions.find((fn) => fn.functionId === functionId);
    if (!expectedFunction) throw new Error(`function_id "${functionId}" was not among the functions sent`);
    if (!Array.isArray(fnEntry.candidates)) throw new Error(`function_id "${functionId}" is missing a candidates array`);

    const seenCandidateIds = new Set<string>();
    for (const candEntry of fnEntry.candidates) {
      if (!isRecord(candEntry)) throw new Error(`a candidate under "${functionId}" is not an object`);
      const candidateId = candEntry.candidate_id;
      if (typeof candidateId !== "string") throw new Error(`a candidate under "${functionId}" is missing candidate_id`);
      if (seenCandidateIds.has(candidateId)) throw new Error(`candidate_id "${candidateId}" under "${functionId}" appears more than once`);
      seenCandidateIds.add(candidateId);

      const expectedCandidate = expectedFunction.candidates.find((c) => c.candidateId === candidateId);
      if (!expectedCandidate) throw new Error(`candidate_id "${candidateId}" under "${functionId}" was not among the candidates sent`);

      const checklist = isRecord(candEntry.checklist) ? candEntry.checklist : {};
      // Ruling: a malformed verdict never loads a mutant and never discards the other verdicts;
      // it becomes a rejection naming what was wrong (lab table, candidate log).
      const verdict = typeof candEntry.verdict === "string" ? candEntry.verdict.trim().toLowerCase() : candEntry.verdict;
      const label = typeof candEntry.label === "string" ? candEntry.label.trim() : "";
      const reason = typeof candEntry.reason === "string" ? candEntry.reason : "";
      if (verdict === "loaded" && label !== "") {
        loaded.push({ functionId, candidateId, label, checklist });
      } else if (verdict === "loaded") {
        rejected.push({ functionId, candidateId, reason: `marked loaded without a label${reason ? `: ${reason}` : ""}`, checklist });
      } else if (verdict === "rejected") {
        rejected.push({ functionId, candidateId, reason, checklist });
      } else {
        rejected.push({ functionId, candidateId, reason: `unrecognized verdict ${JSON.stringify(candEntry.verdict ?? null)}`, checklist });
      }
    }

    for (const expectedCandidate of expectedFunction.candidates) {
      if (!seenCandidateIds.has(expectedCandidate.candidateId)) {
        throw new Error(`candidate_id "${expectedCandidate.candidateId}" under "${functionId}" is missing from the response`);
      }
    }
  }

  for (const expectedFunction of request.functions) {
    if (!seenFunctionIds.has(expectedFunction.functionId)) {
      throw new Error(`function_id "${expectedFunction.functionId}" is missing from the response`);
    }
  }

  return { loaded, rejected };
}

/**
 * Runs the chain in priority order (OpenRouter -> Gemini -> NVIDIA). A network failure, a
 * timeout, or a response that fails `parseFilterResponse` all count as that provider failing
 * and move on. A provider whose key env var is unset is still called, without an auth header:
 * in cloud sessions a proxy may inject credentials (CLAUDE.md); elsewhere it fails with the
 * provider's own 401, and the reason names the unset variable. Throws `ProviderChainError`
 * (every failure, with reasons) when the whole chain is exhausted — the caller runs fallback mode.
 */
export async function runFilterCall(
  request: FilterRequest,
  prompt: FilterPromptText,
  env: Record<string, string | undefined> = process.env,
  chain: ProviderLink[] = PROVIDER_CHAIN,
): Promise<FilterCallSuccess> {
  const fullPrompt = buildFilterPrompt(prompt, request);
  const failures: ProviderFailure[] = [];

  for (const link of chain) {
    const apiKey = env[link.envVar] || undefined;
    const keyNote = apiKey ? "" : `${link.envVar} is not set; `;
    let raw: string;
    try {
      raw = await link.call(fullPrompt, apiKey);
    } catch (error) {
      failures.push({ provider: link.provider, model: link.model, reason: `${keyNote}${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    try {
      const result = parseFilterResponse(raw, request);
      return { provider: link.provider, model: link.model, result };
    } catch (error) {
      failures.push({
        provider: link.provider,
        model: link.model,
        reason: `invalid response: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  throw new ProviderChainError(failures);
}

export { ProviderChainError } from "./providers.js";
