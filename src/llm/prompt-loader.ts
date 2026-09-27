// Loads the filter prompt + its output contract (03 §2, ticket 06). `prompts/filter/vNNN.md`
// files are Hatim's (README.md); this module only reads them, never writes.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Resolved from the working directory, not this module's location: Vercel runs functions with the
// project root as cwd and copies `prompts/filter/**` there (vercel.json `includeFiles`), and a
// bundled function no longer sits at src/llm/. Tests and scripts run from the repo root too.
const filterDir = join(process.cwd(), "prompts", "filter");
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

/**
 * Loads one specific version under `prompts/filter/` (ticket 11: filter-lab needs to run a
 * named version, not just the latest, for `--compare` and pinned runs). Returns null when that
 * version doesn't exist.
 */
export function loadFilterPromptVersion(version: string): FilterPrompt | null {
  const file = join(filterDir, `${version}.md`);
  let promptText: string;
  try {
    promptText = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const contractText = readFileSync(contractPath, "utf8");
  return { version, promptText, contractText };
}

/**
 * Loads a prompt file from anywhere on disk, paired with the fixed output contract (ticket 11:
 * the filter lab is verified end to end against a test prompt kept outside
 * `prompts/filter/`, which is Hatim's — see prompts/filter/README.md).
 */
export function loadFilterPromptFile(path: string): FilterPrompt {
  const promptText = readFileSync(path, "utf8");
  const contractText = readFileSync(contractPath, "utf8");
  const base = path.split(/[/\\]/).pop() ?? path;
  return { version: base.replace(/\.md$/, ""), promptText, contractText };
}
