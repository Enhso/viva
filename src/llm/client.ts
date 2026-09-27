// Browser side of the filter call (ticket 06): posts to the serverless function that holds the
// keys. Never talks to a provider directly — the browser has no API keys.
import type { FilterApiResponse, FilterRequest } from "./types";

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
