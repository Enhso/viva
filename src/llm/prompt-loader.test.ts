import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFilterPromptFile, loadFilterPromptVersion, loadLatestFilterPrompt } from "./prompt-loader";

describe("loadLatestFilterPrompt", () => {
  it("loads the highest-numbered version under prompts/filter/ plus the output contract", () => {
    const prompt = loadLatestFilterPrompt();
    expect(prompt).not.toBeNull();
    // The versions are Hatim's and keep growing (prompts/filter/README.md): expect the numeric
    // max of whatever is on disk, never a pinned version or the last directory entry.
    const numbers = readdirSync(join(process.cwd(), "prompts", "filter"))
      .map((name) => name.match(/^v(\d+)\.md$/)?.[1])
      .filter((digits): digits is string => digits !== undefined)
      .map(Number);
    expect(prompt!.version).toBe(`v${String(Math.max(...numbers)).padStart(3, "0")}`);
    expect(prompt!.contractText).toContain("Respond with one JSON object");
  });
});

describe("loadFilterPromptVersion", () => {
  it("loads the named version, not just the latest", () => {
    const prompt = loadFilterPromptVersion("v001");
    expect(prompt).not.toBeNull();
    expect(prompt!.version).toBe("v001");
    expect(prompt!.contractText).toContain("Respond with one JSON object");
  });

  it("returns null for a version that doesn't exist", () => {
    expect(loadFilterPromptVersion("v999")).toBeNull();
  });
});

describe("loadFilterPromptFile", () => {
  it("loads a prompt from outside prompts/filter/, paired with the fixed contract", () => {
    const dir = mkdtempSync(join(tmpdir(), "filter-lab-test-"));
    const path = join(dir, "candidate-prompt.md");
    writeFileSync(path, "Audit these candidate mutations, test edition.\n");
    try {
      const prompt = loadFilterPromptFile(path);
      expect(prompt.version).toBe("candidate-prompt");
      expect(prompt.promptText).toContain("test edition");
      expect(prompt.contractText).toContain("Respond with one JSON object");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
