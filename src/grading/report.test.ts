import { describe, expect, it } from "vitest";
import { gradeBeat } from "./grade";
import { recordedLabelledViva } from "./fixtures/recorded-labelled-viva";
import { buildReport } from "./report";

function results() {
  return recordedLabelledViva.beats.map((beat, i) => {
    const { prediction, confidence } = recordedLabelledViva.predictions[i];
    return gradeBeat(beat, prediction, confidence);
  });
}

describe("buildReport", () => {
  it("counts all four buckets and the mean Brier over the whole recorded viva", () => {
    const report = buildReport(results(), "live");
    expect(report.bucketCounts).toEqual({
      "confidently-right": 1,
      "confidently-wrong": 3,
      "uncertain-right": 1,
      "uncertain-wrong": 1,
    });
    expect(report.meanBrier).not.toBeNull();
  });

  it("marks the report as fallback only when the whole viva ran in fallback mode", () => {
    expect(buildReport(results(), "live").fallback).toBe(false);
    expect(buildReport(results(), "fallback").fallback).toBe(true);
  });

  it("groups every bucket's entries by exact taxonomy-label text, stating Tier 1 facts flatly", () => {
    const report = buildReport(results(), "live");
    const confidentlyRight = report.buckets.find((b) => b.bucket === "confidently-right")!;
    expect(confidentlyRight.groups).toEqual([
      {
        label: "off-by-one boundary",
        connectingLine: null,
        entries: [
          {
            change: { rule: "relational-flip", from: "<", to: "<=" },
            taxonomyLabel: "off-by-one boundary",
            call: "sumRange(1, 1)",
            answered: "1",
            correctAnswer: "1",
            confidence: 60,
            beat: recordedLabelledViva.beats[2],
          },
        ],
      },
    ]);
  });

  it("groups a fallback beat's entry (no taxonomy label) under an explicit unlabelled group", () => {
    const report = buildReport(results(), "live");
    const uncertainWrong = report.buckets.find((b) => b.bucket === "uncertain-wrong")!;
    expect(uncertainWrong.groups).toEqual([
      {
        label: null,
        connectingLine: null,
        entries: [
          {
            change: { rule: "relational-flip", from: "<", to: "<=" },
            taxonomyLabel: null,
            call: "sumRange(2, 2)",
            answered: "0",
            correctAnswer: "2",
            confidence: 30,
            beat: recordedLabelledViva.beats[5],
          },
        ],
      },
    ]);
  });

  it("gives confidently-wrong's labelled groups a connecting line templated from Tier 1 facts plus the label", () => {
    const report = buildReport(results(), "live");
    const confidentlyWrong = report.buckets.find((b) => b.bucket === "confidently-wrong")!;
    const byLabel = new Map(confidentlyWrong.groups.map((g) => [g.label, g]));

    // 2 of the label's 3 total occurrences landed here, at a floor of the group's minimum confidence.
    expect(byLabel.get("off-by-one boundary")!.entries).toHaveLength(2);
    expect(byLabel.get("off-by-one boundary")!.connectingLine).toBe(
      "You got 2 of 3 off-by-one boundary questions wrong with over 70% confidence.",
    );
    // The one "sign flip" occurrence is 1 of its own 2 total occurrences.
    expect(byLabel.get("sign flip")!.connectingLine).toBe(
      "You got 1 of 2 sign flip questions wrong with over 90% confidence.",
    );
  });

  it("gives confidently-wrong's unlabelled entries no connecting line", () => {
    const report = buildReport(results(), "fallback");
    const confidentlyWrong = report.buckets.find((b) => b.bucket === "confidently-wrong")!;
    expect(confidentlyWrong.groups.every((g) => g.label !== null || g.connectingLine === null)).toBe(true);
  });

  it("keeps each entry's beat so confidently-wrong can re-display its mutated code", () => {
    const report = buildReport(results(), "live");
    const confidentlyWrong = report.buckets.find((b) => b.bucket === "confidently-wrong")!;
    const beatIds = confidentlyWrong.groups.flatMap((g) => g.entries.map((entry) => entry.beat.id));
    expect(beatIds.sort()).toEqual(["b1", "b2", "b4"]);
  });

  it("gives the other three buckets no connecting lines at all", () => {
    const report = buildReport(results(), "live");
    for (const bucket of report.buckets) {
      if (bucket.bucket === "confidently-wrong") continue;
      expect(bucket.groups.every((g) => g.connectingLine === null)).toBe(true);
    }
  });
});
