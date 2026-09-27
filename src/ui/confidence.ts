// Pure arithmetic for the confidence widget (06 §1-4). The underlying value is held as an
// integer count of tenths-of-a-percent (0..1000, i.e. 0%..100.0%) everywhere in this module so
// repeated 0.1% nudges never accumulate float noise (0.1 + 0.1 + ... != 0.30000000000000004).
// Callers convert to/from a plain percent number only at the edges (rendering, and the one
// value handed to grading), per the ticket's "convert once" note.

export interface LegendBucket {
  id: string;
  labelKey: string;
  min: number;
  max: number;
  snapToTenths: number;
}

// Boundaries are implementation's call (spec 06 §2). Five buckets, centered so the middle one
// straddles 50% — the report's fixed threshold and the widget's own "no real belief either way"
// indifference point (07 §3, CONTEXT.md "Confidence").
export const LEGEND_BUCKETS: readonly LegendBucket[] = [
  { id: "guessing", labelKey: "confidence.legend.guessing", min: 0, max: 20, snapToTenths: 100 },
  { id: "leaning", labelKey: "confidence.legend.leaning", min: 20, max: 40, snapToTenths: 300 },
  { id: "indifferent", labelKey: "confidence.legend.indifferent", min: 40, max: 60, snapToTenths: 500 },
  { id: "fairlySure", labelKey: "confidence.legend.fairlySure", min: 60, max: 80, snapToTenths: 700 },
  { id: "certain", labelKey: "confidence.legend.certain", min: 80, max: 100, snapToTenths: 900 },
];

export const MIN_TENTHS = 0;
export const MAX_TENTHS = 1000;

export function clampTenths(tenths: number): number {
  return Math.min(MAX_TENTHS, Math.max(MIN_TENTHS, tenths));
}

/** Percent (e.g. 67.3) -> integer tenths (673), rounding away any float noise. */
export function percentToTenths(percent: number): number {
  return clampTenths(Math.round(percent * 10));
}

/** Integer tenths (673) -> percent (67.3), the one point this module hands a float back out. */
export function tenthsToPercent(tenths: number): number {
  return clampTenths(tenths) / 10;
}

/** +/- buttons: exactly one 0.1% step, clamped. */
export function nudgeTenths(tenths: number, direction: 1 | -1): number {
  return clampTenths(tenths + direction);
}

/** Slider drag: 1% (10 tenths) increments, from the slider's own percent value. */
export function sliderStepTenths(percent: number): number {
  return clampTenths(Math.round(percent) * 10);
}

export function snapToLegendBucket(bucketId: string): number {
  const bucket = LEGEND_BUCKETS.find((b) => b.id === bucketId);
  if (!bucket) throw new RangeError(`unknown legend bucket: ${bucketId}`);
  return bucket.snapToTenths;
}

/**
 * The numeric box's text as a percent, or null when the widget can't hold it exactly: outside
 * 0-100, finer than 0.1%, or not a plain decimal. Never rounds, so the recorded confidence always
 * equals what the box shows (ticket 05); null disables Reveal until the entry is fixed.
 */
export function parseBoxEntry(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}(\.\d)?$/.test(trimmed)) return null;
  const percent = Number(trimmed);
  return percent <= 100 ? percent : null;
}
