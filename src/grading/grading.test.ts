import { readFileSync } from "node:fs";
import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalText, runFallbackViva, sameOutput, type Beat } from "../engine";
import { createNodeRunner } from "../engine/sandbox/node-runner";
import { buildReport, gradeBeat, type PredictionReading } from "./index";

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

  it("grades a throws-syntax prediction against an error outcome", () => {
    const throwingBeat = { mutantOutput: { kind: "threw", errorName: "TypeError" } } as unknown as Beat;
    expect(gradeBeat(throwingBeat, "throws TypeError", 80).correct).toBe(true);
    expect(gradeBeat(throwingBeat, "throws RangeError", 80).correct).toBe(false);
    expect(gradeBeat(throwingBeat, "3", 80).correct).toBe(false);
  });

  it("computes the Brier score on the exact confidence, with no rounding", () => {
    expect(gradeBeat(beat, "3", 67.3).brier).not.toBe(gradeBeat(beat, "3", 67.0).brier);
    expect(gradeBeat(beat, "3", 100).brier).toBe(0);
    expect(gradeBeat(beat, "0", 100).brier).toBe(1);
  });

  it("rejects a confidence outside 0-100", () => {
    expect(() => gradeBeat(beat, "3", 150)).toThrow(RangeError);
    expect(() => gradeBeat(beat, "3", NaN)).toThrow(RangeError);
  });

  it("records how the prediction was read", () => {
    expect(gradeBeat(beat, " 3 ", 80).reading).toEqual({ kind: "returned", value: 3 });
    expect(gradeBeat(beat, "throws TypeError", 80).reading).toEqual({ kind: "threw", errorName: "TypeError" });
  });

  it("law: a prediction equal to the original's output never grades right on a distinguishing input", () => {
    const jsValue = fc.letrec((tie) => ({
      value: fc.oneof(
        { depthSize: "small" },
        fc.constant(NaN),
        fc.constant(Infinity),
        fc.constant(-Infinity),
        fc.integer(),
        fc.string(),
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
        fc.array(tie("value"), { maxLength: 3 }),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), tie("value"), { maxKeys: 3 }),
      ),
    })).value;
    const predictable: fc.Arbitrary<PredictionReading> = fc.oneof(
      jsValue.map((value): PredictionReading => ({ kind: "returned", value })),
      fc.constantFrom("TypeError", "RangeError", "Error").map((errorName): PredictionReading => ({ kind: "threw", errorName })),
    );

    fc.assert(
      fc.property(predictable, predictable, (original, mutant) => {
        fc.pre(!sameOutput(original, mutant));
        const text = original.kind === "threw" ? `throws ${original.errorName}` : canonicalText(original.value);
        const distinguishingBeat = { mutantOutput: mutant } as unknown as Beat;
        return gradeBeat(distinguishingBeat, text, 80).correct === false;
      }),
      { seed: 42 },
    );
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
    expect(report.meanBrier).toBeCloseTo(0.673 ** 2);
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
