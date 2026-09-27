import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runFallbackViva } from "./index";
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
