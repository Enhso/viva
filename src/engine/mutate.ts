import { parse, tokenizer, type Token } from "acorn";
import type { CandidateMutant, EligibleFunction, MutationRule } from "./types";

// The rule engine: fixed rewrites of one syntax-tree node each. It never invents a rewrite
// (03 §2). Over-generates on purpose (03 §3): no per-function cap.

const RELATIONAL_FLIPS: Record<string, string> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };
const EQUALITY_SWAPS: Record<string, string> = { "===": "==", "==": "===", "!==": "!=", "!=": "!==" };
const LOGICAL_FLIPS: Record<string, string> = { "&&": "||", "||": "&&" };
const ARITHMETIC_SWAPS: Record<string, string> = { "+": "-", "-": "+", "*": "/", "/": "*" };
const UPDATE_FLIPS: Record<string, string> = { "++": "--", "--": "++" };

// Fallback mode picks the first candidate (in this order) whose output changes (fallback.ts).
// Relational flips lead so the `sumRange` tracer-bullet demo keeps naming a relational flip
// (Ruling, ticket 03): an off-by-one literal mutation of `total = 0` also changes that demo's
// output and sits earlier in source order, so ordering by source position alone isn't enough.
const RULE_PRIORITY: MutationRule[] = [
  "relational-flip",
  "equality-swap",
  "logical-flip",
  "arithmetic-swap",
  "boolean-literal-flip",
  "negation-removal",
  "negation-insertion",
  "off-by-one-literal",
  "return-deletion",
  "loop-bound-change",
];

interface SyntaxNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

interface Edit {
  rule: MutationRule;
  start: number;
  end: number;
  replacement: string;
}

export function generateCandidateMutants(fn: EligibleFunction): CandidateMutant[] {
  const source = fn.source;
  const tokens = [...tokenizer(source, { ecmaVersion: "latest" })];
  const edits: Edit[] = [];

  visit(parse(source, { ecmaVersion: "latest", sourceType: "module" }) as unknown as SyntaxNode, (node) => {
    edits.push(...editsForNode(node, source, tokens));
  });

  const priority = (rule: MutationRule) => RULE_PRIORITY.indexOf(rule);
  const ordered = [...edits].sort((a, b) => priority(a.rule) - priority(b.rule) || a.start - b.start);
  return ordered.map((edit) => rewrite(fn, edit));
}

function editsForNode(node: SyntaxNode, source: string, tokens: Token[]): Edit[] {
  switch (node.type) {
    case "BinaryExpression":
      return binaryExpressionEdits(node, source, tokens);
    case "LogicalExpression":
      return operatorEdits(node, source, tokens, LOGICAL_FLIPS, "logical-flip");
    case "UnaryExpression":
      return unaryExpressionEdits(node);
    case "UpdateExpression":
      return updateExpressionEdits(node, source);
    case "Literal":
      return literalEdits(node);
    case "ReturnStatement":
      return returnStatementEdits(node);
    case "IfStatement":
    case "ConditionalExpression":
    case "WhileStatement":
    case "DoWhileStatement":
      return negationInsertionEdits(node, source);
    default:
      return [];
  }
}

// Relational flips (`<` <-> `<=`, `>` <-> `>=`), equality swaps (`===` <-> `==`, `!==` <-> `!=`),
// and arithmetic swaps (`+` <-> `-`, `*` <-> `/`) all key off a `BinaryExpression`'s operator.
function binaryExpressionEdits(node: SyntaxNode, source: string, tokens: Token[]): Edit[] {
  const operator = node.operator as string;
  if (RELATIONAL_FLIPS[operator]) return operatorEdits(node, source, tokens, RELATIONAL_FLIPS, "relational-flip");
  if (EQUALITY_SWAPS[operator]) return operatorEdits(node, source, tokens, EQUALITY_SWAPS, "equality-swap");
  if (ARITHMETIC_SWAPS[operator]) return operatorEdits(node, source, tokens, ARITHMETIC_SWAPS, "arithmetic-swap");
  return [];
}

