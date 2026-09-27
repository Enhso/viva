import { sameOutput, type Beat } from "../engine";

export type CalibrationBucket = "confidently-right" | "confidently-wrong" | "uncertain-right" | "uncertain-wrong";

export const CALIBRATION_BUCKETS: readonly CalibrationBucket[] = [
  "confidently-right",
  "confidently-wrong",
  "uncertain-right",
  "uncertain-wrong",
];

/** Fixed for every student and every viva (07 §3). */
export const CONFIDENCE_THRESHOLD = 50;

export interface BeatResult {
  beat: Beat;
  /** The prediction as the student typed it. */
  prediction: string;
  /** Percent, 0–100 at 0.1% precision, never rounded. */
  confidence: number;
  correct: boolean;
  bucket: CalibrationBucket;
}

// Plain value comparison against the answer key; no model is involved (09 §3).
export function gradeBeat(beat: Beat, prediction: string, confidence: number): BeatResult {
  const correct = sameOutput({ kind: "returned", value: readPrediction(prediction) }, beat.mutantOutput);
  const confident = confidence >= CONFIDENCE_THRESHOLD;
  const bucket: CalibrationBucket = confident
    ? correct ? "confidently-right" : "confidently-wrong"
    : correct ? "uncertain-right" : "uncertain-wrong";
  return { beat, prediction, confidence, correct, bucket };
}

const NON_JSON_LITERALS = new Map<string, unknown>([
  ["undefined", undefined],
  ["NaN", NaN],
  ["Infinity", Infinity],
  ["-Infinity", -Infinity],
]);

// Ticket 01's reading: a JSON literal, else a bare string. Ticket 10 replaces it with a JS-literal reader.
function readPrediction(text: string): unknown {
  const trimmed = text.trim();
  if (NON_JSON_LITERALS.has(trimmed)) return NON_JSON_LITERALS.get(trimmed);
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}
