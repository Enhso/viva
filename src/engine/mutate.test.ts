import { describe, expect, it } from "vitest";
import { extractFunctions, generateCandidateMutants } from "./index";

const only = (source: string) => extractFunctions(source)[0];

describe("generateCandidateMutants (relational flips)", () => {
  it("flips >= to > on the line it appears", () => {
    const isAdult = only("function isAdult(age) {\n  if (age >= 18) {\n    return true;\n  }\n  return false;\n}");

    const candidates = generateCandidateMutants(isAdult);

    expect(candidates.map((c) => c.diff)).toEqual([{ line: 2, before: "  if (age >= 18) {", after: "  if (age > 18) {" }]);
  });

  it("rewrites operators in code only, never inside comments or strings", () => {
    const fn = only('function f(a) {\n  // a < b\n  return a > "x<=y";\n}');

    const candidates = generateCandidateMutants(fn);

    expect(candidates.map((c) => c.diff.after)).toEqual(['  return a >= "x<=y";']);
  });
});
