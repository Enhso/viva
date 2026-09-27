import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runFallbackViva } from "./index";
import { sameOutput } from "./outputs";
import { BEATS_PER_MUTANT } from "./pacing";
import { createNodeRunner } from "./sandbox/node-runner";

const sumRangeSource = readFileSync(
  new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url),
  "utf8",
);
const makeCounterSource = readFileSync(
  new URL("../../fixtures/functions/bootcamp/makeCounter.js", import.meta.url),
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

  // Ticket 18: every beat records a format, decided when the beat is built.
  it("gives every beat a format, free-text or multiple-choice", async () => {
    const viva = await runFallbackViva({ source: sumRangeSource, functionName: "sumRange" }, createNodeRunner());

    for (const beat of viva.beats) {
      expect(["free-text", "multiple-choice"]).toContain(beat.format);
    }
  });

  // Ticket 18 (05 §4): a multiple-choice beat's options hold the correct output plus real,
  // pairwise-distinct distractors, and correctOptionIndex actually points at the mutant's output.
  it("builds valid multiple-choice options whenever a beat lands on that format", async () => {
    const viva = await runFallbackViva({ source: sumRangeSource, functionName: "sumRange" }, createNodeRunner());
    const mcqBeats = viva.beats.filter((beat) => beat.format === "multiple-choice");
    expect(mcqBeats.length).toBeGreaterThan(0); // this fixture's fixed seed lands at least one here

    for (const beat of mcqBeats) {
      expect(beat.options).toBeDefined();
      expect(beat.correctOptionIndex).toBeDefined();
      const options = beat.options!;
      expect(options[beat.correctOptionIndex!]).toEqual(beat.mutantOutput);
      expect(options.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < options.length; i++) {
        for (let j = i + 1; j < options.length; j++) {
          expect(sameOutput(options[i], options[j])).toBe(false);
        }
      }
    }
  });
});

describe("the answer key never holds a timeout (ticket 04, R3)", () => {
  it("drops sumRange's loop-bound mutant (i-- never ends) instead of asking about timeouts", async () => {
    const { extractFunctions, generateCandidateMutants, findDistinguishingInputs, sharedBattery } = await import("./index");
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const loopBound = generateCandidateMutants(fn).find((mutant) => mutant.rule === "loop-bound-change")!;

    const answerKey = await findDistinguishingInputs(fn, loopBound, sharedBattery(fn), createNodeRunner({ timeoutMs: 50 }));

    // When `i--` terminates (start >= end, loop never runs) it returns what the original returns.
    expect(answerKey).toEqual([]);
  });
});

// Ticket 17: a function-valued return (the closure `makeCounter` returns) must still produce a
// real, verified-distinguishing beat, not be silently equivalent for every mutant.
describe("fallback viva on the makeCounter fixture (a function-valued return)", () => {
  it("yields a beat whose original and mutant outputs are the three-call observation, as plain arrays", async () => {
    const viva = await runFallbackViva({ source: makeCounterSource, functionName: "makeCounter" }, createNodeRunner());

    expect(viva.mode).toBe("fallback");
    expect(viva.beats.length).toBeGreaterThan(0);
    const [beat] = viva.beats;
    // The original always returns a function (per fixture), so its outcome is always the
    // three-call observation, whatever the mutant itself does.
    expect(beat.originalOutput).toMatchObject({ kind: "returned", calledReturnedFunction: true });
    expect(Array.isArray((beat.originalOutput as { value: unknown }).value)).toBe(true);
    expect((beat.originalOutput as { value: unknown[] }).value).toHaveLength(3);
    // Original and mutant must actually disagree (04 §3) -- that's what "distinguishing" means.
    expect(beat.originalOutput).not.toEqual(beat.mutantOutput);
  });
});
