// Browser-side store for cached filter responses (ticket 14). `localStorage` survives a page
// reload on the demo machine (the ticket's criterion) but never leaves that browser — it isn't
// shared state, just a per-viewer convenience, so storage failures (private mode, quota, an
// artifact-style sandboxed origin) degrade to "no cache" rather than breaking the viva.
import type { FilterCallSuccess } from "./types";

const STORAGE_PREFIX = "viva:filter-cache:";

export type CachedFilterEntry = FilterCallSuccess & { cachedAt: string };

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function isCachedFilterEntry(value: unknown): value is CachedFilterEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.provider === "string" && typeof entry.model === "string" && typeof entry.cachedAt === "string" && typeof entry.result === "object" && entry.result !== null;
}

export function readCachedFilterResult(key: string): CachedFilterEntry | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCachedFilterEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedFilterResult(key: string, entry: CachedFilterEntry): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Best-effort: a failed write just costs the next run a cache miss, never a broken viva.
  }
}

/** Rehearsals can clear it (ticket 14 checkbox). */
export function clearFilterCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storedKey = localStorage.key(i);
      if (storedKey && storedKey.startsWith(STORAGE_PREFIX)) keys.push(storedKey);
    }
    for (const storedKey of keys) localStorage.removeItem(storedKey);
  } catch {
    // Nothing to clear if storage is unavailable in the first place.
  }
}
