// The filter call's serverless endpoint (03 §2, ticket 06). Holds the provider keys; the
// browser sends selected functions + candidates, this returns loaded (labeled) mutants and
// rejected candidates, or a labelled fallback with the reason.
// Relative imports carry `.js`: package.json is `"type": "module"`, and Node's ESM loader on
// Vercel resolves no extensionless specifiers. TypeScript maps `.js` back to the `.ts` source.
import { sha256Hex } from "../src/llm/cache-key.js";
import { loadLatestFilterPrompt } from "../src/llm/prompt-loader.js";
import { ProviderChainError, runFilterCall } from "../src/llm/filter.js";
import { PROVIDER_CHAIN } from "../src/llm/providers.js";
import type { FilterApiResponse, FilterCacheMeta, FilterMetaApiResponse, FilterRequest } from "../src/llm/types.js";

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

function isFilterRequestBody(value: unknown): value is FilterRequest & { forceFallback?: boolean; metaOnly?: boolean } {
  return typeof value === "object" && value !== null && Array.isArray((value as { functions?: unknown }).functions);
}

function isMetaOnlyBody(value: unknown): value is { metaOnly: true } {
  return typeof value === "object" && value !== null && (value as { metaOnly?: unknown }).metaOnly === true;
}

/**
 * Ticket 14: the cache key's ingredients that only the server knows — the prompt text, the
 * output contract, and the provider chain's model ids. Independent of which functions are
 * selected, so `{ metaOnly: true }` needs no `functions` array and never touches the chain.
 */
function buildCacheMeta(promptVersion: string, promptText: string, contractText: string): Promise<FilterCacheMeta> {
  const chainSignature = PROVIDER_CHAIN.map((link) => `${link.provider}:${link.model}`).join("|");
  return Promise.all([sha256Hex(promptText), sha256Hex(contractText)]).then(([promptHash, contractHash]) => ({
    promptVersion,
    promptHash,
    contractHash,
    chainSignature,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const rawBody = typeof req.body === "string" ? safeJsonParse(req.body) : req.body;

  if (isMetaOnlyBody(rawBody)) {
    const prompt = loadLatestFilterPrompt();
    const response: FilterMetaApiResponse = prompt
      ? { available: true, meta: await buildCacheMeta(prompt.version, prompt.promptText, prompt.contractText) }
      : { available: false, reason: "the filter prompt hasn't been written yet" };
    res.status(200).json(response);
    return;
  }

  if (!isFilterRequestBody(rawBody)) {
    res.status(400).json({ error: 'expected a JSON body of the shape { functions: [...] }' });
    return;
  }

  // The demo switch (03 §6): forces fallback on purpose, so "kill the key mid-demo" is one
  // clearly labelled act rather than an unexplained outage. It wins over a cache hit too — the
  // browser never checks its cache when this is set (src/llm/client.ts `callFilterApiCached`).
  if (rawBody.forceFallback) {
    const response: FilterApiResponse = { mode: "fallback", reason: "forced by the demo switch" };
    res.status(200).json(response);
    return;
  }

  const request: FilterRequest = { functions: rawBody.functions };

  const prompt = loadLatestFilterPrompt();
  if (!prompt) {
    const response: FilterApiResponse = { mode: "fallback", reason: "the filter prompt hasn't been written yet" };
    res.status(200).json(response);
    return;
  }

  const cacheMeta = await buildCacheMeta(prompt.version, prompt.promptText, prompt.contractText);

  try {
    const outcome = await runFilterCall(request, prompt);
    const response: FilterApiResponse = { mode: "live", cacheMeta, ...outcome };
    res.status(200).json(response);
  } catch (error) {
    const response: FilterApiResponse =
      error instanceof ProviderChainError
        ? { mode: "fallback", reason: error.message, failures: error.failures, cacheMeta }
        : { mode: "fallback", reason: error instanceof Error ? error.message : String(error), cacheMeta };
    res.status(200).json(response);
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
