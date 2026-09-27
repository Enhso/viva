import { describe, expect, it } from "vitest";
import { createPrng } from "./prng";

describe("createPrng", () => {
  it("is deterministic: the same seed produces the same sequence", () => {
    const a = createPrng(12345);
    const b = createPrng(12345);
    const drawsA = [a(), a(), a(), a()];
    const drawsB = [b(), b(), b(), b()];
    expect(drawsA).toEqual(drawsB);
  });

  it("produces values in [0, 1)", () => {
    const random = createPrng(1);
    for (let i = 0; i < 500; i++) {
      const draw = random();
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const a = createPrng(1);
    const b = createPrng(2);
    expect(a()).not.toBe(b());
  });

  // Ticket 18's uniformity requirement (05 §4) rests on this generator spreading draws evenly
  // across its range, not clustering -- checked here with a coarse bucket histogram.
  it("spreads draws roughly uniformly across ten buckets over many draws", () => {
    const random = createPrng(999);
    const buckets = new Array(10).fill(0);
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const draw = random();
      buckets[Math.min(9, Math.floor(draw * 10))]++;
    }
    const expected = n / buckets.length;
    for (const count of buckets) {
      expect(Math.abs(count - expected)).toBeLessThan(expected * 0.25);
    }
  });
});
