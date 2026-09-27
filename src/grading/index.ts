// Model-free by construction: nothing here may import from src/llm (architecture-boundary.test.ts).
export { CALIBRATION_BUCKETS, CONFIDENCE_THRESHOLD, gradeBeat, type BeatFormat, type BeatResult, type CalibrationBucket } from "./grade";
export { readPrediction, type PredictionReading } from "./read-prediction";
export { buildReport, type BucketReport, type LabelGroup, type LabelGroupingInput, type Report, type ReportEntry } from "./report";
