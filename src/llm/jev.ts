// Jev (TypeSafe AI, typesafe.ai/blog/introducing-system-one-models-and-jev) integration (07 §6,
// ticket 22): the ONLY call site in this codebase that talks to Jev (checklist item) -- used for
// exactly one closed classification, same-concept label matching for the report's taxonomy
// grouping. Nothing else routes through it. Auth header sent only when the env var is set
// (CLAUDE.md) -- in cloud sessions a proxy may inject credentials instead.
import { pairKey, type UnorderedPair } from "./label-grouping.js";

const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";

function questionKey(index: number): string {
  return `pair_${index}`;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * One request covers every pair for the whole viva (mirrors the filter call's one-call-per-batch
 * shape, src/llm/filter.ts): a Noul question per pair, each naming both labels in its own
 * `instructions` so no shared `state` is needed. `noul >= 0.5` reads as "same concept" -- Noul
 * has no separate confidence field (typesafe-ai skill), so the probability itself is the verdict.
 */
export async function jevPairwiseSame(pairs: UnorderedPair[], apiKey: string | undefined): Promise<Map<string, boolean>> {
  if (pairs.length === 0) return new Map();

  const questions: Record<string, unknown> = {};
  pairs.forEach((pair, index) => {
    questions[questionKey(index)] = {
      type: "noul",
      instructions: `Two independently-produced taxonomy labels for a code mutation's misconception. Label A: "${pair.a}". Label B: "${pair.b}". Do Label A and Label B name the same underlying misconception concept, even if worded differently or at different specificity?`,
      criteria: {
        true: "They describe the same underlying concept, possibly with different wording or specificity",
        false: "They describe different concepts",
      },
    };
  });

  const res = await fetch(JEV_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      state: "Taxonomy-label same-concept classification for report grouping (07 §6).",
      model: JEV_MODEL,
      questions,
    }),
  });
  if (!res.ok) throw new Error(`Jev api.typesafe.ai ${res.status}: ${await safeText(res)}`);

  const data = (await res.json()) as { answers?: Record<string, { noul?: unknown }> };
  const result = new Map<string, boolean>();
  pairs.forEach((pair, index) => {
    const key = questionKey(index);
    const noul = data.answers?.[key]?.noul;
    if (typeof noul !== "number") throw new Error(`Jev response missing answers.${key}.noul`);
    result.set(pairKey(pair), noul >= 0.5);
  });
  return result;
}
