import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractFunctions } from "./extract";
import { generateCandidateMutants } from "./mutate";
import { createNodeRunner } from "./sandbox/node-runner";
import { targetedSearch } from "./targeted-search";

const sumRangeSource = readFileSync(
  new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url),
  "utf8",
);

const runner = createNodeRunner();

// 09 §1 step 3 (Hatim, Comments): fast-check with a fixed seed powers this bounded search. A
// counterexample to "original ≡ mutant" is exactly a distinguishing input; exhausting the run
// budget with none found is the equivalent-mutant evidence.
describe("targetedSearch", () => {
  it("finds a distinguishing input for a mutant the shared battery happened to miss", async () => {
    const fn = extractFunctions(sumRangeSource).find((c) => c.name === "sumRange")!;
    const [mutant] = generateCandidateMutants(fn);

    const found = await targetedSearch(fn, mutant, [{ kind: "number" }, { kind: "number" }], runner);

    expect(found).not.toBeNull();
    const originalOutput = await runner.run({ source: fn.source, functionName: fn.name, input: found!.input });
    const mutantOutput = await runner.run({ source: mutant.source, functionName: fn.name, input: found!.input });
    expect(originalOutput).toEqual(found!.originalOutput);
    expect(mutantOutput).toEqual(found!.mutantOutput);
  });

  it("finds nothing for a mutant with source identical to the original (truly equivalent)", async () => {
    const fn = extractFunctions(sumRangeSource).find((c) => c.name === "sumRange")!;
    const [candidate] = generateCandidateMutants(fn);
    const equivalent = { ...candidate, source: fn.source };

    const found = await targetedSearch(fn, equivalent, [{ kind: "number" }, { kind: "number" }], runner);

    expect(found).toBeNull();
  });

  it("is deterministic: repeated runs against the same mutant agree on the input found", async () => {
    const fn = extractFunctions(sumRangeSource).find((c) => c.name === "sumRange")!;
    const [mutant] = generateCandidateMutants(fn);

    const first = await targetedSearch(fn, mutant, [{ kind: "number" }, { kind: "number" }], runner);
    const second = await targetedSearch(fn, mutant, [{ kind: "number" }, { kind: "number" }], runner);

    expect(second).toEqual(first);
  });
});
