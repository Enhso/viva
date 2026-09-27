import { inferParamShapes, type ParamShape } from "./shapes";
import type { EligibleFunction, Input } from "./types";

// Input generation, kept apart from the rule engine's candidate generation (04 §1). Each
// parameter's shape (shapes.ts) picks its own ordered list of values -- boundary, zero/
// negative/empty, and type edge cases -- and the battery is the cross product of those lists,
// generated once per function and tried against every mutant first (09 §1 step 1).
//
// Within each parameter's list, type-conforming values (ordinary values the function was
// plainly written for) come before type edge cases, so a mutant's first beat asks about an
// input the function was written for (09 checklist). The one exception is deliberate: values
// that are equal across every parameter (a degenerate boundary, e.g. `sumRange(3, 3)`) are
// moved to the very front of the battery even though `3` alone is a conforming value --
// Hatim rejected fast-check's own shrunk `(0, 1)` in favour of exactly this degenerate-first
// ordering (D3b, ticket 09 Comments), so it wins over the general conforming-before-edge rule.

export function sharedBattery(fn: EligibleFunction): Input[] {
  const shapes = inferParamShapes(fn);
  const perParamValues = shapes.map(valuesForShape);
  const tuples = cartesianProduct(perParamValues);
  return [...degenerateFirst(tuples), ...nonDegenerate(tuples)];
}

function degenerateFirst(tuples: unknown[][]): unknown[][] {
  return tuples.filter(isDegenerate);
}

function nonDegenerate(tuples: unknown[][]): unknown[][] {
  return tuples.filter((tuple) => !isDegenerate(tuple));
}

// Every value in the tuple is the same, and there's more than one parameter to make that
// meaningful (a unary function has no "degenerate" shape to speak of).
function isDegenerate(tuple: unknown[]): boolean {
  return tuple.length > 1 && tuple.every((value) => Object.is(value, tuple[0]));
}

function cartesianProduct(lists: unknown[][]): unknown[][] {
  return lists.reduce<unknown[][]>((acc, list) => acc.flatMap((prefix) => list.map((value) => [...prefix, value])), [[]]);
}

// Conforming values first, edge cases after -- per parameter shape.
function valuesForShape(shape: ParamShape): unknown[] {
  switch (shape.kind) {
    case "number":
      return [3, 5, 10, 7, 2, 0, 1, -1, -5];
    case "string":
      return ["Hello World", "test", "abc", "", " ", "12345"];
    case "boolean":
      return [true, false];
    case "array":
      return arrayValuesForElement(shape.element);
    case "object":
      return [objectValue(shape.fields, 1), objectValue(shape.fields, 2), {}];
    case "unknown":
      return [1, "a", true, 0, "", []];
  }
}

function arrayValuesForElement(element: ParamShape): unknown[] {
  switch (element.kind) {
    case "number":
      return [
        [1, 2, 3],
        [4, 5, 6, 7],
        [],
        [0],
        [-1, -2],
      ];
    case "string":
      return [["alpha", "bb", "ccc"], ["x"], [], [""]];
    case "object": {
      const fields = element.fields.length > 0 ? element.fields : ["id"];
      return [[objectValue(fields, 1), objectValue(fields, 2)], [objectValue(fields, 1)], []];
    }
    case "boolean":
      return [[true, false], [], [true]];
    case "unknown":
    default:
      return [[1, 2, 3], ["a", "b"], [], [0]];
  }
}

// Deterministic field values: `id` gets a plain number so equality checks (`user.id == id`)
// behave predictably; any other field name gets a short string.
function objectValue(fields: string[], ordinal: number): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    record[field] = field === "id" ? ordinal : `${field}${ordinal}`;
  }
  return record;
}
