import { sameOutput, type Beat } from "../engine";
import { readPrediction, type PredictionReading } from "./read-prediction";

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
  /** How the typed prediction was read (10 §description): a literal value or a thrown error. */
  reading: PredictionReading;
  /** Percent, 0–100 at 0.1% precision, never rounded. */
  confidence: number;
  correct: boolean;
  bucket: CalibrationBucket;
  /** (confidence/100 − outcome)², outcome = 1 if correct else 0; computed on the exact confidence (06 §3). */
  brier: number;
}

// Plain value comparison against the answer key; no model is involved (09 §3). Grading uses
// sameOutput (04 §3), so a prediction equal to the original's output is always graded wrong on a
// distinguishing input — that input is, by definition, one where original and mutant disagree.
export function gradeBeat(beat: Beat, prediction: string, confidence: number): BeatResult {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new RangeError(`confidence must be a number between 0 and 100, got ${confidence}`);
  }
  const reading = readPrediction(prediction);
  const correct = sameOutput(reading, beat.mutantOutput);
  const confident = confidence >= CONFIDENCE_THRESHOLD;
  const bucket: CalibrationBucket = confident
    ? correct ? "confidently-right" : "confidently-wrong"
    : correct ? "uncertain-right" : "uncertain-wrong";
  const probability = confidence / 100;
  const brier = correct ? (1 - probability) ** 2 : probability ** 2;
  return { beat, prediction, reading, confidence, correct, bucket, brier };
}
