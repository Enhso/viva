import { Parser, type Comment, type Node } from "acorn";
import jsx from "acorn-jsx";
import { scopeViolation, type ScopeViolation } from "./scope";
import type { EligibleFunction } from "./types";

// JSX is additive grammar (acorn-jsx): plain JS/TS files parse exactly as they would without it.
// Needed so a React component's JSX is a syntax-tree fact the scope check can see, not a parse failure.
const JsxParser = Parser.extend(jsx());

interface FunctionCandidate {
  name: string;
  /** The declaration's own text (function keyword or `const`/`let`), never the leading `export`. */
  sourceNode: Node;
  /** The function node itself (FunctionDeclaration, ArrowFunctionExpression, or FunctionExpression). */
  fnNode: Node & { params: Node[] };
  /** Where the JSDoc lookup starts: the outermost node's start (`export`'s start when present). */
  docPosition: number;
}

/**
 * Top-level function declarations and top-level `const`/`let` arrow/function-expression bindings
 * in one file, including their exported forms (Ruling R1). The scope check drops anything that
 * isn't a plain function — see `./scope`. Nested functions never surface here.
 */
export function extractFunctions(fileSource: string): EligibleFunction[] {
  const { candidates, comments } = extractCandidates(fileSource);
  return candidates
    .filter((candidate) => scopeViolation(candidate.fnNode) === null)
    .map((candidate) => toEligibleFunction(candidate, fileSource, comments));
}

export interface RejectedFunction {
  name: string;
  violation: ScopeViolation;
}

/** Every top-level function candidate in a file, split by the scope check. Used for the corpus listing (02). */
export function scanFunctions(fileSource: string): { eligible: EligibleFunction[]; rejected: RejectedFunction[] } {
  const { candidates, comments } = extractCandidates(fileSource);
  const eligible: EligibleFunction[] = [];
  const rejected: RejectedFunction[] = [];
  for (const candidate of candidates) {
    const violation = scopeViolation(candidate.fnNode);
    if (violation) rejected.push({ name: candidate.name, violation });
    else eligible.push(toEligibleFunction(candidate, fileSource, comments));
  }
  return { eligible, rejected };
}

function toEligibleFunction(candidate: FunctionCandidate, fileSource: string, comments: Comment[]): EligibleFunction {
  const { fnNode, sourceNode, docPosition, name } = candidate;
  const params = fnNode.params;
  const paramsText = params.length ? fileSource.slice(params[0].start, params[params.length - 1].end) : "";
  return {
    name,
    params: params.map((param) => fileSource.slice(param.start, param.end)),
    signature: `${name}(${paramsText})`,
    source: fileSource.slice(sourceNode.start, sourceNode.end),
    docstring: docstringBefore(docPosition, comments, fileSource),
  };
}

function extractCandidates(fileSource: string): { candidates: FunctionCandidate[]; comments: Comment[] } {
  const comments: Comment[] = [];
  const program = JsxParser.parse(fileSource, {
    ecmaVersion: "latest",
    sourceType: "module",
    onComment: comments,
  }) as unknown as { body: Node[] };
  const candidates: FunctionCandidate[] = [];
  for (const node of program.body) {
    candidates.push(...candidatesFromStatement(node));
  }
  return { candidates, comments };
}

// Unwraps `export`/`export default` so the inner declaration is handled once, uniformly.
function candidatesFromStatement(node: Node): FunctionCandidate[] {
  if (node.type === "ExportNamedDeclaration" && (node as unknown as { declaration: Node | null }).declaration) {
    return candidatesFromDeclaration((node as unknown as { declaration: Node }).declaration, node.start);
  }
  if (node.type === "ExportDefaultDeclaration") {
    return candidatesFromDeclaration((node as unknown as { declaration: Node }).declaration, node.start, "default");
  }
  return candidatesFromDeclaration(node, node.start);
}

function candidatesFromDeclaration(node: Node, docPosition: number, fallbackName = ""): FunctionCandidate[] {
  if (node.type === "FunctionDeclaration") {
    const fn = node as unknown as { id: { name: string } | null; params: Node[] };
    return [{ name: fn.id?.name ?? fallbackName, sourceNode: node, fnNode: node as FunctionCandidate["fnNode"], docPosition }];
  }
  if (node.type === "VariableDeclaration") {
    const decl = node as unknown as { declarations: { id: { name: string }; init: Node | null }[] };
    const candidates: FunctionCandidate[] = [];
    for (const declarator of decl.declarations) {
      if (declarator.init && (declarator.init.type === "ArrowFunctionExpression" || declarator.init.type === "FunctionExpression")) {
        candidates.push({
          name: declarator.id.name,
          sourceNode: node,
          fnNode: declarator.init as FunctionCandidate["fnNode"],
          docPosition,
        });
      }
    }
    return candidates;
  }
  return [];
}

// A `/** … */` block separated from the declaration by whitespace only. Never a stand-in (01 §6).
function docstringBefore(position: number, comments: Comment[], fileSource: string): string | null {
  const jsdoc = comments.find(
    (comment) =>
      comment.end <= position &&
      comment.type === "Block" &&
      comment.value.startsWith("*") &&
      fileSource.slice(comment.end, position).trim() === "",
  );
  return jsdoc ? fileSource.slice(jsdoc.start, jsdoc.end) : null;
}
