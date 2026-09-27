import fc from "fast-check";
import type { ParamShape } from "./shapes";
import type { SandboxRunner } from "./sandbox/types";
import { distinguishes } from "./distinguish";
import type { AnswerKeyEntry, CandidateMutant, EligibleFunction } from "./types";

// 09 §1 step 3: the per-mutant search that runs only when the shared battery distinguished
// nothing. Fixed seed, bounded run count (Hatim, ticket 09 Comments): a counterexample to the
// property "original ≡ mutant" is exactly a distinguishing input, and exhausting the budget
// without one is the evidence a mutant is equivalent and must be dropped (04 §1 step 4).
// Shrinking picks the search's own result only -- it never reorders the shared battery's beats.

export const TARGETED_SEARCH_SEED = 20260927;
export const TARGETED_SEARCH_RUNS = 200;

export async function targetedSearch(
  fn: EligibleFunction,
  mutant: CandidateMutant,
  shapes: ParamShape[],
  runner: SandboxRunner,
): Promise<AnswerKeyEntry | null> {
  if (shapes.length === 0) return null; // no input variation possible for a zero-arg function

  const arbitrary = fc.tuple(...shapes.map(arbitraryForShape));
  const report = await fc.check(
    fc.asyncProperty(arbitrary, async (input) => {
      const originalOutput = await runner.run({ source: fn.source, functionName: fn.name, input });
      const mutantOutput = await runner.run({ source: mutant.source, functionName: fn.name, input });
      return !distinguishes(originalOutput, mutantOutput);
    }),
    { seed: TARGETED_SEARCH_SEED, numRuns: TARGETED_SEARCH_RUNS },
  );

  if (!report.failed || !report.counterexample) return null;
  const input = report.counterexample[0] as unknown[];
  const originalOutput = await runner.run({ source: fn.source, functionName: fn.name, input });
  const mutantOutput = await runner.run({ source: mutant.source, functionName: fn.name, input });
  return { input, originalOutput, mutantOutput };
}

function arbitraryForShape(shape: ParamShape): fc.Arbitrary<unknown> {
  switch (shape.kind) {
    case "number":
      return fc.integer({ min: -1000, max: 1000 });
    case "string":
      return fc.string({ maxLength: 20 });
    case "boolean":
      return fc.boolean();
    case "array":
      return fc.array(arbitraryForShape(shape.element), { maxLength: 8 });
    case "object": {
      const fields = shape.fields.length > 0 ? shape.fields : ["id"];
      const shape_: Record<string, fc.Arbitrary<unknown>> = {};
      for (const field of fields) shape_[field] = field === "id" ? fc.integer() : fc.string({ maxLength: 8 });
      return fc.record(shape_);
    }
    case "unknown":
      return fc.oneof(fc.integer({ min: -1000, max: 1000 }), fc.string({ maxLength: 20 }), fc.boolean());
  }
}
