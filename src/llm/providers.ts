// The provider chain (03 §5, ticket 06 Ruling: NVIDIA -> Gemini -> OpenRouter; Groq dropped,
// no key/host check at setup). Model ids probed live on 2026-09-27 (.scratch/providers.md);
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
 * Ruling: each provider gets 60 s before the chain moves on, so three slow providers stay
 * inside the serverless function's default duration — cost if wrong: a slow-but-working
 * provider is abandoned for the next one.
 */
export const PROVIDER_TIMEOUT_MS = 60_000;

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
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: jsonHeaders(bearer(apiKey)),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA integrate.api.nvidia.com ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("NVIDIA response missing choices[0].message.content");
  return text;
}

async function callGemini(prompt: string, apiKey: string | undefined): Promise<string> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
    method: "POST",
    headers: jsonHeaders(apiKey ? { "x-goog-api-key": apiKey } : null),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
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
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: jsonHeaders(bearer(apiKey)),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter openrouter.ai ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenRouter response missing choices[0].message.content");
  return text;
}

export const PROVIDER_CHAIN: ProviderLink[] = [
  { provider: "nvidia", model: "openai/gpt-oss-20b", envVar: "NVIDIA_API_KEY", call: callNvidia },
  { provider: "gemini", model: "gemini-3.8-flash", envVar: "GEMINI_API_KEY", call: callGemini },
  { provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free", envVar: "OPENROUTER_API_KEY", call: callOpenRouter },
];

export class ProviderChainError extends Error {
  failures: ProviderFailure[];
  constructor(failures: ProviderFailure[]) {
    super(`every provider failed: ${failures.map((f) => `${f.provider} (${f.model}): ${f.reason}`).join("; ")}`);
    this.name = "ProviderChainError";
    this.failures = failures;
  }
}
