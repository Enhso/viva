import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Ticket 13 added prompts/triage/ without shipping it with the function. Every prompts/<dir>
// the loader reads from process.cwd() must be covered by api/filter.ts's vercel.json includeFiles.
function expandBraces(pattern: string): string[] {
  const match = pattern.match(/\{([^}]+)\}/);
  if (!match) return [pattern];
  return match[1].split(",").flatMap((option) => expandBraces(pattern.replace(match[0], option)));
}

describe("vercel.json ships every prompt directory the filter function reads", () => {
  it("covers each prompts/<dir> named in prompt-loader.ts", () => {
    const root = process.cwd();
    const loader = readFileSync(join(root, "src/llm/prompt-loader.ts"), "utf8");
    const dirs = [...loader.matchAll(/join\(process\.cwd\(\),\s*"prompts",\s*"([^"]+)"\)/g)].map((m) => `prompts/${m[1]}/`);
    const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as { functions: Record<string, { includeFiles?: string }> };
    const prefixes = expandBraces(config.functions["api/filter.ts"]?.includeFiles ?? "").map((glob) => glob.replace(/\*\*.*$/, ""));

    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.filter((dir) => !prefixes.some((prefix) => dir.startsWith(prefix)))).toEqual([]);
  });
});
