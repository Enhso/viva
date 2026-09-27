// Exercises the caching seam (ticket 14) against a mocked `fetch` — the recorded response shape
// below is exactly what `/api/filter` returned from one real, unmocked NVIDIA call during this
// ticket's verification (dev server, `sumRange` fixture, 2026-09-27 ~12:26, 18.1s).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callFilterApiCached } from "./client";
import { clearFilterCache } from "./filter-cache-store";
import type { FilterRequest } from "./types";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const request: FilterRequest = {
  functions: [
    {
      functionId: "sumRange",
      name: "sumRange",
      source: "function sumRange(start, end) {\n  let total = 0;\n  for (let i = start; i <= end; i++) total += i;\n  return total;\n}",
      docstring: null,
      candidates: [
        { candidateId: "sumRange:relational-flip:1", rule: "relational-flip", rewrite: { from: "<=", to: "<" }, diff: { line: 3, before: "i <= end", after: "i < end" } },
      ],
    },
  ],
};

const metaResponse = {
  available: true,
  meta: {
    promptVersion: "v004",
    promptHash: "b67c84fd5cddec8e96a4d04e8950c353d1385533382c79ce84f52c9b6b99b52c",
    contractHash: "fed03a39067f8ef26d7d1cffb4622c4d7c06c45fdd235caa24e3282ba47ac97d",
    chainSignature: "nvidia:openai/gpt-oss-20b|gemini:gemini-3.8-flash|openrouter:nvidia/nemotron-3-super-120b-a12b:free",
  },
};

// The recorded live response, verbatim (see the file header).
const liveResponse = {
  mode: "live",
  cacheMeta: metaResponse.meta,
  provider: "nvidia",
  model: "openai/gpt-oss-20b",
  result: {
    loaded: [{ functionId: "sumRange", candidateId: "sumRange:relational-flip:1", label: "Off-by-one error", checklist: { concept_domain: "Boundary Conditions", alternative_label: "Boundary condition error", is_subtle: true } }],
    rejected: [],
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callFilterApiCached", () => {
  it("on a first, uncached run: fetches meta, calls the real filter endpoint, and caches the live result", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.metaOnly) {
        calls.push("meta");
        return jsonResponse(metaResponse);
      }
      calls.push("filter");
      return jsonResponse(liveResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await callFilterApiCached(request);

    expect(calls).toEqual(["meta", "filter"]);
    expect(outcome).toMatchObject({ mode: "live", provider: "nvidia", model: "openai/gpt-oss-20b" });
  });

  it("on a second run of the same code, prompt, contract, and chain: hits the cache and makes zero provider calls", async () => {
    const filterCalls: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.metaOnly) return jsonResponse(metaResponse);
      filterCalls.push(body);
      return jsonResponse(liveResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await callFilterApiCached(request); // primes the cache
    filterCalls.length = 0; // only the second run's filter calls matter to this assertion

    const outcome = await callFilterApiCached(request);

    expect(filterCalls).toEqual([]); // zero provider-triggering /api/filter calls — cache hit
    expect(outcome).toEqual({ mode: "cached", provider: "nvidia", model: "openai/gpt-oss-20b", result: liveResponse.result });
  });

  it("misses the cache once the code changes, and calls the filter endpoint again", async () => {
    let filterCallCount = 0;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.metaOnly) return jsonResponse(metaResponse);
      filterCallCount++;
      return jsonResponse(liveResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await callFilterApiCached(request);
    const changedRequest: FilterRequest = { functions: [{ ...request.functions[0], source: request.functions[0].source + "\n// edited" }] };
    await callFilterApiCached(changedRequest);

    expect(filterCallCount).toBe(2);
  });

  it("force-fallback wins over a cache hit: it never checks the cache and never calls meta", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.metaOnly) throw new Error("meta should not be called when force-fallback is set");
      return jsonResponse({ mode: "fallback", reason: "forced by the demo switch" });
    });
    vi.stubGlobal("fetch", fetchMock);

    await callFilterApiCached(request); // primes the cache with a normal run
    // Reset the mock so the assertion below is only about the force-fallback run.
    const forcedFetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(body.metaOnly).toBeUndefined();
      return jsonResponse({ mode: "fallback", reason: "forced by the demo switch" });
    });
    vi.stubGlobal("fetch", forcedFetchMock);

    const outcome = await callFilterApiCached(request, { forceFallback: true });

    expect(outcome).toEqual({ mode: "fallback", reason: "forced by the demo switch" });
    expect(forcedFetchMock).toHaveBeenCalledTimes(1);
  });

  it("clearFilterCache makes the next run miss again", async () => {
    let filterCallCount = 0;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.metaOnly) return jsonResponse(metaResponse);
      filterCallCount++;
      return jsonResponse(liveResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await callFilterApiCached(request);
    clearFilterCache();
    await callFilterApiCached(request);

    expect(filterCallCount).toBe(2);
  });
});
