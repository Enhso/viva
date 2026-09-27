import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractFunctions } from "./extract";
import { sharedBattery } from "./battery";

const bootcampDir = fileURLToPath(new URL("../../fixtures/functions/bootcamp/", import.meta.url));

function fixtureFunction(fileName: string, functionName: string) {
  const source = readFileSync(`${bootcampDir}${fileName}`, "utf8");
  const fn = extractFunctions(source).find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`fixture ${fileName} has no eligible function named ${functionName}`);
  return fn;
}

describe("sharedBattery", () => {
  it("puts the degenerate boundary first for sumRange's number pair (D3b)", () => {
    const fn = fixtureFunction("sumRange.js", "sumRange");
    const battery = sharedBattery(fn);
    expect(battery[0]).toEqual([3, 3]);
  });

  it("is deterministic: the same function yields the same battery every time", () => {
    const fn = fixtureFunction("sumRange.js", "sumRange");
    expect(sharedBattery(fn)).toEqual(sharedBattery(fn));
  });

  it("generates strings for countVowels", () => {
    const fn = fixtureFunction("countVowels.js", "countVowels");
    const battery = sharedBattery(fn);
    expect(battery.length).toBeGreaterThan(0);
    for (const input of battery) {
      expect(input).toHaveLength(1);
      expect(typeof input[0]).toBe("string");
    }
  });

  it("generates arrays of objects for findUser", () => {
    const fn = fixtureFunction("findUser.js", "findUser");
    const battery = sharedBattery(fn);
    expect(battery.length).toBeGreaterThan(0);
    for (const [users] of battery) {
      expect(Array.isArray(users)).toBe(true);
      for (const user of users as unknown[]) {
        expect(user).toHaveProperty("id");
      }
    }
  });

  it("orders type-conforming values before type edge cases for a number parameter", () => {
    const fn = fixtureFunction("isAdult.js", "isAdult");
    const battery = sharedBattery(fn);
    const values = battery.map(([v]) => v as number);
    // 0 (an edge case: the falsy/zero boundary) never precedes every ordinary positive value.
    const zeroIndex = values.indexOf(0);
    const firstOrdinary = values.findIndex((v) => v > 1);
    expect(firstOrdinary).toBeLessThan(zeroIndex);
  });

  it("every bootcamp fixture gets a non-empty battery matched to its arity", () => {
    const files = readdirSync(bootcampDir);
    for (const file of files) {
      const source = readFileSync(`${bootcampDir}${file}`, "utf8");
      for (const fn of extractFunctions(source)) {
        const battery = sharedBattery(fn);
        expect(battery.length).toBeGreaterThan(0);
        for (const input of battery) expect(input).toHaveLength(fn.params.length);
      }
    }
  });
});
