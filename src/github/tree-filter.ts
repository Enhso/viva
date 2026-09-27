// File selection for a fetched repo tree (ticket 23, 01 §5): which blobs actually get fetched
// and parsed. Only plain `.js` files are eligible — dependency directories, build output, and
// minified files are skipped before a single byte is fetched, not filtered after the fact.
//
// Ruling: the skip list below (directory names plus the `.min.js` suffix) is the exact list —
// no config, no `.gitignore` parsing. Cost if wrong: a repo with an unusual build-output
// directory name shows a few extra "could not be parsed" or noise entries in the rejected list
// rather than silently mis-scoping; nothing breaks, since scanFunctions itself still runs a scope
// check on whatever text it's given.
export interface TreeEntry {
  /** Full path from the repo root, exactly as GitHub's tree API reports it. */
  path: string;
  /** GitHub's tree entry type: "blob" (a file), "tree" (a directory), or "commit" (a submodule). */
  type: string;
  /** The blob's sha, used to fetch its content; absent from a test fixture that only cares about filtering. */
  sha?: string;
}

// Directories whose contents are never the student's own hand-written source: installed
// dependencies, build output, and version-control/editor metadata.
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "bower_components",
  "vendor",
  "dist",
  "build",
  "out",
  "output",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  ".git",
  ".turbo",
  ".cache",
]);

function isUnderSkippedDirectory(path: string): boolean {
  return path.split("/").slice(0, -1).some((segment) => SKIPPED_DIRECTORIES.has(segment));
}

/**
 * Splits a repo tree into the blobs Viva will fetch and parse, and everything it skips (with why,
 * for the same "shown with a reason" treatment `01 §5` requires for scope-check rejections).
 */
export function filterJsFiles(entries: TreeEntry[]): { included: TreeEntry[]; skipped: { entry: TreeEntry; reason: string }[] } {
  const included: TreeEntry[] = [];
  const skipped: { entry: TreeEntry; reason: string }[] = [];
  for (const entry of entries) {
    if (entry.type !== "blob") continue; // directories and submodules carry no source of their own
    if (isUnderSkippedDirectory(entry.path)) {
      skipped.push({ entry, reason: "dependency or build-output directory" });
      continue;
    }
    if (!entry.path.endsWith(".js")) {
      skipped.push({ entry, reason: "not a .js file" });
      continue;
    }
    if (entry.path.endsWith(".min.js")) {
      skipped.push({ entry, reason: "minified file" });
      continue;
    }
    included.push(entry);
  }
  return { included, skipped };
}
