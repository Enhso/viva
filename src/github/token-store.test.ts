import { describe, expect, it } from "vitest";
import { TokenStore, type StorageLike } from "./token-store";

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

describe("TokenStore", () => {
  it("has no token before anything is set", () => {
    const store = new TokenStore(fakeStorage());
    expect(store.getToken()).toBeNull();
  });

  it("holds the token and scope it was given", () => {
    const store = new TokenStore(fakeStorage());
    store.setToken("abc123", "public_repo");
    expect(store.getToken()).toEqual({ token: "abc123", scope: "public_repo" });
  });

  it("a second, private-scope flow overwrites the public one", () => {
    const store = new TokenStore(fakeStorage());
    store.setToken("public-token", "public_repo");
    store.setToken("private-token", "repo");
    expect(store.getToken()).toEqual({ token: "private-token", scope: "repo" });
  });

  it("clear removes the held token", () => {
    const store = new TokenStore(fakeStorage());
    store.setToken("abc123", "public_repo");
    store.clear();
    expect(store.getToken()).toBeNull();
  });

  it("treats corrupt stored data as no token, rather than throwing", () => {
    const backing = fakeStorage();
    backing.setItem("viva.github.token", "not json");
    const store = new TokenStore(backing);
    expect(store.getToken()).toBeNull();
  });
});
