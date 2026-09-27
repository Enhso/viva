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
});
