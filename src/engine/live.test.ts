import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateCandidateMutants } from "./mutate";
import { extractFunctions } from "./extract";
import { runLiveViva } from "./live";
import { createNodeRunner } from "./sandbox/node-runner";

const sumRangeSource = readFileSync(
  new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url),
  "utf8",
);

// The filter call happens outside the engine (src/llm); this seam takes already-labeled
// mutants as plain data, so the engine never imports src/llm (architecture-boundary.test.ts).
describe("live viva on pre-filtered, labeled mutants", () => {
  it("yields one beat per distinguishing input, carrying the given taxonomy label", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const [candidate] = generateCandidateMutants(fn);

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      [{ candidate, taxonomyLabel: "off-by-one" }],
      createNodeRunner(),
    );

    expect(viva.mode).toBe("live");
    expect(viva.beats.length).toBeGreaterThan(0);
    for (const beat of viva.beats) {
      expect(beat.mutant.taxonomyLabel).toBe("off-by-one");
      expect(beat.mutant.id).toBe(candidate.id);
    }
  });

  it("drops an equivalent mutant (no distinguishing input) without producing a beat", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const [candidate] = generateCandidateMutants(fn);
    // A mutant identical to the original never distinguishes on any input.
    const equivalent = { ...candidate, source: fn.source, id: `${candidate.id}:equivalent` };

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      [{ candidate: equivalent, taxonomyLabel: "off-by-one" }],
      createNodeRunner(),
    );

    expect(viva.beats).toHaveLength(0);
  });
});
