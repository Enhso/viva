import { parse } from "acorn";
import type { EligibleFunction } from "./types";

interface SyntaxNode {
  type: string;
  operator?: string;
  [key: string]: unknown;
}

// One decision point each. Cyclomatic-style: base path (1) plus one per branch/loop/short-circuit.
const BRANCH_TYPES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ConditionalExpression",
  "CatchClause",
  "SwitchCase",
]);

/**
 * The complexity score (02 §2): a cheap, model-free heuristic computed from a function's
 * syntax tree alone. It orders functions on the selection screen and nothing more: how
 * informative a mutant is belongs to the mutant, never to a function (CONTEXT.md).
 */
export function complexityScore(source: string): number {
  const program = parse(source, { ecmaVersion: "latest", sourceType: "module" }) as unknown as SyntaxNode;
  let score = 1;
  visit(program, (node) => {
    if (BRANCH_TYPES.has(node.type)) score += 1;
    if (node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||")) score += 1;
  });
  return score;
}

export interface OrderedFunction {
  fn: EligibleFunction;
  score: number;
  /** No call to another known eligible function (02 §2's optional secondary tiebreaker). */
  isLeaf: boolean;
}

/**
 * The eligible-function list in complexity-score order (02 §2, §5): descending score, leaf
 * functions before non-leaf as a secondary tiebreaker, then name ascending — so the order is
 * fully deterministic and never depends on iteration order.
 */
export function orderByComplexity(fns: EligibleFunction[]): OrderedFunction[] {
  const names = new Set(fns.map((fn) => fn.name));
  return fns
    .map((fn) => ({ fn, score: complexityScore(fn.source), isLeaf: isLeafFunction(fn, names) }))
    .sort(
      (a, b) =>
        b.score - a.score || Number(b.isLeaf) - Number(a.isLeaf) || a.fn.name.localeCompare(b.fn.name),
    );
}

function isLeafFunction(fn: EligibleFunction, knownNames: Set<string>): boolean {
  const program = parse(fn.source, { ecmaVersion: "latest", sourceType: "module" }) as unknown as SyntaxNode;
  let leaf = true;
  visit(program, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = node.callee as SyntaxNode;
    if (callee?.type === "Identifier" && callee.name !== fn.name && knownNames.has(callee.name as string)) leaf = false;
  });
  return leaf;
}

// Mirrors mutate.ts's `visit`: a dependency-free walk over every descendant AST node.
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
