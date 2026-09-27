import { describe, expect, it } from "vitest";
import { BEATS_PER_MUTANT, MUTANTS_PER_FUNCTION, estimateBeatCount } from "./pacing";

describe("estimateBeatCount", () => {
  it("multiplies N functions by mutants-per-function and beats-per-mutant", () => {
    expect(estimateBeatCount(4)).toBe(4 * MUTANTS_PER_FUNCTION * BEATS_PER_MUTANT);
  });

  it("is zero for zero selected functions", () => {
    expect(estimateBeatCount(0)).toBe(0);
  });
});
