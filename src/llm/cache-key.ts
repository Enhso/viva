// Cache key for a filter call's response (ticket 14, brief §3.2, 09 §1). Runs in both the
// server (hashing the prompt/contract text) and the browser (hashing the final key) — Web Crypto
// (`crypto.subtle`) is available in both Node 20+ and every browser Viva targets, so this module
// stays free of `node:crypto` and can be imported from browser-side code without pulling in fs.
import type { FilterCacheMeta, FilterRequest } from "./types.js";

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The functions' sources and candidate lists are already fully covered by `request` here: the
 * request App.tsx builds is exactly what's sent to the model, in the selection's complexity-score
 * order (ticket 08), so the same selection always serializes the same way — no separate
 * canonicalization pass needed.
 */
export function canonicalizeRequest(request: FilterRequest): string {
  return JSON.stringify(request);
}

/**
 * Any change to the request (a function's source or its candidate list), the prompt text, the
 * output contract, or the provider chain's model ids (`chainSignature`) changes this hash — a
 * miss (ticket 14's first checkbox).
 */
export async function buildFilterCacheKey(request: FilterRequest, meta: FilterCacheMeta): Promise<string> {
  const material = [canonicalizeRequest(request), meta.promptVersion, meta.promptHash, meta.contractHash, meta.chainSignature].join(
    "\u0000",
  );
  return sha256Hex(material);
}
