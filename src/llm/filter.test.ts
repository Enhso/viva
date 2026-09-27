import { describe, expect, it } from "vitest";
import { buildFilterPrompt, parseFilterResponse } from "./filter";
import type { FilterRequest } from "./types";

// Test prompts live outside prompts/filter/, which is Hatim's (prompts/filter/README.md).
const samplePrompt = { promptText: "Audit these candidate mutations.\n", contractText: "Respond with JSON only." };

const request: FilterRequest = {
  functions: [
    {
      functionId: "sumRange",
      name: "sumRange",
      source: "function sumRange(start, end) { /* ... */ }",
      docstring: null,
      candidates: [
        { candidateId: "sumRange:relational-flip:40", rule: "relational-flip", rewrite: { from: "<", to: "<=" }, diff: { line: 3, before: "a", after: "b" } },
        { candidateId: "sumRange:relational-flip:80", rule: "relational-flip", rewrite: { from: ">", to: ">=" }, diff: { line: 5, before: "c", after: "d" } },
      ],
    },
  ],
};

describe("buildFilterPrompt", () => {
  it("concatenates the prompt text, the ids to account for, then the contract", () => {
    const prompt = buildFilterPrompt(samplePrompt, request);
    expect(prompt).toContain("Audit these candidate mutations.");
    expect(prompt).toContain("sumRange:relational-flip:40");
    expect(prompt).toContain("sumRange:relational-flip:80");
    expect(prompt.indexOf("Audit")).toBeLessThan(prompt.indexOf("sumRange:relational-flip:40"));
    expect(prompt.indexOf("sumRange:relational-flip:40")).toBeLessThan(prompt.indexOf("Respond with JSON only."));
  });
});

describe("parseFilterResponse (offline, against recorded response shapes)", () => {
  it("accepts a well-formed response covering every function and candidate id exactly once", () => {
    const recorded = JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [
            { candidate_id: "sumRange:relational-flip:40", verdict: "loaded", label: "off-by-one", reason: "subtle", checklist: { is_subtle: true } },
            { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "trivially obvious" },
          ],
        },
      ],
    });

    const result = parseFilterResponse(recorded, request);

    expect(result.loaded).toEqual([
      { functionId: "sumRange", candidateId: "sumRange:relational-flip:40", label: "off-by-one", checklist: { is_subtle: true } },
    ]);
    expect(result.rejected).toEqual([
      { functionId: "sumRange", candidateId: "sumRange:relational-flip:80", reason: "trivially obvious", checklist: {} },
    ]);
  });

  it("tolerates a response wrapped in markdown fences", () => {
    const recorded = `\`\`\`json\n${JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [
            { candidate_id: "sumRange:relational-flip:40", verdict: "rejected", reason: "no" },
            { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "no" },
          ],
        },
      ],
    })}\n\`\`\``;

    expect(() => parseFilterResponse(recorded, request)).not.toThrow();
  });

  it("rejects a response that fails to parse as JSON", () => {
    expect(() => parseFilterResponse("not json at all", request)).toThrow(/not valid JSON/);
  });

  it("rejects a response missing a candidate id it was given", () => {
    const recorded = JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [{ candidate_id: "sumRange:relational-flip:40", verdict: "loaded", label: "off-by-one" }],
        },
      ],
    });

    expect(() => parseFilterResponse(recorded, request)).toThrow(/missing from the response/);
  });

  it("rejects a response that repeats a candidate id", () => {
    const recorded = JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [
            { candidate_id: "sumRange:relational-flip:40", verdict: "loaded", label: "off-by-one" },
            { candidate_id: "sumRange:relational-flip:40", verdict: "rejected", reason: "duplicate" },
            { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "no" },
          ],
        },
      ],
    });

    expect(() => parseFilterResponse(recorded, request)).toThrow(/appears more than once/);
  });

  it("rejects a response missing a whole function id", () => {
    expect(() => parseFilterResponse(JSON.stringify({ functions: [] }), request)).toThrow(/missing from the response/);
  });

  it("rejects a loaded verdict with no label", () => {
    const recorded = JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [
            { candidate_id: "sumRange:relational-flip:40", verdict: "loaded" },
            { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "no" },
          ],
        },
      ],
    });

    expect(() => parseFilterResponse(recorded, request)).toThrow(/missing a label/);
  });
});
