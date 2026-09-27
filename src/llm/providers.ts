// The provider chain (03 §5). Order OpenRouter -> Gemini -> NVIDIA (Hatim, 2026-09-27, replacing
// R5's NVIDIA-first order; Groq was dropped at setup: no key, no host check). Model ids probed live
// on 2026-09-27 (.scratch/providers.md);
// don't hardcode from memory — ids rotate.
import type { ProviderFailure } from "./types.js";

export interface ProviderLink {
  provider: string;
  model: string;
  /** Auth header is sent only when this env var is set (CLAUDE.md). */
  envVar: string;
  call: (prompt: string, apiKey: string | undefined) => Promise<string>;
}

/**
 * Ruling: each provider gets 75 s before the chain moves on, so three slow providers stay
 * inside the serverless function's default duration — cost if wrong: a slow-but-working
 * provider is abandoned for the next one. Measured 2026-09-27 on a real three-function request
 * (42 candidates, ~4.9k prompt tokens): NVIDIA 52.8 s, Gemini 12.7 s, OpenRouter 44.2 s.
 */
export const PROVIDER_TIMEOUT_MS = 75_000;

// All three models reason before answering by default, which ran past the timeout on a real
// request (.scratch/providers.md, 2026-09-27 afternoon). The filter call wants a JSON verdict
// per candidate, so each link turns reasoning off or down.
const NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const GEMINI_MODEL = "gemini-3.8-flash";
const OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

/** Pause before the one retry of a fast transient failure (429/503). */
export const TRANSIENT_RETRY_DELAY_MS = 2_000;

/**
 * Ruling: one retry after a 429 or 503. Those come back in about a second and often pass on the
 * next try; every other failure moves the chain on — cost if wrong: ~2 s extra before the next
 * provider when the overload persists.
 */
export async function fetchWithTransientRetry(url: string, init: RequestInit, delayMs = TRANSIENT_RETRY_DELAY_MS): Promise<Response> {
  const first = await fetch(url, init);
  if (first.status !== 429 && first.status !== 503) return first;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return fetch(url, init);
}

function jsonHeaders(auth: Record<string, string> | null): Record<string, string> {
  return { "Content-Type": "application/json", ...auth };
}

function bearer(apiKey: string | undefined): Record<string, string> | null {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : null;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function callNvidia(prompt: string, apiKey: string | undefined): Promise<string> {
  const res = await fetchWithTransientRetry("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: jsonHeaders(bearer(apiKey)),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16384,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA integrate.api.nvidia.com ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("NVIDIA response missing choices[0].message.content");
  return text;
}

async function callGemini(prompt: string, apiKey: string | undefined): Promise<string> {
  const res = await fetchWithTransientRetry(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: jsonHeaders(apiKey ? { "x-goog-api-key": apiKey } : null),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini generativelanguage.googleapis.com ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text)
    .filter((value): value is string => typeof value === "string")
    .join("");
  if (!text) throw new Error("Gemini response missing candidates[0].content.parts[].text");
  return text;
}

async function callOpenRouter(prompt: string, apiKey: string | undefined): Promise<string> {
  const res = await fetchWithTransientRetry("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: jsonHeaders(bearer(apiKey)),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      reasoning: { enabled: false },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter openrouter.ai ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenRouter response missing choices[0].message.content");
  return text;
}

export const PROVIDER_CHAIN: ProviderLink[] = [
  { provider: "openrouter", model: OPENROUTER_MODEL, envVar: "OPENROUTER_API_KEY", call: callOpenRouter },
  { provider: "gemini", model: GEMINI_MODEL, envVar: "GEMINI_API_KEY", call: callGemini },
  { provider: "nvidia", model: NVIDIA_MODEL, envVar: "NVIDIA_API_KEY", call: callNvidia },
];

export class ProviderChainError extends Error {
  failures: ProviderFailure[];
  constructor(failures: ProviderFailure[]) {
    super(`every provider failed: ${failures.map((f) => `${f.provider} (${f.model}): ${f.reason}`).join("; ")}`);
    this.name = "ProviderChainError";
    this.failures = failures;
  }
}
