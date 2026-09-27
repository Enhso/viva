import { renderCall, renderOutput, type MutationRule } from "../engine";
import { describeOutput, translate } from "../ui/strings";
import { CALIBRATION_BUCKETS, type BeatResult, type CalibrationBucket } from "./grade";

// Tier 1 report text is generated ahead of the language layer (ticket 24), which threads a
// selected language through the report; fixed to "en" here in the meantime.
const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate("en", key, vars);

/** One beat in the report. Every field is Tier 1 (computed by execution) except taxonomyLabel. */
export interface ReportEntry {
  bucket: CalibrationBucket;
  change: { rule: MutationRule; from: string; to: string };
  /** Tier 2. Null in fallback mode: no model ran. */
  taxonomyLabel: string | null;
  call: string;
  answered: string;
  correctAnswer: string;
  confidence: number;
}

export interface Report {
  bucketCounts: Record<CalibrationBucket, number>;
  entries: ReportEntry[];
}

export function buildReport(results: BeatResult[]): Report {
  const bucketCounts = Object.fromEntries(CALIBRATION_BUCKETS.map((bucket) => [bucket, 0])) as Record<CalibrationBucket, number>;
  for (const result of results) bucketCounts[result.bucket] += 1;

  const entries = results.map(({ beat, prediction, confidence, bucket }): ReportEntry => ({
    bucket,
    change: { rule: beat.mutant.rule, ...beat.mutant.rewrite },
    taxonomyLabel: beat.mutant.taxonomyLabel,
    call: renderCall(beat.function.name, beat.input),
    answered: prediction.trim(),
    correctAnswer: describeOutput(renderOutput(beat.mutantOutput), t),
    confidence,
  }));
  return { bucketCounts, entries };
}
