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
});
