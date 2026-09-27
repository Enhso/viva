import { describe, expect, it } from "vitest";
import { extractFunctions, generateCandidateMutants } from "./index";
import type { MutationRule } from "./types";

const only = (source: string) => extractFunctions(source)[0];
const byRule = (source: string, rule: MutationRule) =>
  generateCandidateMutants(only(source)).filter((c) => c.rule === rule);

describe("generateCandidateMutants: relational-flip", () => {
  it("flips >= to > on the line it appears", () => {
    const isAdult = only("function isAdult(age) {\n  if (age >= 18) {\n    return true;\n  }\n  return false;\n}");

    const candidates = byRule(isAdult.source, "relational-flip");

    expect(candidates.map((c) => c.diff)).toEqual([{ line: 2, before: "  if (age >= 18) {", after: "  if (age > 18) {" }]);
  });

  it("rewrites operators in code only, never inside comments or strings", () => {
    const fn = 'function f(a) {\n  // a < b\n  return a > "x<=y";\n}';

    const candidates = byRule(fn, "relational-flip");

    expect(candidates.map((c) => c.diff.after)).toEqual(['  return a >= "x<=y";']);
  });
});

describe("generateCandidateMutants: equality-swap", () => {
  it("swaps === for == and leaves everything else alone", () => {
    const candidates = byRule("function f(a) {\n  return a === 1;\n}", "equality-swap");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return a == 1;"]);
  });
});

describe("generateCandidateMutants: logical-flip", () => {
  it("flips && to ||", () => {
    const candidates = byRule("function f(a, b) {\n  return a && b;\n}", "logical-flip");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return a || b;"]);
  });
});

describe("generateCandidateMutants: arithmetic-swap", () => {
  it("swaps + for -", () => {
    const candidates = byRule("function f(a, b) {\n  return a + b;\n}", "arithmetic-swap");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return a - b;"]);
  });
});

describe("generateCandidateMutants: boolean-literal-flip", () => {
  it("flips true to false", () => {
    const candidates = byRule("function f() {\n  return true;\n}", "boolean-literal-flip");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return false;"]);
  });
});

describe("generateCandidateMutants: negation-removal", () => {
  it("removes a leading ! from its argument", () => {
    const candidates = byRule("function f(a) {\n  return !a;\n}", "negation-removal");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return a;"]);
  });
});

describe("generateCandidateMutants: negation-insertion", () => {
  it("wraps an if's test in a negation", () => {
    const candidates = byRule("function f(a) {\n  if (a) {\n    return 1;\n  }\n  return 0;\n}", "negation-insertion");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  if (!(a)) {"]);
  });
});

describe("generateCandidateMutants: off-by-one-literal", () => {
  it("offers both a plus-one and a minus-one candidate for a numeric literal", () => {
    const candidates = byRule("function f() {\n  return 5;\n}", "off-by-one-literal");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return 6;", "  return 4;"]);
  });
});

describe("generateCandidateMutants: return-deletion", () => {
  it("deletes a return's argument", () => {
    const candidates = byRule("function f() {\n  return 5;\n}", "return-deletion");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  return;"]);
  });
});

describe("generateCandidateMutants: loop-bound-change", () => {
  it("flips a for-loop's increment to a decrement", () => {
    const candidates = byRule("function f(n) {\n  for (let i = 0; i < n; i++) {\n    n--;\n  }\n  return n;\n}", "loop-bound-change");

    expect(candidates.map((c) => c.diff.after)).toEqual(["  for (let i = 0; i < n; i--) {", "    n++;"]);
  });
});

describe("generateCandidateMutants: candidate identity", () => {
  it("gives every candidate a mechanically-parseable mutated source", () => {
    const fn = only("function isAdult(age) {\n  if (age >= 18) {\n    return true;\n  }\n  return false;\n}");

    const candidates = generateCandidateMutants(fn);

    expect(candidates.length).toBeGreaterThan(1);
    for (const candidate of candidates) {
      expect(() => new Function(candidate.source)).not.toThrow();
    }
  });

  it("yields the same candidate ids in the same order on repeated runs", () => {
    const fn = only("function sumRange(start, end) {\n  let total = 0;\n  for (let i = start; i < end; i++) {\n    total += i;\n  }\n  return total;\n}");

    const first = generateCandidateMutants(fn).map((c) => c.id);
    const second = generateCandidateMutants(fn).map((c) => c.id);

    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });
});
