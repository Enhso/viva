import { describe, expect, it } from "vitest";
import { createNodeRunner } from "./node-runner";

describe("Node sandbox runner", () => {
  const runner = createNodeRunner({ timeoutMs: 100 });

  it("returns what the function returns", async () => {
    const outcome = await runner.run({ source: "function add(a, b) { return a + b; }", functionName: "add", input: [2, 3] });

    expect(outcome).toEqual({ kind: "returned", value: 5 });
  });

  it("reports a thrown error by its type", async () => {
    const outcome = await runner.run({ source: "function first(xs) { return xs[0]; }", functionName: "first", input: [null] });

    expect(outcome).toMatchObject({ kind: "threw", errorName: "TypeError" });
  });

  it("stops a function that never returns", async () => {
    const outcome = await runner.run({ source: "function spin() { while (true) {} }", functionName: "spin", input: [] });

    expect(outcome).toEqual({ kind: "timeout" });
  });

  it("gives each run its own copy of the input, so in-place mutation cannot leak out", async () => {
    const source = "function topScores(xs) { return xs.sort((a, b) => b - a); }";
    const arg = [3, 1, 2];
    const input = [arg];

    const outcome = await runner.run({ source, functionName: "topScores", input });

    expect(outcome).toEqual({ kind: "returned", value: [3, 2, 1] });
    expect(arg).toEqual([3, 1, 2]); // the caller's array is untouched

    // Running again on the same (still-unsorted) array gives the same answer, not a no-op sort.
    const again = await runner.run({ source, functionName: "topScores", input });
    expect(again).toEqual({ kind: "returned", value: [3, 2, 1] });
  });

  it("has no network access", async () => {
    const probe = (expr: string) => runner.run({ source: `function probe() { return ${expr}; }`, functionName: "probe", input: [] });

    expect(await probe("typeof fetch")).toEqual({ kind: "returned", value: "undefined" });
    expect(await probe("typeof XMLHttpRequest")).toEqual({ kind: "returned", value: "undefined" });
    expect(await probe("typeof WebSocket")).toEqual({ kind: "returned", value: "undefined" });
  });

  it("calling fetch throws instead of reaching the network", async () => {
    const outcome = await runner.run({ source: "function callFetch() { return fetch('https://example.com'); }", functionName: "callFetch", input: [] });

    expect(outcome).toMatchObject({ kind: "threw" });
  });

  it("dynamic import is unavailable", async () => {
    const outcome = await runner.run({
      source: "function callImport() { return import('node:fs'); }",
      functionName: "callImport",
      input: [],
    });

    expect(outcome).toMatchObject({ kind: "threw" });
  });

  it("gives identical output across repeated runs of code that uses Math.random", async () => {
    const source = "function roll() { return Math.random(); }";
    const first = await runner.run({ source, functionName: "roll", input: [] });
    const second = await runner.run({ source, functionName: "roll", input: [] });

    expect(first).toEqual(second);
    expect(first).toMatchObject({ kind: "returned" });
  });

  it("gives identical output across repeated runs of code that uses Date.now", async () => {
    const source = "function stamp() { return Date.now(); }";
    const first = await runner.run({ source, functionName: "stamp", input: [] });
    const second = await runner.run({ source, functionName: "stamp", input: [] });

    expect(first).toEqual(second);
  });

  it("calls a directly-returned function three times and reports the results as an array (17)", async () => {
    const source = "function makeCounter(start) { let count = start; return function () { count++; return count; }; }";

    const outcome = await runner.run({ source, functionName: "makeCounter", input: [5] });

    expect(outcome).toEqual({ kind: "returned", value: [6, 7, 8], calledReturnedFunction: true });
  });

  it("a returned function that throws when called reports the thrown error, not an array (17)", async () => {
    const source = "function makeThrower() { return function () { throw new TypeError('nope'); }; }";

    const outcome = await runner.run({ source, functionName: "makeThrower", input: [] });

    expect(outcome).toEqual({ kind: "threw", errorName: "TypeError" });
  });

  it("a returned function that never returns when called times out, not an array (17)", async () => {
    const source = "function makeSpinner() { return function () { while (true) {} }; }";

    const outcome = await runner.run({ source, functionName: "makeSpinner", input: [] });

    expect(outcome).toEqual({ kind: "timeout" });
  });

  it("a function nested inside another returned value is still not called, and still fails to clone (17)", async () => {
    const source = "function makePair() { return [function () {}, function () {}]; }";

    const outcome = await runner.run({ source, functionName: "makePair", input: [] });

    expect(outcome).toMatchObject({ kind: "threw" });
  });
});
