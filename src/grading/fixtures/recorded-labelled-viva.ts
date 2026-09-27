import type { Beat, EligibleFunction, SurvivingMutant } from "../../engine";

// A recorded, labelled viva (07's criteria for ticket 19), hand-assembled from the engine's own
// types rather than a real filter-call run — this exercises buildReport's grouping and connecting
// lines without depending on a live model call. Kept out of fixtures/functions/ (that directory
// holds source JS the extractor parses; this is already-shaped Beat data).

const sumRange: EligibleFunction = {
  name: "sumRange",
  params: ["start", "end"],
  signature: "sumRange(start, end)",
  source: "function sumRange(start, end) { let total = 0; for (let i = start; i < end; i++) total += i; return total; }",
  docstring: null,
};

const isPositive: EligibleFunction = {
  name: "isPositive",
  params: ["n"],
  signature: "isPositive(n)",
  source: "function isPositive(n) { return n > 0; }",
  docstring: null,
};

function mutant(id: string, fn: EligibleFunction, overrides: Partial<SurvivingMutant>): SurvivingMutant {
  return {
    id,
    functionName: fn.name,
    rule: "relational-flip",
    rewrite: { from: "<", to: "<=" },
    location: { start: 0, end: 1 },
    source: fn.source,
    diff: { line: 1, before: "<", after: "<=" },
    answerKey: [],
    taxonomyLabel: null,
    ...overrides,
  };
}

function beat(id: string, fn: EligibleFunction, m: SurvivingMutant, input: unknown[], originalValue: unknown, mutantValue: unknown): Beat {
  return {
    id,
    function: fn,
    mutant: m,
    input,
    originalOutput: { kind: "returned", value: originalValue },
    mutantOutput: { kind: "returned", value: mutantValue },
  };
}

// Two occurrences of "off-by-one boundary" answered wrong at ≥50% confidence, one answered right;
// one "sign flip" answered wrong confidently, one answered right unconfidently; one fallback beat
// (no taxonomy label) answered wrong unconfidently.
export const recordedLabelledViva: { beats: Beat[]; predictions: { prediction: string; confidence: number }[] } = {
  beats: [
    beat("b1", sumRange, mutant("m1", sumRange, { taxonomyLabel: "off-by-one boundary" }), [3, 3], 0, 3),
    beat("b2", sumRange, mutant("m2", sumRange, { taxonomyLabel: "off-by-one boundary" }), [5, 5], 0, 5),
    beat("b3", sumRange, mutant("m3", sumRange, { taxonomyLabel: "off-by-one boundary" }), [1, 1], 0, 1),
    beat("b4", isPositive, mutant("m4", isPositive, { rule: "boolean-literal-flip", rewrite: { from: ">", to: ">=" }, taxonomyLabel: "sign flip" }), [0], false, true),
    beat("b5", isPositive, mutant("m5", isPositive, { rule: "boolean-literal-flip", rewrite: { from: ">", to: ">=" }, taxonomyLabel: "sign flip" }), [-1], false, false),
    beat("b6", sumRange, mutant("m6", sumRange, {}), [2, 2], 0, 2),
  ],
  predictions: [
    { prediction: "0", confidence: 80 }, // b1: wrong, confident
    { prediction: "0", confidence: 75 }, // b2: wrong, confident
    { prediction: "1", confidence: 60 }, // b3: right, confident
    { prediction: "false", confidence: 90 }, // b4: wrong (mutant returns true), confident
    { prediction: "false", confidence: 20 }, // b5: right (mutant returns false), uncertain
    { prediction: "0", confidence: 30 }, // b6: wrong, uncertain, no label (fallback beat)
  ],
};
