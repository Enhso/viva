// Loads the filter prompt + its output contract (03 §2, ticket 06). `prompts/filter/vNNN.md`
// files are Hatim's (README.md); this module only reads them, never writes.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
// src/llm -> repo root is two levels up.
const repoRoot = resolve(moduleDir, "..", "..");
const filterDir = join(repoRoot, "prompts", "filter");
const contractPath = join(filterDir, "_output-contract.md");

const VERSION_PATTERN = /^v(\d+)\.md$/;

export interface FilterPrompt {
  /** e.g. "v004". */
  version: string;
  promptText: string;
  contractText: string;
}

/**
 * The app loads the highest-numbered filter prompt version unless one is pinned (ticket 12).
 * Returns null when no `vNNN.md` exists yet — the caller runs fallback mode and says why.
 */
export function loadLatestFilterPrompt(): FilterPrompt | null {
  let entries: string[];
  try {
    entries = readdirSync(filterDir);
  } catch {
    return null;
  }

  const versions = entries
    .map((name) => name.match(VERSION_PATTERN))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ file: match[0], number: Number.parseInt(match[1], 10) }))
    .sort((a, b) => b.number - a.number);

  const latest = versions[0];
  if (!latest) return null;

  const promptText = readFileSync(join(filterDir, latest.file), "utf8");
  const contractText = readFileSync(contractPath, "utf8");
  return { version: latest.file.replace(/\.md$/, ""), promptText, contractText };
}
