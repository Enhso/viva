import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractFunctions } from "./extract";
import { inferParamShapes } from "./shapes";

const bootcampDir = fileURLToPath(new URL("../../fixtures/functions/bootcamp/", import.meta.url));

function fixtureFunction(fileName: string, functionName: string) {
  const source = readFileSync(`${bootcampDir}${fileName}`, "utf8");
  const fn = extractFunctions(source).find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`fixture ${fileName} has no eligible function named ${functionName}`);
  return fn;
}

// Shapes drive the shared battery (09): boundary/edge values only make sense once a
// parameter's kind is known. Inferred from JSDoc types, default values, and how the body
// uses each parameter -- never from the parameter's name.
describe("inferParamShapes", () => {
  it("reads number, number from sumRange's JSDoc", () => {
    const fn = fixtureFunction("sumRange.js", "sumRange");
    expect(inferParamShapes(fn)).toEqual([{ kind: "number" }, { kind: "number" }]);
  });

  it("reads array<number>, number from topScores's JSDoc", () => {
    const fn = fixtureFunction("topScores.js", "topScores");
    expect(inferParamShapes(fn)).toEqual([
      { kind: "array", element: { kind: "number" } },
      { kind: "number" },
    ]);
  });

  it("infers a string from countVowels's indexed .toLowerCase() usage", () => {
    const fn = fixtureFunction("countVowels.js", "countVowels");
    expect(inferParamShapes(fn)).toEqual([{ kind: "string" }]);
  });

  it("infers array<object> with the field the for-of loop reads from findUser", () => {
    const fn = fixtureFunction("findUser.js", "findUser");
    expect(inferParamShapes(fn)).toEqual([
      { kind: "array", element: { kind: "object", fields: ["id"] } },
      { kind: "unknown" },
    ]);
  });

  it("infers array<number> from average's .reduce()/.length usage", () => {
    const fn = fixtureFunction("average.js", "average");
    expect(inferParamShapes(fn)).toEqual([{ kind: "array", element: { kind: "number" } }]);
  });

  it("infers number from a loop-bound comparison in fizzBuzz", () => {
    const fn = fixtureFunction("fizzBuzz.js", "fizzBuzz");
    expect(inferParamShapes(fn)).toEqual([{ kind: "number" }]);
  });

  it("infers number from arithmetic in formatPrice", () => {
    const fn = fixtureFunction("formatPrice.js", "formatPrice");
    expect(inferParamShapes(fn)).toEqual([{ kind: "number" }]);
  });

  it("infers number from a comparison against a literal in isAdult", () => {
    const fn = fixtureFunction("isAdult.js", "isAdult");
    expect(inferParamShapes(fn)).toEqual([{ kind: "number" }]);
  });

  it("infers a string from .includes()/regex .test() in isValidPassword", () => {
    const fn = fixtureFunction("isValidPassword.js", "isValidPassword");
    expect(inferParamShapes(fn)).toEqual([{ kind: "string" }]);
  });

  it("infers number from makeCounter's default value", () => {
    const fn = fixtureFunction("makeCounter.js", "makeCounter");
    expect(inferParamShapes(fn)).toEqual([{ kind: "number" }]);
  });

  it("infers an array from removeDuplicates's .push()/.indexOf() usage, element unknown", () => {
    const fn = fixtureFunction("removeDuplicates.js", "removeDuplicates");
    expect(inferParamShapes(fn)).toEqual([{ kind: "array", element: { kind: "unknown" } }]);
  });

  it("infers an array from groupByLength's indexing/.push() usage, element unknown", () => {
    const fn = fixtureFunction("groupByLength.js", "groupByLength");
    expect(inferParamShapes(fn)).toEqual([{ kind: "array", element: { kind: "unknown" } }]);
  });

  it("every bootcamp fixture gets a shape for each of its parameters", () => {
    const files = readdirSync(bootcampDir);
    for (const file of files) {
      const source = readFileSync(`${bootcampDir}${file}`, "utf8");
      for (const fn of extractFunctions(source)) {
        expect(inferParamShapes(fn)).toHaveLength(fn.params.length);
      }
    }
  });
});
