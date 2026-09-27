import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFunctions, generateCandidateMutants } from "../engine/index";
import { ProviderChainError, type ProviderLink } from "./providers";
import {
  buildTriagePrompt,
  estimateFunctionTokens,
  estimateTokens,
  functionsOverThreshold,
  parseTriageResponse,
  runFilterCallWithTriage,
  TRIAGE_TOKEN_THRESHOLD,
} from "./triage";
import type { FilterCandidateInput, FilterFunctionInput, FilterRequest } from "./types";

// Test prompts live outside prompts/triage/ and prompts/filter/, which are Hatim's.
const filterPrompt = { promptText: "Judge these candidate mutations.\n", contractText: "Respond with the filter contract." };
const triagePrompt = { promptText: "Shrink this one function's candidate list.\n", contractText: "Respond with the triage contract." };

function candidate(id: string): FilterCandidateInput {
  return { candidateId: id, rule: "relational-flip", rewrite: { from: "<", to: "<=" }, diff: { line: 1, before: "a", after: "b" } };
}

function fn(functionId: string, candidateIds: string[]): FilterFunctionInput {
  return { functionId, name: functionId, source: `function ${functionId}() {}`, docstring: null, candidates: candidateIds.map(candidate) };
}

describe("estimateTokens / estimateFunctionTokens", () => {
  it("estimates roughly chars/4", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(4000))).toBe(1000);
  });

  it("estimates a function's block from its JSON size, matching what buildFilterPrompt embeds", () => {
    const small = fn("tiny", ["c1"]);
    expect(estimateFunctionTokens(small)).toBe(estimateTokens(JSON.stringify(small)));
  });
});

describe("functionsOverThreshold", () => {
  it("leaves every function under threshold untouched: none returned", () => {
    const request: FilterRequest = { functions: [fn("a", ["c1", "c2"]), fn("b", ["c3"])] };
    expect(functionsOverThreshold(request)).toEqual([]);
  });

  it("names only the function(s) whose own block estimates over threshold", () => {
    const hugeCandidateIds = Array.from({ length: 2000 }, (_, i) => `huge:${i}`);
    const request: FilterRequest = { functions: [fn("small", ["c1"]), fn("huge", hugeCandidateIds)] };
    expect(functionsOverThreshold(request)).toEqual(["huge"]);
  });

  it("respects a lower threshold passed explicitly (for testing the boundary cheaply)", () => {
    const request: FilterRequest = { functions: [fn("a", ["c1", "c2", "c3"])] };
    expect(functionsOverThreshold(request, 10)).toEqual(["a"]);
    expect(functionsOverThreshold(request, 100_000)).toEqual([]);
  });
});

describe("the real stress fixture (ticket 13 checklist: trips the threshold in a test)", () => {
  it("scoreWithBands's raw candidate list alone estimates over TRIAGE_TOKEN_THRESHOLD", () => {
    const source = readFileSync(join(process.cwd(), "fixtures", "triage-stress", "scoreWithBands.js"), "utf8");
    const [eligible] = extractFunctions(source);
    expect(eligible).toBeDefined();

    const candidates = generateCandidateMutants(eligible);
    const fnInput: FilterFunctionInput = {
      functionId: eligible.name,
      name: eligible.name,
      source: eligible.source,
      docstring: eligible.docstring,
      candidates: candidates.map((c) => ({ candidateId: c.id, rule: c.rule, rewrite: c.rewrite, diff: c.diff })),
    };

    const request: FilterRequest = { functions: [fnInput] };
    expect(estimateFunctionTokens(fnInput)).toBeGreaterThan(TRIAGE_TOKEN_THRESHOLD);
    expect(functionsOverThreshold(request)).toEqual([eligible.name]);
  });
});

describe("buildTriagePrompt", () => {
  it("concatenates the triage prompt text, the one function's data, then the contract", () => {
    const prompt = buildTriagePrompt(triagePrompt, fn("sumRange", ["sumRange:c1"]));
    expect(prompt).toContain("Shrink this one function's candidate list.");
    expect(prompt).toContain("sumRange:c1");
    expect(prompt.indexOf("Shrink")).toBeLessThan(prompt.indexOf("sumRange:c1"));
    expect(prompt.indexOf("sumRange:c1")).toBeLessThan(prompt.indexOf("Respond with the triage contract."));
  });
});

