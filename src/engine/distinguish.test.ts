import { describe, expect, it } from "vitest";
import { distinguishes } from "./distinguish";

// Ticket 04, R3 (Hatim): a timeout never counts as a distinguishing output. A timeout can't be
// verified as non-termination, and the student can't predict one (readPrediction reads values
// and thrown errors only), so a beat built on it could never be graded right.
describe("distinguishes", () => {
  const returned = (value: unknown) => ({ kind: "returned" as const, value });

  it("is true when original and mutant outputs differ", () => {
    expect(distinguishes(returned(0), returned(3))).toBe(true);
    expect(distinguishes(returned(0), { kind: "threw", errorName: "TypeError" })).toBe(true);
  });

  it("is false when they agree", () => {
    expect(distinguishes(returned([1, 2]), returned([1, 2]))).toBe(false);
  });

  it("is false whenever either side timed out", () => {
    expect(distinguishes(returned(6), { kind: "timeout" })).toBe(false);
    expect(distinguishes({ kind: "timeout" }, returned(6))).toBe(false);
    expect(distinguishes({ kind: "timeout" }, { kind: "timeout" })).toBe(false);
  });
});
