import { renderCall, renderOutput, type Beat, type MutationRule, type VivaMode } from "../engine";
import { describeOutput, translate } from "../ui/strings";
import { CALIBRATION_BUCKETS, type BeatResult, type CalibrationBucket } from "./grade";

// Tier 1 report text is generated ahead of the language layer (ticket 24), which threads a
// selected language through the report; fixed to "en" here in the meantime.
const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate("en", key, vars);

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

/**
 * The same-concept label-grouping result (ticket 22, 07 §6), as plain data: grading never
 * imports src/llm (architecture-boundary.test.ts), so this mirrors the shape of
 * `src/llm/label-grouping.ts`'s `LabelGroupingResult` independently rather than importing it.
 * `groupKeyByLabel` is consumed by `buildReport` to merge groups on top of exact-text matching;
 * `mechanism`/`provider` are kept on the built `Report` for the disclosure (09-disclosure.md).
 */
export interface LabelGroupingInput {
  mechanism: "jev" | "embedding" | "exact-text";
  /** Named only for "embedding". */
  provider?: string;
  /** Every label present in `results` maps to its group's representative key; a label missing
   * from this map (e.g. the grouping call hadn't returned yet) groups by its own exact text. */
  groupKeyByLabel: Record<string, string>;
}

export interface Report {
  bucketCounts: Record<CalibrationBucket, number>;
  /** Mean of each beat's Brier score, computed on exact confidence (06 §3); null when there are no beats. */
  meanBrier: number | null;
  /** Whether the whole viva ran with no model (09 §4 fallback mode); the report states this plainly. */
  fallback: boolean;
  /** Which mechanism grouped this viva's taxonomy labels (ticket 22 checklist item), for the
   * disclosure to read; null when `buildReport` was called with no grouping result at all
   * (grouping never ran, or is still in flight) -- groups then default to exact-text matching. */
  labelGrouping: { mechanism: LabelGroupingInput["mechanism"]; provider?: string } | null;
  buckets: BucketReport[];
}

function toEntry(result: BeatResult): ReportEntry {
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

// Preserves first-seen order of group keys (including null, the unlabelled group) within the
// bucket. `keyFor` resolves a beat's exact taxonomy label to its report-group key: the
// label-grouping result's mapped key when one was given (ticket 22), or the label itself
// (exact-text matching, the pre-ticket-22 and no-grouping-result behavior) otherwise.
function groupByLabel(
  bucketResults: BeatResult[],
  labelTotals: Map<string, number>,
  withConnectingLine: boolean,
  keyFor: (label: string) => string,
): LabelGroup[] {
  const order: (string | null)[] = [];
  const byKey = new Map<string | null, ReportEntry[]>();
  for (const result of bucketResults) {
    const label = result.beat.mutant.taxonomyLabel;
    const key = label === null ? null : keyFor(label);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(toEntry(result));
  }
  return order.map((key) => {
    const entries = byKey.get(key)!;
    const connectingLine =
      withConnectingLine && key !== null
        ? t("report.connectingLine", {
            wrongCount: entries.length,
            totalCount: labelTotals.get(key) ?? entries.length,
            label: key,
            confidenceFloor: Math.floor(Math.min(...entries.map((entry) => entry.confidence)) / 10) * 10,
          })
        : null;
    return { label: key, entries, connectingLine };
  });
}

/**
 * `labelGrouping` is optional, plain data (ticket 22): the same-concept grouping result computed
 * in src/llm/ behind the serverless function, or null when no grouping call has been made (or
 * hasn't resolved yet) -- either way the report renders, grouped by exact label text.
 */
export function buildReport(results: BeatResult[], mode: VivaMode, labelGrouping: LabelGroupingInput | null = null): Report {
  const bucketCounts = Object.fromEntries(CALIBRATION_BUCKETS.map((bucket) => [bucket, 0])) as Record<CalibrationBucket, number>;
  for (const result of results) bucketCounts[result.bucket] += 1;
  const meanBrier = results.length === 0 ? null : results.reduce((sum, result) => sum + result.brier, 0) / results.length;

  const keyFor = (label: string): string => labelGrouping?.groupKeyByLabel[label] ?? label;

  // How many beats each *group key* was asked about across the whole viva, any bucket — the
  // connecting line's "X of Y" needs the denominator to span every occurrence of every label in
  // the group, not just the confidently-wrong ones that made it into this one bucket's group.
  const labelTotals = new Map<string, number>();
  for (const result of results) {
    const label = result.beat.mutant.taxonomyLabel;
    if (label !== null) {
      const key = keyFor(label);
      labelTotals.set(key, (labelTotals.get(key) ?? 0) + 1);
    }
  }

  const buckets = CALIBRATION_BUCKETS.map((bucket): BucketReport => {
    const bucketResults = results.filter((result) => result.bucket === bucket);
    return {
      bucket,
      count: bucketResults.length,
      groups: groupByLabel(bucketResults, labelTotals, bucket === "confidently-wrong", keyFor),
    };
  });

  return {
    bucketCounts,
    meanBrier,
    fallback: mode === "fallback",
    labelGrouping: labelGrouping ? { mechanism: labelGrouping.mechanism, provider: labelGrouping.provider } : null,
    buckets,
  };
}
