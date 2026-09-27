import { parse, type Comment } from "acorn";
import type { EligibleFunction } from "./types";

/** Top-level function declarations in one file. The scope check arrives with ticket 02. */
export function extractFunctions(fileSource: string): EligibleFunction[] {
  const comments: Comment[] = [];
  const program = parse(fileSource, { ecmaVersion: "latest", sourceType: "module", onComment: comments });
  const functions: EligibleFunction[] = [];
  for (const node of program.body) {
    if (node.type !== "FunctionDeclaration") continue;
    const paramsText = node.params.length
      ? fileSource.slice(node.params[0].start, node.params[node.params.length - 1].end)
      : "";
    functions.push({
      name: node.id.name,
      params: node.params.map((param) => fileSource.slice(param.start, param.end)),
      signature: `${node.id.name}(${paramsText})`,
      source: fileSource.slice(node.start, node.end),
      docstring: docstringBefore(node.start, comments, fileSource),
    });
  }
  return functions;
}

// A `/** … */` block separated from the declaration by whitespace only. Never a stand-in (01 §6).
function docstringBefore(position: number, comments: Comment[], fileSource: string): string | null {
  const jsdoc = comments.find(
    (comment) =>
      comment.type === "Block" &&
      comment.value.startsWith("*") &&
      fileSource.slice(comment.end, position).trim() === "",
  );
  return jsdoc ? fileSource.slice(jsdoc.start, jsdoc.end) : null;
}
