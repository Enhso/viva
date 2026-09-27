// Browser side of the filter call (ticket 06): posts to the serverless function that holds the
// keys. Never talks to a provider directly — the browser has no API keys.
import { buildFilterCacheKey } from "./cache-key";
import { readCachedFilterResult, writeCachedFilterResult } from "./filter-cache-store";
import type { FilterApiResponse, FilterMetaApiResponse, FilterOutcome, FilterRequest } from "./types";

export interface CallFilterApiOptions {
  /** The demo switch (03 §6): forces fallback on purpose, labelled by the server's reason. */
  forceFallback?: boolean;
}

export async function callFilterApi(request: FilterRequest, options: CallFilterApiOptions = {}): Promise<FilterApiResponse> {
  const res = await fetch("/api/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, forceFallback: options.forceFallback ?? false }),
  });
  if (!res.ok) throw new Error(`filter API returned ${res.status}`);
  return (await res.json()) as FilterApiResponse;
}

/** Ticket 14: the cache-key ingredients only the server knows, with zero provider calls. */
async function callFilterMeta(): Promise<FilterMetaApiResponse> {
  const res = await fetch("/api/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metaOnly: true }),
  });
  if (!res.ok) throw new Error(`filter API returned ${res.status}`);
  return (await res.json()) as FilterMetaApiResponse;
}

/**
 * Running a viva again on unchanged code, with the same prompt version and model, reuses the
 * stored filter response and makes zero provider calls (ticket 14). This is the seam App.tsx's
 * `runViva` calls instead of `callFilterApi` directly; `callFilterApi` itself stays untouched so
 * ticket 06's tests and the force-fallback/no-prompt/chain-exhausted paths are unaffected.
 *
 * Force-fallback wins over a cache hit: it short-circuits below before any cache lookup, exactly
 * like it already short-circuits the server's own chain in `api/filter.ts`.
 */
export async function callFilterApiCached(request: FilterRequest, options: CallFilterApiOptions = {}): Promise<FilterOutcome> {
  if (options.forceFallback) {
    return callFilterApi(request, options);
  }

  const meta = await callFilterMeta()
    .then((response) => (response.available ? response.meta : null))
    .catch(() => null); // a meta-fetch failure just means an uncached call, not a broken viva

  if (meta) {
    try {
      const key = await buildFilterCacheKey(request, meta);
      const cached = readCachedFilterResult(key);
      if (cached) {
        return { mode: "cached", provider: cached.provider, model: cached.model, result: cached.result };
      }
    } catch {
      // Hashing/storage failures degrade to an uncached call — never a broken viva.
    }
  }

  const outcome = await callFilterApi(request, options);
  if (outcome.mode === "live" && meta) {
    try {
      const key = await buildFilterCacheKey(request, meta);
      writeCachedFilterResult(key, { provider: outcome.provider, model: outcome.model, result: outcome.result, cachedAt: new Date().toISOString() });
    } catch {
      // Best-effort: a failed write just costs the next run a cache miss.
    }
  }
  return outcome;
}
