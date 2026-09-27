import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { complexityScore, orderByComplexity } from "./complexity";
import { extractFunctions } from "./extract";
import type { EligibleFunction } from "./types";

const fixture = (name: string) => readFileSync(new URL(`../../fixtures/functions/bootcamp/${name}`, import.meta.url), "utf8");

describe("complexityScore", () => {
  it("scores a function with no branches at the base path, 1", () => {
    const [topScores] = extractFunctions(fixture("topScores.js"));
    expect(complexityScore(topScores.source)).toBe(1);
  });

  it("adds one for a single if, with no addition for its else", () => {
    const [isAdult] = extractFunctions(fixture("isAdult.js"));
    expect(complexityScore(isAdult.source)).toBe(2);
  });

  it("adds one per loop and one per if, both present", () => {
    const [countVowels] = extractFunctions(fixture("countVowels.js"));
    expect(complexityScore(countVowels.source)).toBe(3);
  });

  it("adds one per short-circuit logical operator and one per else-if", () => {
    // for(1) + if(1) + &&(1) + else-if(1) + else-if(1), base 1 => 6
    const [fizzBuzz] = extractFunctions(fixture("fizzBuzz.js"));
    expect(complexityScore(fizzBuzz.source)).toBe(6);
  });
});

function makeFn(name: string, source: string): EligibleFunction {
  return { name, params: [], signature: `${name}()`, source, docstring: null };
}

describe("orderByComplexity", () => {
  it("orders descending by score", () => {
    const low = makeFn("low", "function low() { return 1; }");
    const high = makeFn("high", "function high() { if (a) { if (b) { return 1; } } return 0; }");

    const ordered = orderByComplexity([low, high]);

    expect(ordered.map((entry) => entry.fn.name)).toEqual(["high", "low"]);
  });

  it("breaks a tie deterministically by name when scores and leaf-ness match", () => {
    const b = makeFn("b", "function b() { return 1; }");
    const a = makeFn("a", "function a() { return 1; }");

    const ordered = orderByComplexity([b, a]);

    expect(ordered.map((entry) => entry.fn.name)).toEqual(["a", "b"]);
  });

  it("puts a leaf function (no calls to other known eligible functions) before a non-leaf at the same score", () => {
    const caller = makeFn("caller", "function caller() { return helper(); }");
    const helper = makeFn("helper", "function helper() { return 1; }");

    const ordered = orderByComplexity([caller, helper]);

    expect(ordered.map((entry) => entry.fn.name)).toEqual(["helper", "caller"]);
  });
});
