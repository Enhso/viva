import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanFunctions } from "./extract";

const fixture = (folder: string, name: string) =>
  readFileSync(new URL(`../../fixtures/functions/${folder}/${name}`, import.meta.url), "utf8");

describe("scanFunctions", () => {
  it("rejects a React component for JSX, naming JSX/React", () => {
    const { eligible, rejected } = scanFunctions(fixture("out-of-scope", "Counter.jsx"));

    expect(eligible).toEqual([]);
    expect(rejected).toEqual([{ name: "Counter", violation: "jsx" }]);
  });

  it("rejects a function that calls fetch, naming network", () => {
    const { eligible, rejected } = scanFunctions(fixture("out-of-scope", "getWeather.js"));

    expect(eligible).toEqual([]);
    expect(rejected).toEqual([{ name: "getWeather", violation: "network" }]);
  });

  it("rejects a function that touches document, naming DOM", () => {
    const { eligible, rejected } = scanFunctions(fixture("out-of-scope", "toggleMenu.js"));

    expect(eligible).toEqual([]);
    expect(rejected).toEqual([{ name: "toggleMenu", violation: "dom" }]);
  });

  it("never rejects a function merely because a comment or string mentions fetch or document", () => {
    const source = [
      "// this function does not call fetch or touch document, it just talks about them",
      'function describeItself() {',
      '  return "fetch this from the document, hypothetically";',
      "}",
    ].join("\n");

    const { eligible, rejected } = scanFunctions(source);

    expect(rejected).toEqual([]);
    expect(eligible.map((fn) => fn.name)).toEqual(["describeItself"]);
  });

  it("keeps an eligible function eligible, and reports it alongside no rejections", () => {
    const { eligible, rejected } = scanFunctions(fixture("bootcamp", "sumRange.js"));

    expect(rejected).toEqual([]);
    expect(eligible.map((fn) => fn.name)).toEqual(["sumRange"]);
  });

  it("extracts all twelve bootcamp functions as eligible, average included", () => {
    const bootcampDir = fileURLToPath(new URL("../../fixtures/functions/bootcamp", import.meta.url));
    const files = readdirSync(bootcampDir).filter((name) => name.endsWith(".js"));

    const names = files.flatMap((name) => scanFunctions(readFileSync(`${bootcampDir}/${name}`, "utf8")).eligible.map((fn) => fn.name));

    expect(files.length).toBe(12);
    expect(names.sort()).toEqual(
      [
        "average",
        "countVowels",
        "findUser",
        "fizzBuzz",
        "formatPrice",
        "groupByLength",
        "isAdult",
        "isValidPassword",
        "makeCounter",
        "removeDuplicates",
        "sumRange",
        "topScores",
      ].sort(),
    );
  });
});
