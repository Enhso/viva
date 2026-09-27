import type { RunOutcome } from "./sandbox/types";

/**
 * The canonical, printable form of an outcome (04 §3). A structured shape, not English copy —
 * everything but "value.text" (the JS value's own literal spelling, not app copy) is a fixed
 * word for the UI to look up in the string table, per CLAUDE.md/09-disclosure: the engine names
 * what happened, the string table says how to phrase it.
 */
export type CanonicalRendering =
  | { kind: "value"; text: string }
  | { kind: "function" }
  | { kind: "error"; errorName: string }
  | { kind: "timeout" };

export function renderOutput(outcome: RunOutcome): CanonicalRendering {
  switch (outcome.kind) {
    case "timeout":
      return { kind: "timeout" };
    case "threw":
      return { kind: "error", errorName: outcome.errorName };
    case "returnedFunction":
      return { kind: "function" };
    case "returned":
      return { kind: "value", text: canonicalText(outcome.value) };
  }
}

/**
 * The value's own literal spelling: numbers (including `NaN`, `Infinity`, `-0`), quoted strings,
 * booleans, `null`, `undefined`, arrays, and plain objects in JS's own key enumeration order.
 * Deliberately not `JSON.stringify`, which turns `NaN`/`Infinity`/`undefined` into `null` (or
 * drops them) and can't tell `0` from `-0`.
 */
export function canonicalText(value: unknown): string {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (Object.is(value, -0)) return "-0";
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return FUNCTION_TEXT;
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(", ")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record).map((key) => `${JSON.stringify(key)}: ${canonicalText(record[key])}`);
    return `{${entries.join(", ")}}`;
  }
  return String(value);
}

const FUNCTION_TEXT = "a function";

/**
 * Output equality (04 §3): reflexive and symmetric by construction, ignores plain-object key
 * order, and is the single equality the distinguishing check (09) and grading (10) both use — a
 * prediction matching the original's output can never be graded right on a distinguishing input,
 * because that input is, by definition, one where original and mutant disagree under this rule.
 */
export function sameOutput(a: RunOutcome, b: RunOutcome): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "timeout":
    case "returnedFunction":
      return true;
    case "threw":
      return a.errorName === (b as typeof a).errorName;
    case "returned":
      return sameValue(a.value, (b as typeof a).value);
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]));
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** A call as the student would write it, e.g. "sumRange(3, 3)". */
export function renderCall(functionName: string, input: unknown[]): string {
  return `${functionName}(${input.map(canonicalText).join(", ")})`;
}
