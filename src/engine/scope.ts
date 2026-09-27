import type { Node } from "acorn";

/** What the scope check rejects a function for. A visible reason, never a silent skip (01 §5). */
export type ScopeViolation = "jsx" | "dom" | "network";

const DOM_GLOBALS = new Set(["document", "window", "navigator", "localStorage", "sessionStorage"]);
const NETWORK_GLOBALS = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource"]);

/**
 * Reads the syntax tree of one function's body: a comment or string that merely mentions
 * `fetch` or `document` never triggers a rejection, only an actual reference does.
 */
export function scopeViolation(fnNode: Node): ScopeViolation | null {
  let found: ScopeViolation | null = null;
  walk(fnNode, (node) => {
    if (found) return;
    found = violationAt(node as unknown as WalkNode);
  });
  return found;
}

interface WalkNode {
  type: string;
  object?: WalkNode;
  callee?: WalkNode;
  name?: string;
  [key: string]: unknown;
}

function violationAt(node: WalkNode): ScopeViolation | null {
  if (node.type === "JSXElement" || node.type === "JSXFragment") return "jsx";
  if (node.type === "MemberExpression" && node.object?.type === "Identifier" && DOM_GLOBALS.has(node.object.name ?? "")) {
    return "dom";
  }
  if (node.type === "CallExpression" && node.callee?.type === "Identifier" && NETWORK_GLOBALS.has(node.callee.name ?? "")) {
    return "network";
  }
  if (node.type === "NewExpression" && node.callee?.type === "Identifier" && NETWORK_GLOBALS.has(node.callee.name ?? "")) {
    return "network";
  }
  return null;
}

// Mirrors mutate.ts's `visit`: a dependency-free walk over every descendant AST node.
function walk(node: unknown, callback: (node: object) => void): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, callback);
    return;
  }
  if (typeof (node as { type?: unknown }).type === "string") callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc" || key === "range") continue;
    walk(value, callback);
  }
}
