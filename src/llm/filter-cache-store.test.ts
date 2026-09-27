import { beforeEach, describe, expect, it } from "vitest";
import { clearFilterCache, readCachedFilterResult, writeCachedFilterResult, type CachedFilterEntry } from "./filter-cache-store";

// This module runs in the browser; vitest's default environment has no `localStorage`. A
// minimal in-memory polyfill is enough to exercise the read/write/clear seam without pulling in
// jsdom for the whole suite.
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

const entry: CachedFilterEntry = {
  provider: "nvidia",
  model: "openai/gpt-oss-20b",
  result: { loaded: [{ functionId: "sumRange", candidateId: "c1", label: "off-by-one", checklist: {} }], rejected: [] },
  cachedAt: "2026-09-27T12:00:00.000Z",
};

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage();
});

describe("filter-cache-store", () => {
  it("returns null for a key that was never written", () => {
    expect(readCachedFilterResult("missing")).toBeNull();
  });

  it("round-trips a written entry", () => {
    writeCachedFilterResult("key-1", entry);
    expect(readCachedFilterResult("key-1")).toEqual(entry);
  });

  it("clears every cached entry it wrote, and only those", () => {
    localStorage.setItem("someone-else's-key", "untouched");
    writeCachedFilterResult("key-1", entry);
    writeCachedFilterResult("key-2", entry);

    clearFilterCache();

    expect(readCachedFilterResult("key-1")).toBeNull();
    expect(readCachedFilterResult("key-2")).toBeNull();
    expect(localStorage.getItem("someone-else's-key")).toBe("untouched");
  });

  it("treats a storage failure as a miss rather than throwing", () => {
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem() {
        throw new Error("storage disabled");
      },
    } as unknown as Storage;
    expect(readCachedFilterResult("key-1")).toBeNull();
  });
});
