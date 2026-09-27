import { parse, tokenizer } from "acorn";
import type { CandidateMutant, EligibleFunction, MutationRule } from "./types";

// The rule engine: fixed rewrites of one syntax-tree node each. It never invents a rewrite.
const RELATIONAL_FLIPS: Record<string, string> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };

interface SyntaxNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

export function generateCandidateMutants(fn: EligibleFunction): CandidateMutant[] {
  const tokens = [...tokenizer(fn.source, { ecmaVersion: "latest" })];
  const candidates: CandidateMutant[] = [];

  visit(parse(fn.source, { ecmaVersion: "latest", sourceType: "module" }) as unknown as SyntaxNode, (node) => {
    if (node.type !== "BinaryExpression") return;
    const operator = node.operator as string;
    const flipped = RELATIONAL_FLIPS[operator];
    if (!flipped) return;
    const left = node.left as SyntaxNode;
    const right = node.right as SyntaxNode;
    const token = tokens.find((t) => t.start >= left.end && t.end <= right.start && fn.source.slice(t.start, t.end) === operator);
    if (token) candidates.push(rewrite(fn, "relational-flip", token.start, token.end, flipped));
  });

  return candidates.sort((a, b) => a.location.start - b.location.start);
}

function rewrite(fn: EligibleFunction, rule: MutationRule, start: number, end: number, replacement: string): CandidateMutant {
  const source = fn.source.slice(0, start) + replacement + fn.source.slice(end);
  const line = fn.source.slice(0, start).split("\n").length;
  return {
    id: `${fn.name}:${rule}:${start}`,
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
