// The filter call's serverless endpoint (03 §2, ticket 06). Holds the provider keys; the
// browser sends selected functions + candidates, this returns loaded (labeled) mutants and
// rejected candidates, or a labelled fallback with the reason.
import { loadLatestFilterPrompt } from "../src/llm/prompt-loader";
import { ProviderChainError, runFilterCall } from "../src/llm/filter";
import type { FilterApiResponse, FilterRequest } from "../src/llm/types";

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

function isFilterRequestBody(value: unknown): value is FilterRequest & { forceFallback?: boolean } {
  return typeof value === "object" && value !== null && Array.isArray((value as { functions?: unknown }).functions);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const rawBody = typeof req.body === "string" ? safeJsonParse(req.body) : req.body;
  if (!isFilterRequestBody(rawBody)) {
    res.status(400).json({ error: 'expected a JSON body of the shape { functions: [...] }' });
    return;
  }

  // The demo switch (03 §6): forces fallback on purpose, so "kill the key mid-demo" is one
  // clearly labelled act rather than an unexplained outage.
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

  try {
    const outcome = await runFilterCall(request, prompt);
    const response: FilterApiResponse = { mode: "live", ...outcome };
    res.status(200).json(response);
  } catch (error) {
    const response: FilterApiResponse =
      error instanceof ProviderChainError
        ? { mode: "fallback", reason: error.message, failures: error.failures }
        : { mode: "fallback", reason: error instanceof Error ? error.message : String(error) };
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
