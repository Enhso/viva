import { parse } from "acorn";
import type { RunOutcome } from "../engine";

/**
 * The two RunOutcome kinds a typed prediction can name (10 §description): a student predicts a
 * value or an error, never a timeout or a returned function. `Extract` keeps this a real subtype
 * of RunOutcome, so `sameOutput`/`renderOutput` (04 §3) take a reading directly.
 */
export type PredictionReading = Extract<RunOutcome, { kind: "returned" } | { kind: "threw" }>;

// Ruling (10): the accepted error syntax is the keyword "throws" (case-insensitive) followed by
// the error's name, e.g. "throws TypeError" — shown to the student as the input's hint.
const THROWS_PATTERN = /^throws\s+(\S+)$/i;

// Only these node shapes are read as literals; anything else (calls, identifiers other than the
// three below, template strings, ...) falls through to the bare-string reading.
const NUMBER_IDENTIFIERS = new Map<string, number>([
  ["NaN", NaN],
  ["Infinity", Infinity],
]);

class NotALiteral extends Error {}

/**
 * Reads a student's typed answer as a JS literal, never by evaluating it (CLAUDE.md's
 * determinism boundary): numbers, quoted strings, booleans, null, undefined, arrays, plain
 * objects, and the "throws TypeError" error syntax. Anything that doesn't parse as one of those
 * is read as a bare string, so `Free` for `formatPrice(0)` is right without quotes.
 */
export function readPrediction(text: string): PredictionReading {
  const trimmed = text.trim();

  const thrown = THROWS_PATTERN.exec(trimmed);
  if (thrown) return { kind: "threw", errorName: thrown[1] };

  try {
    // Wrapped in parens so a leading "{" parses as an object expression, not a block statement.
    const program = parse(`(${trimmed})`, { ecmaVersion: 2022 });
    const [statement, ...rest] = program.body;
    if (rest.length > 0 || statement?.type !== "ExpressionStatement") throw new NotALiteral();
    return { kind: "returned", value: literalFromNode(statement.expression) };
  } catch {
    return { kind: "returned", value: trimmed };
  }
}

// acorn's AST nodes aren't typed per-kind in a way worth importing here; this walks only the
// literal-shaped nodes it recognizes and throws NotALiteral for everything else.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function literalFromNode(node: any): unknown {
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "bigint") throw new NotALiteral();
      return node.value;
    case "Identifier":
      if (node.name === "undefined") return undefined;
      if (NUMBER_IDENTIFIERS.has(node.name)) return NUMBER_IDENTIFIERS.get(node.name);
      throw new NotALiteral();
    case "UnaryExpression": {
      if (node.operator !== "-" && node.operator !== "+") throw new NotALiteral();
      const value = literalFromNode(node.argument);
      if (typeof value !== "number") throw new NotALiteral();
      return node.operator === "-" ? -value : value;
    }
    case "ArrayExpression":
      return node.elements.map((element: unknown) => (element === null ? undefined : literalFromNode(element)));
    case "ObjectExpression":
      return Object.fromEntries(
        node.properties.map((property: any) => {
          if (property.type !== "Property" || property.computed) throw new NotALiteral();
          const key: string =
            property.key.type === "Identifier"
              ? property.key.name
              : property.key.type === "Literal"
                ? String(property.key.value)
                : (() => {
                    throw new NotALiteral();
                  })();
          return [key, literalFromNode(property.value)];
        }),
      );
    default:
      throw new NotALiteral();
  }
}
