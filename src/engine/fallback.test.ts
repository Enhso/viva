import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runFallbackViva } from "./index";
import { BEATS_PER_MUTANT } from "./pacing";
import { createNodeRunner } from "./sandbox/node-runner";

const sumRangeSource = readFileSync(
  new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url),
  "utf8",
);

// The "fallback mode works at every commit" guard (CLAUDE.md, ticket 01).
describe("fallback viva on the sumRange fixture", () => {
  it("yields a beat whose distinguishing input was verified by running original and mutant", async () => {
    const viva = await runFallbackViva({ source: sumRangeSource, functionName: "sumRange" }, createNodeRunner());

    expect(viva.mode).toBe("fallback");
    const [beat] = viva.beats;
    expect(beat.mutant.diff).toEqual({
      line: 3,
      before: "  for (let i = start; i < end; i++) {",
      after: "  for (let i = start; i <= end; i++) {",
    });
    expect(beat.input).toEqual([3, 3]);
    expect(beat.mutantOutput).toEqual({ kind: "returned", value: 3 });
    // The docstring promises "inclusive", which would make this 3; the answer key follows execution.
    expect(beat.originalOutput).toEqual({ kind: "returned", value: 0 });
  });

  // Ticket 16: the same mutant is asked up to K (BEATS_PER_MUTANT) beats, taken from the front
  // of its answer key, one per distinguishing input -- not collapsed to a single beat.
  it("asks up to K beats for the one mutant, one per distinguishing input", async () => {
    const viva = await runFallbackViva({ source: sumRangeSource, functionName: "sumRange" }, createNodeRunner());

    expect(viva.beats).toHaveLength(BEATS_PER_MUTANT);
    expect(viva.beats.every((beat) => beat.mutant.id === viva.beats[0].mutant.id)).toBe(true);
    expect(viva.beats[1].input).toEqual([5, 5]);
    expect(viva.beats[1].mutantOutput).toEqual({ kind: "returned", value: 5 });
    expect(viva.beats[1].originalOutput).toEqual({ kind: "returned", value: 0 });
  });
});
