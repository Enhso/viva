// Embedding-similarity fallback (07 §6, ticket 22): used only when Jev fails or doesn't land.
// Ruling: Gemini's `gemini-embedding-001` is the embedding provider -- Gemini is already a
// working, reachable provider link in this environment (src/llm/providers.ts, key confirmed live
// 2026-09-27, .scratch/providers.md) so no new account/key is needed, matching 07 §6's "no
// preference stated; default to whichever is cheapest/fastest to wire up given existing provider
// keys". Cost if wrong: swap the one `embed` call below for another free-tier embedding endpoint.
import { pairKey, type UnorderedPair } from "./label-grouping.js";

const EMBED_MODEL = "gemini-embedding-001";

/**
 * Fixed, untuned placeholder (07 §6, checklist item): not empirically tuned against real label
 * pairs, tuning is future-iteration work. Verified live 2026-09-27 (.scratch/providers.md):
 * closely-related label pairs like "off-by-one" / "index boundary handling" scored ~0.70 cosine
 * on `gemini-embedding-001` -- below this threshold -- so 0.85 reads conservative in practice,
 * exactly the "acknowledged rough placeholder" the spec calls for, not a tuned number.
 */
export const EMBEDDING_SIMILARITY_THRESHOLD = 0.85;

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function embed(text: string, apiKey: string | undefined): Promise<number[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-goog-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
  });
  if (!res.ok) throw new Error(`Gemini embedding generativelanguage.googleapis.com ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as { embedding?: { values?: unknown } };
  const values = data.embedding?.values;
  if (!Array.isArray(values) || !values.every((v) => typeof v === "number")) {
    throw new Error("Gemini embedding response missing embedding.values");
  }
  return values as number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Embeds every distinct label once, then compares each pair's vectors against the fixed
 * threshold above. */
export async function embeddingPairwiseSame(
  pairs: UnorderedPair[],
  labels: string[],
  apiKey: string | undefined,
): Promise<Map<string, boolean>> {
  if (pairs.length === 0) return new Map();

  const vectors = new Map<string, number[]>();
  await Promise.all(
    labels.map(async (label) => {
      vectors.set(label, await embed(label, apiKey));
    }),
  );

  const result = new Map<string, boolean>();
  for (const pair of pairs) {
    const similarity = cosineSimilarity(vectors.get(pair.a)!, vectors.get(pair.b)!);
    result.set(pairKey(pair), similarity >= EMBEDDING_SIMILARITY_THRESHOLD);
  }
  return result;
}