function operatorEdits(
  node: SyntaxNode,
  source: string,
  tokens: Token[],
  flips: Record<string, string>,
  rule: MutationRule,
): Edit[] {
  const operator = node.operator as string;
  const flipped = flips[operator];
  if (!flipped) return [];
  const left = node.left as SyntaxNode;
  const right = node.right as SyntaxNode;
  const token = tokens.find((t) => t.start >= left.end && t.end <= right.start && source.slice(t.start, t.end) === operator);
  return token ? [{ rule, start: token.start, end: token.end, replacement: flipped }] : [];
}

// `!x` -> `x` (negation-removal). Only the prefix boolean-negation operator, never `-`/`+`/`typeof`/etc.
function unaryExpressionEdits(node: SyntaxNode): Edit[] {
  if (node.operator !== "!" || node.prefix !== true) return [];
  const argument = node.argument as SyntaxNode;
  return [{ rule: "negation-removal", start: node.start, end: argument.start, replacement: "" }];
}

// `i++` <-> `i--`, `++i` <-> `--i` (loop-bound-change): most commonly a for-loop's update
// clause, but the rule engine applies mechanically to every `UpdateExpression` it finds.
function updateExpressionEdits(node: SyntaxNode, source: string): Edit[] {
  const flipped = UPDATE_FLIPS[node.operator as string];
  if (!flipped) return [];
  const argument = node.argument as SyntaxNode;
  const argumentText = source.slice(argument.start, argument.end);
  const replacement = node.prefix ? `${flipped}${argumentText}` : `${argumentText}${flipped}`;
  return [{ rule: "loop-bound-change", start: node.start, end: node.end, replacement }];
}

// `true` <-> `false` (boolean-literal-flip); numeric literals ± 1 (off-by-one-literal). The
// latter also covers off-by-one on an index expression's literal bound (e.g. `arr[0]`, `slice(0, n)`),
// since those bounds are themselves numeric literals (Ruling, ticket 03).
function literalEdits(node: SyntaxNode): Edit[] {
  const value = node.value;
  if (typeof value === "boolean") {
    return [{ rule: "boolean-literal-flip", start: node.start, end: node.end, replacement: value ? "false" : "true" }];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [
      { rule: "off-by-one-literal", start: node.start, end: node.end, replacement: String(value + 1) },
      { rule: "off-by-one-literal", start: node.start, end: node.end, replacement: String(value - 1) },
    ];
  }
  return [];
}

// `return x;` -> `return;` (return-deletion). Only when there's an argument to delete.
function returnStatementEdits(node: SyntaxNode): Edit[] {
  if (node.argument == null) return [];
  return [{ rule: "return-deletion", start: node.start, end: node.end, replacement: "return;" }];
}

// `if (x)` -> `if (!(x))`, and likewise for `while`, `do...while`, and `a ? b : c`'s test
// (negation-insertion), on every test-bearing statement/expression.
function negationInsertionEdits(node: SyntaxNode, source: string): Edit[] {
  const test = node.test as SyntaxNode | undefined;
  if (!test) return [];
  const testText = source.slice(test.start, test.end);
  return [{ rule: "negation-insertion", start: test.start, end: test.end, replacement: `!(${testText})` }];
}

function rewrite(fn: EligibleFunction, edit: Edit): CandidateMutant {
  const { rule, start, end, replacement } = edit;
  const source = fn.source.slice(0, start) + replacement + fn.source.slice(end);
  const line = fn.source.slice(0, start).split("\n").length;
  return {
    id: `${fn.name}:${rule}:${start}:${end}:${replacement}`,
    functionName: fn.name,
    rule,
    rewrite: { from: fn.source.slice(start, end), to: replacement },
    location: { start, end },
    source,
    diff: { line, before: fn.source.split("\n")[line - 1], after: source.split("\n")[line - 1] },
  };
}

function visit(node: SyntaxNode, callback: (node: SyntaxNode) => void): void {
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "type") continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child !== null && typeof child === "object" && typeof (child as SyntaxNode).type === "string") {
        visit(child as SyntaxNode, callback);
      }
    }
  }
}
