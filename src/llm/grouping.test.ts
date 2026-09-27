import { describe, expect, it, vi } from "vitest";
import { runLabelGrouping } from "./grouping";
import { pairKey } from "./label-grouping";

describe("runLabelGrouping", () => {
  it("uses Jev's verdicts when Jev succeeds, and never calls the embedding fallback", async () => {
    const jev = vi.fn().mockResolvedValue(new Map([[pairKey({ a: "boundary", b: "off-by-one" }), true]]));
    const embedding = vi.fn();
    const result = await runLabelGrouping(["off-by-one", "boundary"], {}, jev, embedding);
    expect(result.mechanism).toBe("jev");
    expect(result.groupKeyByLabel["off-by-one"]).toBe(result.groupKeyByLabel.boundary);
    expect(result.groupKeyByLabel.boundary).toBe("boundary"); // lexicographically smallest
    expect(embedding).not.toHaveBeenCalled();
  });

  it("falls back to embedding similarity when Jev fails, naming the provider", async () => {
    const jev = vi.fn().mockRejectedValue(new Error("Jev api.typesafe.ai 401: bad key"));
    const embedding = vi.fn().mockResolvedValue(new Map([[pairKey({ a: "boundary", b: "off-by-one" }), true]]));
    const result = await runLabelGrouping(["off-by-one", "boundary"], {}, jev, embedding);
    expect(result.mechanism).toBe("embedding");
    expect(result.provider).toBe("gemini");
    expect(result.groupKeyByLabel["off-by-one"]).toBe(result.groupKeyByLabel.boundary);
    expect(result.groupKeyByLabel.boundary).toBe("boundary");
    expect(result.failures).toEqual(["Jev: Jev api.typesafe.ai 401: bad key"]);
  });

  it("falls back to exact label text when both Jev and embedding fail, and the result still has a group for every label", async () => {
    const jev = vi.fn().mockRejectedValue(new Error("Jev api.typesafe.ai 401: bad key"));
    const embedding = vi.fn().mockRejectedValue(new Error("Gemini embedding generativelanguage.googleapis.com 429: rate limited"));
    const result = await runLabelGrouping(["off-by-one", "boundary"], {}, jev, embedding);
    expect(result.mechanism).toBe("exact-text");
    expect(result.groupKeyByLabel).toEqual({ "off-by-one": "off-by-one", boundary: "boundary" });
    expect(result.failures).toEqual([
      "Jev: Jev api.typesafe.ai 401: bad key",
      "Gemini embedding: Gemini embedding generativelanguage.googleapis.com 429: rate limited",
    ]);
  });

  it("skips both network mechanisms for zero or one label -- nothing to compare", async () => {
    const jev = vi.fn();
    const embedding = vi.fn();
    const result = await runLabelGrouping(["off-by-one"], {}, jev, embedding);
    expect(result.mechanism).toBe("exact-text");
    expect(jev).not.toHaveBeenCalled();
    expect(embedding).not.toHaveBeenCalled();
  });
});
