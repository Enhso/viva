import { describe, expect, it } from "vitest";
import { readPrediction } from "./read-prediction";

describe("readPrediction", () => {
  it("reads a bare number literal", () => {
    expect(readPrediction("5")).toEqual({ kind: "returned", value: 5 });
  });

  it("reads a quoted string literal, keeping it distinct from the same number", () => {
    expect(readPrediction('"5"')).toEqual({ kind: "returned", value: "5" });
  });

  it("reads single- and double-quoted strings as the same value", () => {
    expect(readPrediction("'a'")).toEqual(readPrediction('"a"'));
  });

  it("reads arrays the same regardless of internal spacing", () => {
    expect(readPrediction("[1,2]")).toEqual(readPrediction("[1, 2]"));
  });

  it("reads booleans, null and undefined", () => {
    expect(readPrediction("true")).toEqual({ kind: "returned", value: true });
    expect(readPrediction("false")).toEqual({ kind: "returned", value: false });
    expect(readPrediction("null")).toEqual({ kind: "returned", value: null });
    expect(readPrediction("undefined")).toEqual({ kind: "returned", value: undefined });
  });

  it("reads negative numbers, NaN and Infinity", () => {
    expect(readPrediction("-5")).toEqual({ kind: "returned", value: -5 });
    expect(readPrediction("NaN")).toEqual({ kind: "returned", value: NaN });
    expect(readPrediction("Infinity")).toEqual({ kind: "returned", value: Infinity });
    expect(readPrediction("-Infinity")).toEqual({ kind: "returned", value: -Infinity });
  });

  it("reads a plain object", () => {
    expect(readPrediction('{"a": 1, "b": "two"}')).toEqual({ kind: "returned", value: { a: 1, b: "two" } });
  });

  it("reads unquoted object keys", () => {
    expect(readPrediction("{a: 1}")).toEqual({ kind: "returned", value: { a: 1 } });
  });

  it("reads text that doesn't parse as a literal as a bare string", () => {
    expect(readPrediction("Free")).toEqual({ kind: "returned", value: "Free" });
  });

  it("trims surrounding whitespace before reading", () => {
    expect(readPrediction("  5  ")).toEqual({ kind: "returned", value: 5 });
  });

  it("reads a call-like expression (not a literal) as a bare string", () => {
    expect(readPrediction("foo()")).toEqual({ kind: "returned", value: "foo()" });
  });

  it("reads the throws-error syntax", () => {
    expect(readPrediction("throws TypeError")).toEqual({ kind: "threw", errorName: "TypeError" });
  });

  it("reads throws case-insensitively", () => {
    expect(readPrediction("Throws RangeError")).toEqual({ kind: "threw", errorName: "RangeError" });
  });
});
