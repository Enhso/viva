import { describe, expect, it } from "vitest";
import { buildFilterPrompt, parseFilterResponse, runFilterCall } from "./filter";
import { ProviderChainError, type ProviderLink } from "./providers";
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

  // One malformed verdict among dozens shouldn't discard the whole response (a real OpenRouter
  // answer did this on 2026-09-27), but it must never load a mutant: it becomes a rejection that
  // says what was wrong, visible in the lab table and the candidate log.
  function withVerdicts(first: Record<string, unknown>) {
    return JSON.stringify({
      functions: [
        {
          function_id: "sumRange",
          candidates: [
            { candidate_id: "sumRange:relational-flip:40", ...first },
            { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "no" },
          ],
        },
      ],
    });
  }

  it("turns a loaded verdict with no label into a rejection that says so", () => {
    const result = parseFilterResponse(withVerdicts({ verdict: "loaded" }), request);

    expect(result.loaded).toEqual([]);
    expect(result.rejected[0]).toMatchObject({ candidateId: "sumRange:relational-flip:40" });
    expect(result.rejected[0].reason).toMatch(/without a label/);
  });

  it("reads verdicts case- and whitespace-insensitively", () => {
    const result = parseFilterResponse(withVerdicts({ verdict: " Loaded ", label: "boundary" }), request);

    expect(result.loaded.map((c) => c.label)).toEqual(["boundary"]);
  });

  it("turns an unrecognized verdict into a rejection naming it, instead of failing the provider", () => {
    const result = parseFilterResponse(withVerdicts({ verdict: "maybe", label: "boundary" }), request);

    expect(result.loaded).toEqual([]);
    expect(result.rejected[0].reason).toMatch(/unrecognized verdict "maybe"/);
  });
});

describe("runFilterCall (the provider chain, with fake links)", () => {
  const valid = JSON.stringify({
    functions: [
      {
        function_id: "sumRange",
        candidates: [
          { candidate_id: "sumRange:relational-flip:40", verdict: "loaded", label: "off-by-one", reason: "subtle" },
          { candidate_id: "sumRange:relational-flip:80", verdict: "rejected", reason: "obvious" },
        ],
      },
    ],
  });

  function link(provider: string, reply: () => Promise<string>, seenKeys: (string | undefined)[] = []): ProviderLink {
    return {
      provider,
      model: `${provider}-model`,
      envVar: `${provider.toUpperCase()}_KEY`,
      call: (_prompt, apiKey) => {
        seenKeys.push(apiKey);
        return reply();
      },
    };
  }

  it("moves past a provider that throws or answers off-contract, and names the one that served", async () => {
    const chain = [
      link("down", () => Promise.reject(new Error("503"))),
      link("garbled", () => Promise.resolve("not json")),
      link("good", () => Promise.resolve(valid)),
    ];

    const outcome = await runFilterCall(request, samplePrompt, { DOWN_KEY: "k", GARBLED_KEY: "k", GOOD_KEY: "k" }, chain);

    expect(outcome.provider).toBe("good");
    expect(outcome.model).toBe("good-model");
    expect(outcome.result.loaded.map((c) => c.candidateId)).toEqual(["sumRange:relational-flip:40"]);
  });

  it("still calls a provider whose key env var is unset, without a key (a proxy may inject credentials)", async () => {
    const seenKeys: (string | undefined)[] = [];
    const outcome = await runFilterCall(request, samplePrompt, {}, [link("proxied", () => Promise.resolve(valid), seenKeys)]);

    expect(outcome.provider).toBe("proxied");
    expect(seenKeys).toEqual([undefined]);
  });

  it("reports every failure, naming an unset key, once the chain is exhausted", async () => {
    const chain = [link("down", () => Promise.reject(new Error("401 unauthorized"))), link("garbled", () => Promise.resolve("{}"))];

    const failure = await runFilterCall(request, samplePrompt, { GARBLED_KEY: "k" }, chain).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProviderChainError);
    const { failures } = failure as ProviderChainError;
    expect(failures.map((f) => f.provider)).toEqual(["down", "garbled"]);
    expect(failures[0].reason).toContain("DOWN_KEY is not set");
    expect(failures[0].reason).toContain("401 unauthorized");
    expect(failures[1].reason).toMatch(/^invalid response/);
  });
});
