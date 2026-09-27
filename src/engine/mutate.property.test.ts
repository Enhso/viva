import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { parse } from "acorn";
import { describe, expect, it } from "vitest";
import { extractFunctions, generateCandidateMutants } from "./index";

// Every eligible function in the bootcamp corpus, one entry per function (not per file: some
// files hold none once the scope check runs, though none currently do).
const bootcampDir = fileURLToPath(new URL("../../fixtures/functions/bootcamp/", import.meta.url));
const bootcampFunctions = readdirSync(bootcampDir).flatMap((file) =>
  extractFunctions(readFileSync(`${bootcampDir}${file}`, "utf8")),
);

// Law (ticket 03 Comments, Hatim-approved PBT scope): every candidate mutant parses, and the
// same source yields the same candidate ids in the same order. Fixed seed for reproducibility.
describe("generateCandidateMutants: property", () => {
  it("every candidate mutant's source parses as JavaScript", () => {
    fc.assert(
      fc.property(fc.constantFrom(...bootcampFunctions), (fn) => {
        for (const candidate of generateCandidateMutants(fn)) {
          expect(() => parse(candidate.source, { ecmaVersion: "latest", sourceType: "module" })).not.toThrow();
        }
      }),
      { seed: 20260927, numRuns: bootcampFunctions.length },
    );
  });

  it("yields the same candidate ids in the same order for the same source", () => {
    fc.assert(
      fc.property(fc.constantFrom(...bootcampFunctions), (fn) => {
        const first = generateCandidateMutants(fn).map((c) => c.id);
        const second = generateCandidateMutants(fn).map((c) => c.id);
        expect(second).toEqual(first);
      }),
      { seed: 20260927, numRuns: bootcampFunctions.length },
    );
  });

  it("every bootcamp fixture yields at least one candidate mutant", () => {
    for (const fn of bootcampFunctions) {
      expect(generateCandidateMutants(fn).length).toBeGreaterThan(0);
    }
  });
});
