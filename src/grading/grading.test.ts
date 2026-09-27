import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { runFallbackViva, type Beat } from "../engine";
import { createNodeRunner } from "../engine/sandbox/node-runner";
import { buildReport, gradeBeat } from "./index";

// The sumRange fallback beat: input (3, 3), mutant returns 3, original returns 0.
let beat: Beat;
beforeAll(async () => {
  const source = readFileSync(new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url), "utf8");
  [beat] = (await runFallbackViva({ source, functionName: "sumRange" }, createNodeRunner())).beats;
});

describe("gradeBeat", () => {
  it("grades a prediction matching the mutant's output as right", () => {
    expect(gradeBeat(beat, " 3 ", 80).correct).toBe(true);
  });

  it("grades the original's output as wrong on a distinguishing input", () => {
    expect(gradeBeat(beat, "0", 80).correct).toBe(false);
  });

  it("splits calibration buckets at a fixed 50%, with exactly 50% counted as confident", () => {
    expect(gradeBeat(beat, "3", 50).bucket).toBe("confidently-right");
    expect(gradeBeat(beat, "0", 50).bucket).toBe("confidently-wrong");
    expect(gradeBeat(beat, "3", 49.9).bucket).toBe("uncertain-right");
    expect(gradeBeat(beat, "0", 0).bucket).toBe("uncertain-wrong");
  });
});

describe("buildReport", () => {
  it("counts all four calibration buckets and states each beat's Tier 1 facts", () => {
    const report = buildReport([gradeBeat(beat, "0", 67.3)]);

    expect(report.bucketCounts).toEqual({
      "confidently-right": 0,
      "confidently-wrong": 1,
      "uncertain-right": 0,
      "uncertain-wrong": 0,
    });
    expect(report.entries).toEqual([
      {
        bucket: "confidently-wrong",
        change: { rule: "relational-flip", from: "<", to: "<=" },
        taxonomyLabel: null,
        call: "sumRange(3, 3)",
        answered: "0",
        correctAnswer: "3",
        confidence: 67.3,
      },
    ]);
  });
});
