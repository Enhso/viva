import { describe, expect, it } from "vitest";
import { buildFilterCacheKey } from "./cache-key";
import type { FilterCacheMeta, FilterRequest } from "./types";

const request: FilterRequest = {
  functions: [
    {
      functionId: "sumRange",
      name: "sumRange",
      source: "function sumRange(start, end) { /* ... */ }",
      docstring: null,
      candidates: [
        { candidateId: "sumRange:relational-flip:40", rule: "relational-flip", rewrite: { from: "<", to: "<=" }, diff: { line: 3, before: "a", after: "b" } },
      ],
    },
  ],
};

const meta: FilterCacheMeta = {
  promptVersion: "v004",
  promptHash: "prompt-hash-1",
  contractHash: "contract-hash-1",
  chainSignature: "nvidia:openai/gpt-oss-20b|gemini:gemini-3.8-flash|openrouter:nvidia/nemotron-3-super-120b-a12b:free",
};

describe("buildFilterCacheKey", () => {
  it("is stable for the same request and meta", async () => {
    const a = await buildFilterCacheKey(request, meta);
    const b = await buildFilterCacheKey(request, meta);
    expect(a).toBe(b);
  });

  it("misses when a function's source changes", async () => {
    const changed: FilterRequest = { functions: [{ ...request.functions[0], source: "function sumRange(start, end) { return 0; }" }] };
    expect(await buildFilterCacheKey(changed, meta)).not.toBe(await buildFilterCacheKey(request, meta));
  });

  it("misses when a candidate list changes", async () => {
    const changed: FilterRequest = {
      functions: [{ ...request.functions[0], candidates: [...request.functions[0].candidates, { candidateId: "extra", rule: "r", rewrite: { from: "a", to: "b" }, diff: { line: 1, before: "x", after: "y" } }] }],
    };
    expect(await buildFilterCacheKey(changed, meta)).not.toBe(await buildFilterCacheKey(request, meta));
  });

  it("misses when the prompt text (hash) changes", async () => {
    const changedMeta = { ...meta, promptHash: "prompt-hash-2" };
    expect(await buildFilterCacheKey(request, changedMeta)).not.toBe(await buildFilterCacheKey(request, meta));
  });

  it("misses when the output contract (hash) changes", async () => {
    const changedMeta = { ...meta, contractHash: "contract-hash-2" };
    expect(await buildFilterCacheKey(request, changedMeta)).not.toBe(await buildFilterCacheKey(request, meta));
  });

  it("misses when the provider chain's model ids change", async () => {
    const changedMeta = { ...meta, chainSignature: "nvidia:some-other-model|gemini:gemini-3.8-flash|openrouter:nvidia/nemotron-3-super-120b-a12b:free" };
    expect(await buildFilterCacheKey(request, changedMeta)).not.toBe(await buildFilterCacheKey(request, meta));
  });

  it("misses when the prompt version changes, even with the same hash", async () => {
    const changedMeta = { ...meta, promptVersion: "v005" };
    expect(await buildFilterCacheKey(request, changedMeta)).not.toBe(await buildFilterCacheKey(request, meta));
  });
});