describe("parseTriageResponse", () => {
  const target = fn("sumRange", ["c1", "c2", "c3"]);

  it("accepts a subset of known candidate ids", () => {
    expect(parseTriageResponse(JSON.stringify({ surviving_candidate_ids: ["c1", "c3"] }), target)).toEqual(["c1", "c3"]);
  });

  it("accepts an empty array as a legitimate 'keep nothing' answer", () => {
    expect(parseTriageResponse(JSON.stringify({ surviving_candidate_ids: [] }), target)).toEqual([]);
  });

  it("tolerates markdown fences", () => {
    const raw = `\`\`\`json\n${JSON.stringify({ surviving_candidate_ids: ["c2"] })}\n\`\`\``;
    expect(parseTriageResponse(raw, target)).toEqual(["c2"]);
  });

  it("rejects a fabricated candidate id", () => {
    expect(() => parseTriageResponse(JSON.stringify({ surviving_candidate_ids: ["nope"] }), target)).toThrow(/was not among/);
  });

  it("rejects a repeated candidate id", () => {
    expect(() => parseTriageResponse(JSON.stringify({ surviving_candidate_ids: ["c1", "c1"] }), target)).toThrow(/more than once/);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseTriageResponse("not json", target)).toThrow(/not valid JSON/);
  });

  it("rejects a response missing the array", () => {
    expect(() => parseTriageResponse(JSON.stringify({}), target)).toThrow(/surviving_candidate_ids/);
  });
});

describe("runFilterCallWithTriage", () => {
  const validFilterResponse = (functionId: string, candidateIds: string[]) =>
    JSON.stringify({
      functions: [
        {
          function_id: functionId,
          candidates: candidateIds.map((id) => ({ candidate_id: id, verdict: "rejected", reason: "obvious" })),
        },
      ],
    });

  function link(provider: string, call: ProviderLink["call"]): ProviderLink {
    return { provider, model: `${provider}-model`, envVar: `${provider.toUpperCase()}_KEY`, call };
  }

  it("skips triage entirely when no function is over threshold, and reports fired: false", async () => {
    const request: FilterRequest = { functions: [fn("small", ["c1"])] };
    const chain = [link("only", () => Promise.resolve(validFilterResponse("small", ["c1"])))];

    const outcome = await runFilterCallWithTriage(request, filterPrompt, triagePrompt, {}, chain);

    expect(outcome.triage).toEqual({ fired: false, functions: [] });
    expect(outcome.provider).toBe("only");
  });

  it("shrinks only the over-threshold function; the other function's candidates reach the main call untouched", async () => {
    const hugeIds = Array.from({ length: 2000 }, (_, i) => `huge:${i}`);
    const request: FilterRequest = { functions: [fn("small", ["c1"]), fn("huge", hugeIds)] };

    let mainCallRequest: FilterRequest | null = null;
    const chain = [
      link("solo", async (prompt: string) => {
        if (prompt.includes("Shrink this one function")) {
          // The triage call for "huge": keep exactly one of its 2000 candidates.
          return JSON.stringify({ surviving_candidate_ids: ["huge:7"] });
        }
        // The main call must answer for both functions once "huge" is shrunk.
        mainCallRequest = JSON.parse(prompt.match(/```json\n([\s\S]*?)\n```/)![1]);
        return JSON.stringify({
          functions: [
            { function_id: "small", candidates: [{ candidate_id: "c1", verdict: "rejected", reason: "obvious" }] },
            { function_id: "huge", candidates: [{ candidate_id: "huge:7", verdict: "rejected", reason: "obvious" }] },
          ],
        });
      }),
    ];

    const outcome = await runFilterCallWithTriage(request, filterPrompt, triagePrompt, {}, chain);

    expect(outcome.triage.fired).toBe(true);
    expect(outcome.triage.functions).toEqual([{ functionId: "huge", provider: "solo", model: "solo-model", candidatesIn: 2000, candidatesOut: 1 }]);
    expect(mainCallRequest).not.toBeNull();
    const small = mainCallRequest!.functions.find((f) => f.functionId === "small")!;
    const huge = mainCallRequest!.functions.find((f) => f.functionId === "huge")!;
    expect(small.candidates.map((c) => c.candidateId)).toEqual(["c1"]); // untouched
    expect(huge.candidates.map((c) => c.candidateId)).toEqual(["huge:7"]); // shrunk to the survivor
  });

  it("treats a triage chain exhaustion like a filter-call failure (throws ProviderChainError)", async () => {
    const hugeIds = Array.from({ length: 2000 }, (_, i) => `huge:${i}`);
    const request: FilterRequest = { functions: [fn("huge", hugeIds)] };
    const chain = [link("down", () => Promise.reject(new Error("503")))];

    const error = await runFilterCallWithTriage(request, filterPrompt, triagePrompt, {}, chain).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderChainError);
    expect((error as ProviderChainError).failures[0].reason).toContain('triage for function "huge"');
  });

  it("treats a missing triage prompt, when one is needed, as a total failure rather than a mechanical truncation", async () => {
    const hugeIds = Array.from({ length: 2000 }, (_, i) => `huge:${i}`);
    const request: FilterRequest = { functions: [fn("huge", hugeIds)] };

    const error = await runFilterCallWithTriage(request, filterPrompt, null, {}, []).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderChainError);
    expect((error as ProviderChainError).failures[0].reason).toContain('function "huge"');
    expect((error as ProviderChainError).failures[0].reason).toContain("triage prompt hasn't been written yet");
  });
});
