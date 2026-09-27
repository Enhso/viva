import { describe, expect, it } from "vitest";
import {
  LEGEND_BUCKETS,
  clampTenths,
  percentToTenths,
  sliderStepTenths,
  snapToLegendBucket,
  tenthsToPercent,
  nudgeTenths,
} from "./confidence";

describe("percentToTenths / tenthsToPercent", () => {
  it("round-trips a value with one decimal place exactly", () => {
    expect(percentToTenths(67.3)).toBe(673);
    expect(tenthsToPercent(673)).toBe(67.3);
  });

  it("rounds a value with float noise to the nearest tenth", () => {
    // 67.3 - 0.1 - 0.1 in naive float math is 67.10000000000001-ish; the tenths
    // representation must not carry that noise.
    expect(percentToTenths(67.3 - 0.1 - 0.1)).toBe(671);
  });
});

describe("clampTenths", () => {
  it("clamps below 0 to 0", () => {
    expect(clampTenths(-5)).toBe(0);
  });

  it("clamps above 1000 (100.0%) to 1000", () => {
    expect(clampTenths(1005)).toBe(1000);
  });

  it("leaves an in-range value untouched", () => {
    expect(clampTenths(673)).toBe(673);
  });
});

describe("nudgeTenths (+/- buttons, 0.1% steps)", () => {
  it("adds one tenth per nudge with no float noise", () => {
    let tenths = percentToTenths(67.3);
    for (let i = 0; i < 5; i++) tenths = nudgeTenths(tenths, +1);
    expect(tenthsToPercent(tenths)).toBe(67.8);
  });

  it("clamps at the top when nudging past 100.0%", () => {
    expect(nudgeTenths(999, +1)).toBe(1000);
    expect(nudgeTenths(1000, +1)).toBe(1000);
  });

  it("clamps at the bottom when nudging past 0%", () => {
    expect(nudgeTenths(1, -1)).toBe(0);
    expect(nudgeTenths(0, -1)).toBe(0);
  });
});

describe("sliderStepTenths (drag, 1% steps)", () => {
  it("snaps a dragged percent to the nearest whole percent, in tenths", () => {
    expect(sliderStepTenths(67)).toBe(670);
    expect(sliderStepTenths(0)).toBe(0);
    expect(sliderStepTenths(100)).toBe(1000);
  });
});

describe("legend buckets", () => {
  it("has a bucket whose range is centered on 50%, the indifference point", () => {
    const indifference = LEGEND_BUCKETS.find((b) => b.min <= 50 && 50 <= b.max);
    expect(indifference).toBeDefined();
    expect(indifference!.snapToTenths).toBe(500);
  });

  it("covers the full 0-100 range with no gaps", () => {
    const sorted = [...LEGEND_BUCKETS].sort((a, b) => a.min - b.min);
    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBe(100);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].min).toBe(sorted[i - 1].max);
    }
  });
});

describe("snapToLegendBucket", () => {
  it("returns the bucket's representative value in tenths", () => {
    const bucket = LEGEND_BUCKETS[0];
    expect(snapToLegendBucket(bucket.id)).toBe(bucket.snapToTenths);
  });

  it("snaps the indifference bucket to exactly 500 tenths (50.0%)", () => {
    const indifference = LEGEND_BUCKETS.find((b) => b.min <= 50 && 50 <= b.max)!;
    expect(snapToLegendBucket(indifference.id)).toBe(500);
  });
});
