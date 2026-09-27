import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalText, renderCall, renderOutput, sameOutput } from "./outputs";
import type { RunOutcome } from "./sandbox/types";

// A JS value any returned outcome could carry: the checklist's number/string/boolean/null/
// undefined/array/plain-object cases, recursively.
const jsValue = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small" },
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity),
    fc.constant(-0),
    fc.double({ noNaN: true }),
    fc.string(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined),
    fc.array(tie("value"), { maxLength: 4 }),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), tie("value"), { maxKeys: 4 }),
  ),
})).value;

const runOutcome: fc.Arbitrary<RunOutcome> = fc.oneof(
  jsValue.map((value): RunOutcome => ({ kind: "returned", value })),
  fc.constantFrom("TypeError", "RangeError", "Error").map((errorName): RunOutcome => ({ kind: "threw", errorName })),
  fc.constant<RunOutcome>({ kind: "timeout" }),
  fc.constant<RunOutcome>({ kind: "returnedFunction" }),
);

describe("output equality (04's law: reflexive, symmetric, ignores plain-object key order)", () => {
  it("is reflexive", () => {
    fc.assert(fc.property(runOutcome, (outcome) => sameOutput(outcome, outcome)));
  });

  it("is symmetric", () => {
    fc.assert(fc.property(runOutcome, runOutcome, (a, b) => sameOutput(a, b) === sameOutput(b, a)));
  });

  it("ignores plain-object key order", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), jsValue, { maxKeys: 6 }), (record) => {
        const reversed = Object.fromEntries(Object.entries(record).reverse());
        return sameOutput({ kind: "returned", value: record }, { kind: "returned", value: reversed });
      }),
    );
  });

  it("treats two NaN returns as equal, and 0 and -0 as different (the number checklist)", () => {
    expect(sameOutput({ kind: "returned", value: NaN }, { kind: "returned", value: NaN })).toBe(true);
    expect(sameOutput({ kind: "returned", value: 0 }, { kind: "returned", value: -0 })).toBe(false);
  });

  // A timeout never distinguishes (ticket 04 R3): enforced by `distinguishes`, not by equality.
  it("treats two timeouts as the same, and never compares thrown messages (only errorName)", () => {
    expect(sameOutput({ kind: "timeout" }, { kind: "timeout" })).toBe(true);
    expect(sameOutput({ kind: "threw", errorName: "TypeError" }, { kind: "threw", errorName: "TypeError" })).toBe(true);
    expect(sameOutput({ kind: "threw", errorName: "TypeError" }, { kind: "threw", errorName: "RangeError" })).toBe(false);
  });

  it("array element order still matters (only plain-object key order is ignored)", () => {
    expect(sameOutput({ kind: "returned", value: [1, 2] }, { kind: "returned", value: [2, 1] })).toBe(false);
  });
});

describe("canonical rendering", () => {
  it.each([
    [3, "3"],
    [NaN, "NaN"],
    [Infinity, "Infinity"],
    [-Infinity, "-Infinity"],
    [-0, "-0"],
    ["hi", '"hi"'],
    [true, "true"],
    [false, "false"],
    [null, "null"],
    [undefined, "undefined"],
    [[1, "a", null], '[1, "a", null]'],
    [{ b: 2, a: 1 }, '{"b": 2, "a": 1}'], // JS's own key enumeration order, not sorted
  ])("renders %p as %p", (value, text) => {
    expect(canonicalText(value)).toBe(text);
  });

  it("renders a thrown error by type", () => {
    expect(renderOutput({ kind: "threw", errorName: "TypeError" })).toEqual({ kind: "error", errorName: "TypeError" });
  });

  it("renders a timeout and a returned function as fixed, structured kinds (no baked-in copy)", () => {
    expect(renderOutput({ kind: "timeout" })).toEqual({ kind: "timeout" });
    expect(renderOutput({ kind: "returnedFunction" })).toEqual({ kind: "function" });
  });

  it("renders a returned value as its canonical text", () => {
    expect(renderOutput({ kind: "returned", value: 3 })).toEqual({ kind: "value", text: "3" });
  });
});

describe("renderCall", () => {
  it("renders a call as the student would write it", () => {
    expect(renderCall("sumRange", [3, 3])).toBe("sumRange(3, 3)");
  });
});
