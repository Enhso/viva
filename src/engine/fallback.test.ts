import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runFallbackViva } from "./index";
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
    expect(viva.beats).toHaveLength(1);
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
