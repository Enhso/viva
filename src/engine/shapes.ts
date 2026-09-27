import type { EligibleFunction } from "./types";

// Parameter shape inference, kept apart from both the rule engine (03) and input generation
// (battery.ts). A shape drives what values the shared battery and the targeted search try for
// that parameter: boundary/edge values only make sense once the kind is known.

export type ParamShape =
  | { kind: "number" }
  | { kind: "string" }
  | { kind: "boolean" }
  | { kind: "array"; element: ParamShape }
  | { kind: "object"; fields: string[] }
  | { kind: "unknown" };

/**
 * One shape per parameter, in order. Inference is JSDoc first, then the parameter's own
 * default value, then how the function body uses that parameter's name -- never the name
 * itself (09 checklist). Ruling: regex over the source text, not a full AST walk, since every
 * signal needed by the bootcamp corpus (indexing, method calls, comparisons, for-of loops) is
 * lexical; a body pattern this narrow can misread an unusual style, which just widens the
 * generated battery toward "unknown" rather than distinguishing wrongly.
 */
export function inferParamShapes(fn: EligibleFunction): ParamShape[] {
  const jsdocTypes = parseJsdocParamTypes(fn.docstring);
  return fn.params.map((paramText) => inferOneShape(paramText, fn.source, jsdocTypes));
}

function inferOneShape(paramText: string, body: string, jsdocTypes: Map<string, string>): ParamShape {
  const name = paramName(paramText);

  const jsdocType = jsdocTypes.get(name);
  if (jsdocType) {
    const fromJsdoc = shapeFromTypeAnnotation(jsdocType);
    if (fromJsdoc) return fromJsdoc;
  }

  const fromDefault = shapeFromDefault(paramText);
  if (fromDefault) return fromDefault;

  return shapeFromBodyUsage(name, body);
}

function paramName(paramText: string): string {
  return paramText.split("=")[0]!.trim();
}

function shapeFromDefault(paramText: string): ParamShape | null {
  const eq = paramText.indexOf("=");
  if (eq === -1) return null;
  const literal = paramText.slice(eq + 1).trim();
  if (/^-?\d+(\.\d+)?$/.test(literal)) return { kind: "number" };
  if (/^["'`]/.test(literal)) return { kind: "string" };
  if (literal === "true" || literal === "false") return { kind: "boolean" };
  if (literal === "[]") return { kind: "array", element: { kind: "unknown" } };
  return null;
}

function shapeFromTypeAnnotation(type: string): ParamShape | null {
  const t = type.trim();
  if (/^number$/i.test(t)) return { kind: "number" };
  if (/^string$/i.test(t)) return { kind: "string" };
  if (/^boolean$/i.test(t)) return { kind: "boolean" };
  if (/^number\[\]$|^Array\.?<number>$/i.test(t)) return { kind: "array", element: { kind: "number" } };
  if (/^string\[\]$|^Array\.?<string>$/i.test(t)) return { kind: "array", element: { kind: "string" } };
  if (/^object\[\]$|^Array\.?<object>$/i.test(t)) return { kind: "array", element: { kind: "object", fields: [] } };
  return null;
}

function shapeFromBodyUsage(name: string, body: string): ParamShape {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // A regex .test(param) or param.<string-only method>(...) call is a strong string signal,
  // whether or not the parameter is also indexed elsewhere.
  const stringMethodOnParam = new RegExp(
    `${escaped}\\.(toLowerCase|toUpperCase|trim|charAt|charCodeAt|split|startsWith|endsWith|repeat|padStart|padEnd)\\(`,
  );
  const regexTestOnParam = new RegExp(`\\.test\\(\\s*${escaped}\\s*\\)`);
  // An indexed element immediately followed by a string-only method: text[i].toLowerCase().
  const stringMethodOnIndexedParam = new RegExp(`${escaped}\\[[^\\]]+\\]\\.(toLowerCase|toUpperCase|charAt|charCodeAt)\\(`);
  if (stringMethodOnParam.test(body) || regexTestOnParam.test(body) || stringMethodOnIndexedParam.test(body)) {
    return { kind: "string" };
  }

  // for (const x of param) { ... x.field ... } -- an array of objects, field(s) read off the
  // loop variable.
  const forOf = new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+(\\w+)\\s+of\\s+${escaped}\\s*\\)`).exec(body);
  if (forOf) {
    const loopVar = forOf[1]!;
    const fieldPattern = new RegExp(`\\b${loopVar}\\.(\\w+)`, "g");
    const fields = [...body.matchAll(fieldPattern)].map((m) => m[1]!);
    if (fields.length > 0) return { kind: "array", element: { kind: "object", fields: [...new Set(fields)] } };
    return { kind: "array", element: { kind: "unknown" } };
  }

  // Array-only methods, or index assignment/lookup, mark the parameter as an array. Element
  // shape falls back to "unknown" unless the element is itself used arithmetically.
  const arrayMethodOnParam = new RegExp(`${escaped}\\.(push|forEach|map|filter|reduce|sort|reverse|slice|indexOf|includes)\\(`);
  const indexedParam = new RegExp(`${escaped}\\[`);
  if (arrayMethodOnParam.test(body) || indexedParam.test(body)) {
    const arithmeticOnIndexedParam = new RegExp(`${escaped}\\[[^\\]]+\\]\\s*[+\\-*/]`);
    const reducerArithmetic = new RegExp(`${escaped}\\.reduce\\(\\s*\\([^)]*\\)\\s*=>\\s*\\w+\\s*[+\\-*/]\\s*\\w+`);
    if (arithmeticOnIndexedParam.test(body) || reducerArithmetic.test(body)) {
      return { kind: "array", element: { kind: "number" } };
    }
    return { kind: "array", element: { kind: "unknown" } };
  }

  // Comparison against a numeric literal, or arithmetic directly on the parameter -- a loop
  // bound (`i <= n`) or a plain numeric computation (`cents / 100`).
  const comparedToNumber = new RegExp(`(<=|>=|<|>)\\s*${escaped}\\b|\\b${escaped}\\s*(<=|>=|<|>)\\s*-?\\d`);
  const arithmeticOnParam = new RegExp(`\\b${escaped}\\s*[+\\-*/%]|[+\\-*/%]\\s*${escaped}\\b`);
  const negatedParam = new RegExp(`!${escaped}\\b`);
  if (comparedToNumber.test(body) || arithmeticOnParam.test(body) || negatedParam.test(body)) {
    return { kind: "number" };
  }

  return { kind: "unknown" };
}

function parseJsdocParamTypes(docstring: string | null): Map<string, string> {
  const types = new Map<string, string>();
  if (!docstring) return types;
  const pattern = /@param\s+\{([^}]+)\}\s+\[?(\w+)/g;
  for (const match of docstring.matchAll(pattern)) {
    types.set(match[2]!, match[1]!);
  }
  return types;
}
