import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractFunctions } from "./extract";
import { generateCandidateMutants } from "./mutate";
import {
  chooseBeatFormat,
  collectDistractorOutputs,
  MAX_DISTRACTOR_CANDIDATES_TRIED,
  MAX_MULTIPLE_CHOICE_OPTIONS,
  shuffleOptions,
} from "./multiple-choice";
import { createPrng } from "./prng";
import { sameOutput } from "./outputs";
import { createNodeRunner } from "./sandbox/node-runner";
import type { RunOutcome } from "./sandbox/types";

const sumRangeSource = readFileSync(new URL("../../fixtures/functions/bootcamp/sumRange.js", import.meta.url), "utf8");

describe("chooseBeatFormat", () => {
  const VALUE_OUTPUT: RunOutcome = { kind: "returned", value: 3 };

  it("picks free-text when the draw falls under the free-text weight", () => {
    expect(chooseBeatFormat(0.8, 0.5, VALUE_OUTPUT)).toBe("free-text");
  });

  it("picks multiple-choice when the draw falls at or above the free-text weight", () => {
    expect(chooseBeatFormat(0.8, 0.9, VALUE_OUTPUT)).toBe("multiple-choice");
  });

  // Ruling (18): a "function"/"timeout" outcome's canonical text can't be read back by 10's
  // grader into that same RunOutcome kind, so picking the *correct* MCQ option there would
  // wrongly grade as incorrect. Free text has no such gap, so it's forced regardless of the draw.
  it("forces free-text for a returnedFunction output, even on a multiple-choice draw", () => {
    expect(chooseBeatFormat(0.8, 0.99, { kind: "returnedFunction" })).toBe("free-text");
  });

  it("forces free-text for a timeout output, even on a multiple-choice draw", () => {
    expect(chooseBeatFormat(0.8, 0.99, { kind: "timeout" })).toBe("free-text");
  });
});

describe("collectDistractorOutputs", () => {
  it("excludes the correct output and de-duplicates repeated wrong outputs", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const candidates = generateCandidateMutants(fn);
    const runner = createNodeRunner();
    const correctOutput: RunOutcome = { kind: "returned", value: 3 }; // the mutant's own output on (3, 3)

    const distractors = await collectDistractorOutputs(
      { runner, fn, input: [3, 3], otherCandidates: candidates },
      correctOutput,
    );

    for (const distractor of distractors) {
      expect(sameOutput(distractor, correctOutput)).toBe(false);
    }
    for (let i = 0; i < distractors.length; i++) {
      for (let j = i + 1; j < distractors.length; j++) {
        expect(sameOutput(distractors[i], distractors[j])).toBe(false);
      }
    }
  });

  it("never tries more than the bounded number of other candidates", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const candidates = generateCandidateMutants(fn);
    let calls = 0;
    const countingRunner = {
      run: async (request: { source: string; functionName: string; input: unknown[] }) => {
        calls++;
        return createNodeRunner().run(request);
      },
    };

    await collectDistractorOutputs(
      { runner: countingRunner, fn, input: [3, 3], otherCandidates: candidates },
      { kind: "returned", value: 3 },
    );

    expect(calls).toBeLessThanOrEqual(MAX_DISTRACTOR_CANDIDATES_TRIED);
  });

  it("returns at most enough distractors to fill the option cap", async () => {
    const fn = extractFunctions(sumRangeSource).find((candidate) => candidate.name === "sumRange")!;
    const candidates = generateCandidateMutants(fn);
    const runner = createNodeRunner();

    const distractors = await collectDistractorOutputs(
      { runner, fn, input: [3, 3], otherCandidates: candidates },
      { kind: "returned", value: 3 },
    );

    expect(distractors.length).toBeLessThanOrEqual(MAX_MULTIPLE_CHOICE_OPTIONS - 1);
  });
});

describe("shuffleOptions", () => {
  const correct: RunOutcome = { kind: "returned", value: 3 };
  const distractors: RunOutcome[] = [{ kind: "returned", value: 0 }, { kind: "returned", value: 5 }];

  it("returns null when there are no distractors (fallback to free text)", () => {
    expect(shuffleOptions(correct, [], createPrng(1))).toBeNull();
  });

  it("includes the correct output plus every distractor, with correctIndex pointing at it", () => {
    const result = shuffleOptions(correct, distractors, createPrng(1))!;
    expect(result.options).toHaveLength(3);
    expect(result.options[result.correctIndex]).toBe(correct);
    expect(result.options).toEqual(expect.arrayContaining([correct, ...distractors]));
  });

  it("is deterministic for a given PRNG sequence", () => {
    const a = shuffleOptions(correct, distractors, createPrng(7))!;
    const b = shuffleOptions(correct, distractors, createPrng(7))!;
    expect(a).toEqual(b);
  });

  // The spec's core integrity requirement (05 §4): position must not cluster. Checked here by
  // running the shuffle many times with a fresh PRNG state each time and histogramming the
  // resulting correctIndex.
  it("spreads the correct position roughly uniformly over many independent shuffles", () => {
    const counts = [0, 0, 0];
    const n = 6000;
    for (let seed = 1; seed <= n; seed++) {
      const result = shuffleOptions(correct, distractors, createPrng(seed))!;
      counts[result.correctIndex]++;
    }
    const expected = n / counts.length;
    for (const count of counts) {
      expect(Math.abs(count - expected)).toBeLessThan(expected * 0.2);
    }
  });
});
