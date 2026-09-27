import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateCandidateMutants } from "./mutate";
import { extractFunctions } from "./extract";
import { runLiveViva } from "./live";
import { sameOutput } from "./outputs";
import { BEATS_PER_MUTANT, MUTANTS_PER_FUNCTION } from "./pacing";
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

  // Ticket 16: viva length is bounded by K (beats per mutant) and M (mutants per function),
  // both single-sourced in pacing.ts (08).
  it("asks at most K beats for a mutant with more distinguishing inputs than K", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const [candidate] = generateCandidateMutants(fn); // relational-flip: 42 distinguishing inputs on the battery

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      [{ candidate, taxonomyLabel: "off-by-one" }],
      createNodeRunner(),
    );

    expect(viva.beats.length).toBe(BEATS_PER_MUTANT);
  });

  it("asks at most M mutants of one function, even when more survive", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const candidates = generateCandidateMutants(fn); // 5 candidates, all non-equivalent on this fixture
    expect(candidates.length).toBeGreaterThan(MUTANTS_PER_FUNCTION);

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      candidates.map((candidate) => ({ candidate, taxonomyLabel: "off-by-one" })),
      createNodeRunner(),
    );

    const askedMutantIds = new Set(viva.beats.map((beat) => beat.mutant.id));
    expect(askedMutantIds.size).toBe(MUTANTS_PER_FUNCTION);
    expect(viva.beats).toHaveLength(MUTANTS_PER_FUNCTION * BEATS_PER_MUTANT);
  });

  it("keeps beats of one mutant consecutive, in source order, before moving to the next mutant", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const candidates = generateCandidateMutants(fn);

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      candidates.map((candidate) => ({ candidate, taxonomyLabel: "off-by-one" })),
      createNodeRunner(),
    );

    const seenIds: string[] = [];
    for (const beat of viva.beats) {
      if (seenIds[seenIds.length - 1] !== beat.mutant.id) seenIds.push(beat.mutant.id);
    }
    // No mutant id reappears after the run has moved past it -- consecutive, never interleaved.
    expect(new Set(seenIds).size).toBe(seenIds.length);
  });

  // Ticket 18: distractors draw from every candidate mutant, including ones the filter call
  // never loaded -- exercised here by loading only the first candidate but leaving the fixture's
  // other (unloaded) candidates in place for the distractor pool to draw from.
  it("gives every beat a format and, for multiple-choice, valid options drawn from real candidate outputs", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const [candidate] = generateCandidateMutants(fn);

    const viva = await runLiveViva(
      { source: sumRangeSource, functionName: "sumRange" },
      [{ candidate, taxonomyLabel: "off-by-one" }],
      createNodeRunner(),
    );

    for (const beat of viva.beats) {
      expect(["free-text", "multiple-choice"]).toContain(beat.format);
    }
    const mcqBeats = viva.beats.filter((beat) => beat.format === "multiple-choice");
    expect(mcqBeats.length).toBeGreaterThan(0); // this fixture's fixed seed lands at least one here
    for (const beat of mcqBeats) {
      const options = beat.options!;
      expect(options[beat.correctOptionIndex!]).toEqual(beat.mutantOutput);
      for (let i = 0; i < options.length; i++) {
        for (let j = i + 1; j < options.length; j++) {
          expect(sameOutput(options[i], options[j])).toBe(false);
        }
      }
    }
  });
});
