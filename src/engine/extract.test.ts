import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractFunctions } from "./index";

const fixture = (name: string) =>
  readFileSync(new URL(`../../fixtures/functions/bootcamp/${name}`, import.meta.url), "utf8");

describe("extractFunctions", () => {
  it("gives an eligible function its source, signature, and JSDoc", () => {
    const [sumRange] = extractFunctions(fixture("sumRange.js"));

    expect(sumRange.name).toBe("sumRange");
    expect(sumRange.signature).toBe("sumRange(start, end)");
    expect(sumRange.source.startsWith("function sumRange(start, end) {")).toBe(true);
    expect(sumRange.source.endsWith("return total;\n}")).toBe(true);
    expect(sumRange.docstring).toBe(
      [
        "/**",
        " * Adds up every whole number from start to end, inclusive.",
        " * @param {number} start",
        " * @param {number} end",
        " * @returns {number}",
        " */",
      ].join("\n"),
    );
  });

  it("marks a function without a JSDoc block as having no docstring", () => {
    const [countVowels] = extractFunctions(fixture("countVowels.js"));

    expect(countVowels.docstring).toBeNull();
  });

  it("never attributes a later function's JSDoc to an earlier function", () => {
    const source = ["function a() {}", "", "/** doc for b */", "function b() {}"].join("\n");

    const [a, b] = extractFunctions(source);

    expect(a.docstring).toBeNull();
    expect(b.docstring).toBe("/** doc for b */");
  });

  it("never lets a comment inside a function's body become another function's docstring", () => {
    const source = ["function a() {", "  /** inner */", "  return 1;", "}", "", "function b() {}"].join("\n");

    const [a, b] = extractFunctions(source);

    expect(a.docstring).toBeNull();
    expect(b.docstring).toBeNull();
  });

  it("treats an arrow function assigned to a top-level const as an eligible function", () => {
    const [average] = extractFunctions(fixture("average.js"));

    expect(average.name).toBe("average");
    expect(average.signature).toBe("average(nums)");
    expect(average.docstring).toBeNull();
  });

  it("extracts an exported function declaration, without the leading export keyword in its source", () => {
    const source = ["/** doc */", "export function greet(name) {", "  return `hi ${name}`;", "}"].join("\n");

    const [greet] = extractFunctions(source);

    expect(greet.name).toBe("greet");
    expect(greet.docstring).toBe("/** doc */");
    expect(greet.source.startsWith("export")).toBe(false);
    expect(greet.source.startsWith("function greet(name)")).toBe(true);
  });

  it("extracts an exported const arrow function, without the leading export keyword in its source", () => {
    const source = ["/** doc */", "export const greet = (name) => `hi ${name}`;"].join("\n");

    const [greet] = extractFunctions(source);

    expect(greet.name).toBe("greet");
    expect(greet.docstring).toBe("/** doc */");
    expect(greet.source.startsWith("export")).toBe(false);
    expect(greet.source.startsWith("const greet")).toBe(true);
  });

  it("never surfaces a nested function as its own eligible function", () => {
    const source = ["function outer() {", "  function inner() {}", "  return inner;", "}"].join("\n");

    const found = extractFunctions(source);

    expect(found.map((fn) => fn.name)).toEqual(["outer"]);
  });
});
