import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadLatestFilterPrompt } from "./prompt-loader";

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
