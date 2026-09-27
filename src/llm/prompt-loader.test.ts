import { describe, expect, it } from "vitest";
import { loadLatestFilterPrompt } from "./prompt-loader";

describe("loadLatestFilterPrompt", () => {
  it("loads the highest-numbered version under prompts/filter/ plus the output contract", () => {
    const prompt = loadLatestFilterPrompt();
    expect(prompt).not.toBeNull();
    // v001-v004 exist at time of writing (Hatim's, prompts/filter/README.md); the loader must
    // always pick the numeric max, not the last directory entry.
    expect(prompt!.version).toBe("v004");
    expect(prompt!.contractText).toContain("Respond with one JSON object");
  });
});
