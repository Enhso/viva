import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// CLAUDE.md: determinism handles truth. Nothing under src/engine or src/grading may reach
// src/llm at runtime, directly or through another module (report.ts -> ui/strings -> ... once
// showed how an indirect path could slip past a direct-import check). Type-only imports are
// erased at compile time and carry no model code, so they don't count.
const srcDir = dirname(fileURLToPath(import.meta.url));
const llmDir = resolve(srcDir, "llm");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function valueImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const specifiers: string[] = [];
  for (const match of source.matchAll(/(?:^|\n)\s*(import|export)\s+(type\s+)?[^;]*?from\s*["']([^"']+)["']/g)) {
    if (!match[2]) specifiers.push(match[3]);
  }
  for (const match of source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.push(match[1]);
  return specifiers
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => resolveModule(resolve(dirname(file), specifier)))
    .filter((resolved): resolved is string => resolved !== null);
}

function resolveModule(base: string): string | null {
  const stem = base.replace(/\.js$/, "");
  for (const candidate of [stem + ".ts", stem + ".tsx", join(stem, "index.ts"), join(stem, "index.tsx")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** The import chain from `start` to the first file under src/llm, or null if none is reachable. */
function pathToLlm(start: string): string[] | null {
  const seen = new Set([start]);
  const queue: string[][] = [[start]];
  while (queue.length > 0) {
    const chain = queue.shift()!;
    for (const next of valueImports(chain[chain.length - 1])) {
      if (next.startsWith(llmDir + "/")) return [...chain, next];
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...chain, next]);
      }
    }
  }
  return null;
}

describe("determinism boundary (CLAUDE.md: engine/grading must stay model-free)", () => {
  for (const boundaryDir of ["engine", "grading"]) {
    it(`no file under src/${boundaryDir} reaches src/llm through value imports, directly or transitively`, () => {
      const chains = listFiles(join(srcDir, boundaryDir))
        .map(pathToLlm)
        .filter((chain): chain is string[] => chain !== null)
        .map((chain) => chain.map((file) => relative(srcDir, file)).join(" -> "));
      expect(chains).toEqual([]);
    });
  }
});
