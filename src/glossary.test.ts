import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// CONTEXT.md's `_Avoid_` terms that never have a legitimate use in src/ (the common words on
// that list, like "test" or "question", do, so they stay a review judgement). CLAUDE.md:
// "information-theoretic" appears only for verified mutants; add a file to ALLOWED when a
// verified-mutant surface legitimately needs it.
const BANNED = [/information-theoretic/i, /\bIT score\b/, /loadedness/i, /\binteresting mutant/i, /\bgood mutant/i, /\bdead mutant/i, /\bcandidate function/i];
const ALLOWED = new Set<string>([]);

const srcDir = dirname(fileURLToPath(import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("glossary (CONTEXT.md _Avoid_ terms that never belong in src/)", () => {
  it("no source file uses a banned synonym", () => {
    const hits = listFiles(srcDir)
      .filter((file) => !ALLOWED.has(relative(srcDir, file)))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, index) => (BANNED.some((term) => term.test(line)) ? [`${relative(srcDir, file)}:${index + 1}: ${line.trim()}`] : [])),
      );
    expect(hits).toEqual([]);
  });
});
