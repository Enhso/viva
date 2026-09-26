import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = dirname(fileURLToPath(import.meta.url));
const llmDir = resolve(srcDir, "llm");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

function importsFromLlm(file: string): boolean {
  const source = readFileSync(file, "utf8");
  const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
  return specifiers.some((specifier) => {
    if (!specifier.startsWith(".")) return false;
    const resolved = resolve(dirname(file), specifier);
    return resolved === llmDir || resolved.startsWith(llmDir + "/");
  });
}

describe("determinism boundary (CLAUDE.md: engine/grading must stay model-free)", () => {
  for (const boundaryDir of ["engine", "grading"]) {
    it(`no file under src/${boundaryDir} imports from src/llm`, () => {
      const offenders = listFiles(join(srcDir, boundaryDir)).filter(importsFromLlm);
      expect(offenders).toEqual([]);
    });
  }
});
