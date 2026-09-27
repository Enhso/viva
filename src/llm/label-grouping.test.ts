import { describe, expect, it } from "vitest";
import { exactTextGroups, pairsToGroups, uniquePairs, type UnorderedPair } from "./label-grouping";

describe("uniquePairs", () => {
  it("lists every unordered pair among distinct labels exactly once, in sorted order", () => {
    expect(uniquePairs(["c", "a", "b"])).toEqual([
      { a: "a", b: "b" },
      { a: "a", b: "c" },
      { a: "b", b: "c" },
    ]);
  });

  it("produces nothing for zero or one label", () => {
    expect(uniquePairs([])).toEqual([]);
    expect(uniquePairs(["solo"])).toEqual([]);
  });
});

describe("pairsToGroups", () => {
  it("keeps every label its own group when no pair is judged the same", () => {
    const groups = pairsToGroups(["off-by-one", "sign flip", "null check"], () => false);
    expect(groups).toEqual({
      "off-by-one": "off-by-one",
      "sign flip": "sign flip",
      "null check": "null check",
    });
  });

  it("merges a directly-judged-same pair under one key", () => {
    const groups = pairsToGroups(["off-by-one", "index boundary handling"], () => true);
    // The group key is deterministic: the lexicographically smallest label in the group.
    expect(groups["off-by-one"]).toBe(groups["index boundary handling"]);
    expect(groups["off-by-one"]).toBe("index boundary handling");
  });

  // Ruling (checklist item): pairwise same/different decisions become groups by transitive
  // closure. A~B and B~C but not A~C still puts all three in one group.
  it("transitively merges A~B and B~C into one group even when A and C were never judged the same", () => {
    const same = (pair: UnorderedPair) =>
      (pair.a === "a" && pair.b === "b") || (pair.a === "b" && pair.b === "c");
    const groups = pairsToGroups(["a", "b", "c"], same);
    expect(groups.a).toBe(groups.b);
    expect(groups.b).toBe(groups.c);
  });

  it("is order-independent: the same partition results regardless of label input order", () => {
    const same = (pair: UnorderedPair) => pair.a === "x" || pair.b === "x";
    const forward = pairsToGroups(["w", "x", "y", "z"], same);
    const backward = pairsToGroups(["z", "y", "x", "w"], same);
    expect(forward).toEqual(backward);
  });

  it("deduplicates repeated labels", () => {
    const groups = pairsToGroups(["a", "a", "b"], () => false);
    expect(Object.keys(groups).sort()).toEqual(["a", "b"]);
  });
});

describe("exactTextGroups", () => {
  it("maps every distinct label to itself -- the no-mechanism-available fallback", () => {
    expect(exactTextGroups(["off-by-one", "sign flip"])).toEqual({
      "off-by-one": "off-by-one",
      "sign flip": "sign flip",
    });
  });
});
