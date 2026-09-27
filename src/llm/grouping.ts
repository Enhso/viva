// Label-grouping orchestrator (07 §6, ticket 22): Jev primary, embedding-similarity fallback,
// exact label text if both fail -- the report always renders (checklist item). Runs behind the
// serverless function (api/group-labels.ts); the browser never holds a provider key.
import { embeddingPairwiseSame } from "./embedding.js";
import { jevPairwiseSame } from "./jev.js";
import { exactTextGroups, pairKey, pairsToGroups, uniquePairs, type LabelGroupingResult } from "./label-grouping.js";

export type { LabelGroupingMechanism, LabelGroupingResult, UnorderedPair } from "./label-grouping.js";

export interface LabelGroupingEnv {
  TYPESAFE_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

type JevPairwise = typeof jevPairwiseSame;
type EmbeddingPairwise = typeof embeddingPairwiseSame;

/**
 * Decides same/different for every pair among this viva's distinct taxonomy labels, then turns
 * those verdicts into groups (`pairsToGroups`). `jev`/`embedding` are injectable so tests can
 * exercise every branch (Jev succeeds, Jev fails then embedding succeeds, both fail) without a
 * real network call; `api/group-labels.ts` calls this with the real functions.
 */
export async function runLabelGrouping(
  labels: string[],
  env: LabelGroupingEnv = process.env as LabelGroupingEnv,
  jev: JevPairwise = jevPairwiseSame,
  embedding: EmbeddingPairwise = embeddingPairwiseSame,
): Promise<LabelGroupingResult> {
  const unique = Array.from(new Set(labels));
  const pairs = uniquePairs(unique);
  const failures: string[] = [];

  if (pairs.length > 0) {
    try {
      const same = await jev(pairs, env.TYPESAFE_API_KEY);
      return { mechanism: "jev", groupKeyByLabel: pairsToGroups(unique, (pair) => same.get(pairKey(pair)) ?? false) };
    } catch (error) {
      failures.push(`Jev: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      const same = await embedding(pairs, unique, env.GEMINI_API_KEY);
      return {
        mechanism: "embedding",
        provider: "gemini",
        groupKeyByLabel: pairsToGroups(unique, (pair) => same.get(pairKey(pair)) ?? false),
        failures,
      };
    } catch (error) {
      failures.push(`Gemini embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    mechanism: "exact-text",
    groupKeyByLabel: exactTextGroups(unique),
    failures: failures.length > 0 ? failures : undefined,
  };
}
