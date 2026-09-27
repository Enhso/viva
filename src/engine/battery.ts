import type { EligibleFunction, Input } from "./types";

// Input generation, kept apart from the rule engine's candidate generation (04 §1).
// Ticket 01 treats every parameter as numeric; ticket 09 infers shapes.
const NUMERIC_VALUES = [3, 0, 1, -1, 5, 10];

/**
 * The shared battery: generated once per function and tried against every mutant.
 * Degenerate tuples (every argument equal, e.g. an empty range) come first, so the
 * first beat probes a boundary (Hatim, D3b, 2026-09-27).
 */
export function sharedBattery(fn: EligibleFunction): Input[] {
  const arity = fn.params.length;
  const degenerate = NUMERIC_VALUES.map((value) => Array<number>(arity).fill(value));
  const rest = tuples(arity).filter((tuple) => tuple.some((value) => value !== tuple[0]));
  return [...degenerate, ...rest];
}

function tuples(arity: number): number[][] {
  if (arity === 0) return [[]];
  return tuples(arity - 1).flatMap((prefix) => NUMERIC_VALUES.map((value) => [...prefix, value]));
}
