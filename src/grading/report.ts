import { renderCall, renderOutput, type Beat, type MutationRule, type VivaMode } from "../engine";
import { describeOutput, translate, type Language } from "../ui/strings";
import { CALIBRATION_BUCKETS, type BeatResult, type CalibrationBucket } from "./grade";

/** One beat in the report. Every field is Tier 1 (computed by execution) except taxonomyLabel. */
export interface ReportEntry {
  change: { rule: MutationRule; from: string; to: string };
  /** Tier 2. Null in fallback mode (of this beat, live or whole-viva): no model ran. */
  taxonomyLabel: string | null;
  call: string;
  answered: string;
  correctAnswer: string;
  confidence: number;
  /** The underlying beat, kept so confidently-wrong can re-display its mutated code (07 §5). */
  beat: Beat;
}

/**
 * Entries within one bucket sharing a taxonomy label — every bucket's base structure (07 §5).
 * Grouped by exact label text for now; ticket 22 adds same-concept grouping on top of this.
 * `label: null` is the explicit "unlabelled" group: entries whose beat carried no taxonomy label
 * at all (a fallback beat, whole-viva or one function's alone — 08's ruling), never a guess.
 */
export interface LabelGroup {
  label: string | null;
  entries: ReportEntry[];
  /**
   * Confidently-wrong only, and only for a labelled group: the synthesized connecting line (07
   * §5), templated from Tier 1 facts (how many of this label's occurrences across the whole
   * viva landed here, and the group's minimum confidence) plus the label. Null everywhere else
   * — the other three buckets stay at the shared base structure, and an unlabelled group has no
   * label to synthesize a line about.
   */
  connectingLine: string | null;
}

export interface BucketReport {
  bucket: CalibrationBucket;
  count: number;
  groups: LabelGroup[];
}

export interface Report {
  bucketCounts: Record<CalibrationBucket, number>;
  /** Mean of each beat's Brier score, computed on exact confidence (06 §3); null when there are no beats. */
  meanBrier: number | null;
  /** Whether the whole viva ran with no model (09 §4 fallback mode); the report states this plainly. */
  fallback: boolean;
  buckets: BucketReport[];
}

type T = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => string;

function toEntry(result: BeatResult, t: T): ReportEntry {
  const { beat, prediction, confidence } = result;
  return {
    change: { rule: beat.mutant.rule, ...beat.mutant.rewrite },
    taxonomyLabel: beat.mutant.taxonomyLabel,
    call: renderCall(beat.function.name, beat.input),
    answered: prediction.trim(),
    correctAnswer: describeOutput(renderOutput(beat.mutantOutput), t),
    confidence,
    beat,
  };
}

// Preserves first-seen order of labels (including null, the unlabelled group) within the bucket.
function groupByLabel(bucketResults: BeatResult[], labelTotals: Map<string, number>, withConnectingLine: boolean, t: T): LabelGroup[] {
  const order: (string | null)[] = [];
  const byLabel = new Map<string | null, ReportEntry[]>();
  for (const result of bucketResults) {
    const label = result.beat.mutant.taxonomyLabel;
    if (!byLabel.has(label)) {
      byLabel.set(label, []);
      order.push(label);
    }
    byLabel.get(label)!.push(toEntry(result, t));
  }
  return order.map((label) => {
    const entries = byLabel.get(label)!;
    const connectingLine =
      withConnectingLine && label !== null
        ? t("report.connectingLine", {
            wrongCount: entries.length,
            totalCount: labelTotals.get(label) ?? entries.length,
            label,
            confidenceFloor: Math.floor(Math.min(...entries.map((entry) => entry.confidence)) / 10) * 10,
          })
        : null;
    return { label, entries, connectingLine };
  });
}

/**
 * `language` (ticket 24) is the same choice made on the selection screen and held through the
 * viva; it defaults to "en" so a caller that predates the language picker (this module's own
 * tests) keeps working unchanged.
 */
export function buildReport(results: BeatResult[], mode: VivaMode, language: Language = "en"): Report {
  const t: T = (key, vars) => translate(language, key, vars);
  const bucketCounts = Object.fromEntries(CALIBRATION_BUCKETS.map((bucket) => [bucket, 0])) as Record<CalibrationBucket, number>;
  for (const result of results) bucketCounts[result.bucket] += 1;
  const meanBrier = results.length === 0 ? null : results.reduce((sum, result) => sum + result.brier, 0) / results.length;

  // How many beats each taxonomy label was asked about across the whole viva, any bucket — the
  // connecting line's "X of Y" needs the denominator to span every occurrence, not just the
  // confidently-wrong ones that made it into this one bucket's group.
  const labelTotals = new Map<string, number>();
  for (const result of results) {
    const label = result.beat.mutant.taxonomyLabel;
    if (label !== null) labelTotals.set(label, (labelTotals.get(label) ?? 0) + 1);
  }

  const buckets = CALIBRATION_BUCKETS.map((bucket): BucketReport => {
    const bucketResults = results.filter((result) => result.bucket === bucket);
    return {
      bucket,
      count: bucketResults.length,
      groups: groupByLabel(bucketResults, labelTotals, bucket === "confidently-wrong", t),
    };
  });

  return { bucketCounts, meanBrier, fallback: mode === "fallback", buckets };
}
