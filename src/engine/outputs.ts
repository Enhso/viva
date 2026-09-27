import type { RunOutcome } from "./sandbox/types";

/**
 * The printable form of an outcome, and the basis of output equality. Minimal for ticket 01;
 * ticket 04 defines the canonical rendering and the single equality rule.
 */
export function renderOutput(outcome: RunOutcome): string {
  switch (outcome.kind) {
    case "timeout":
      return "times out";
    case "threw":
      return `throws ${outcome.errorName}`;
    case "returned":
      return renderValue(outcome.value);
  }
}

function renderValue(value: unknown): string {
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function sameOutput(a: RunOutcome, b: RunOutcome): boolean {
  return renderOutput(a) === renderOutput(b);
}

/** A call as the student would write it, e.g. "sumRange(3, 3)". */
export function renderCall(functionName: string, input: unknown[]): string {
  return `${functionName}(${input.map(renderValue).join(", ")})`;
}
