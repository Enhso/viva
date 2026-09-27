#!/usr/bin/env -S node
// The filter lab (ticket 11, filter-lab skill §2): a faithful run of the fixture corpus through
// the current filter prompt, for Hatim to read via `npm run filter-lab`. Publishing the table
// (skill §3-4) is the orchestrator's job, not this script's: this writes
// `.scratch/filter-lab/<version>/results.json` and appends to `logs/candidates.csv`.
//
// Ruling: run with `tsx` (added as a devDependency). Node 22.22's built-in TS type-stripping
// needs explicit `.ts` specifiers, which `src/` doesn't use (it's written for the bundler/vitest
// resolvers) — rewriting every import there to satisfy a lab script wasn't worth the churn.
// Cost if wrong: swap the npm script's runner: nothing here is tsx-specific besides that shebang.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

import { extractFunctions, generateCandidateMutants, scanFunctions, sharedBattery } from "../src/engine/index.js";
import { findDistinguishingInputs } from "../src/engine/fallback.js";
import { createNodeRunner } from "../src/engine/sandbox/node-runner.js";
import type { EligibleFunction } from "../src/engine/types.js";
import {
  loadFilterPromptFile,
  loadFilterPromptVersion,
  loadLatestFilterPrompt,
  PROVIDER_CHAIN,
  ProviderChainError,
  runFilterCall,
  type FilterPrompt,
} from "../src/llm/index.js";
import type { ProviderLink } from "../src/llm/providers.js";
import type { FilterCallSuccess, FilterCandidateInput, FilterFunctionInput, FilterRequest, ProviderFailure } from "../src/llm/types.js";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".scratch", "filter-lab", "cache");
const CANDIDATES_LOG = join(ROOT, "logs", "candidates.csv");
const CANDIDATES_LOG_HEADER = "code_hash,candidate_label,survived_filter,question_asked,prompt_version,source\n";

interface Args {
  version: string | null;
  compare: string | null;
  only: string | null;
  provider: string | null;
  promptFile: string | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { version: null, compare: null, only: null, provider: null, promptFile: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--compare") args.compare = argv[++i] ?? null;
    else if (arg === "--only") args.only = argv[++i] ?? null;
    else if (arg === "--provider") args.provider = argv[++i] ?? null;
    // Undocumented in the skill's argument-hint on purpose: a hook so the harness can be verified
    // end to end against a test prompt kept outside prompts/filter/ (ticket 11's acceptance
    // criterion), without ever writing into Hatim's directory.
    else if (arg === "--prompt-file") args.promptFile = argv[++i] ?? null;
    else if (!arg.startsWith("--") && args.version === null) args.version = arg;
  }
  return args;
}

type PromptResolution = { kind: "found"; prompt: FilterPrompt } | { kind: "no-prompts-at-all" } | { kind: "version-not-found"; version: string };

function resolvePrompt(args: Args): PromptResolution {
  if (args.promptFile) return { kind: "found", prompt: loadFilterPromptFile(args.promptFile) };
  if (args.version) {
    const prompt = loadFilterPromptVersion(args.version);
    return prompt ? { kind: "found", prompt } : { kind: "version-not-found", version: args.version };
  }
  const prompt = loadLatestFilterPrompt();
  return prompt ? { kind: "found", prompt } : { kind: "no-prompts-at-all" };
}

function resolveChain(providerName: string | null): ProviderLink[] {
  if (!providerName) return PROVIDER_CHAIN;
  const narrowed = PROVIDER_CHAIN.filter((link) => link.provider === providerName);
  if (narrowed.length === 0) {
    throw new Error(`--provider "${providerName}" doesn't match any provider in the chain (${PROVIDER_CHAIN.map((l) => l.provider).join(", ")})`);
  }
  return narrowed;
}

function fixtureFiles(only: string | null): string[] {
  const dirs = ["bootcamp", "own"].map((d) => join(ROOT, "fixtures", "functions", d));
  const files = dirs.flatMap((dir) => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith(".js") || name.endsWith(".jsx"))
      .map((name) => join(dir, name));
  });
  if (!only) return files;
  return files.filter((file) => {
    const b = basename(file);
    return b === only || b === `${only}.js` || b === `${only}.jsx` || basename(file, extname(file)) === only;
  });
}

function outOfScopeFiles(): string[] {
  const dir = join(ROOT, "fixtures", "functions", "out-of-scope");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js") || name.endsWith(".jsx"))
    .map((name) => join(dir, name));
}

function cacheKey(promptText: string, contractText: string, source: string, model: string): string {
  return createHash("sha256").update(promptText).update("\0").update(contractText).update("\0").update(source).update("\0").update(model).digest("hex");
}

function cachePath(hash: string): string {
  return join(CACHE_DIR, `${hash}.json`);
}

interface CachedCall {
  provider: string;
  model: string;
  result: FilterCallSuccess["result"];
}

/**
 * Reproduces `runFilterCall`'s chain-with-fallback (06), but per-link, checking the on-disk
 * cache before ever calling that link. Chain order is deterministic, so once one provider has
 * answered for a given prompt+contract+source, a re-run hits its cache file on the first check
 * and never reaches a provider (ticket 11's "second run makes zero provider calls").
 */
async function cachedFilterCall(
  request: FilterRequest,
  prompt: FilterPrompt,
  chain: ProviderLink[],
  env: Record<string, string | undefined>,
  fixtureSource: string,
): Promise<{ success: FilterCallSuccess; cached: boolean }> {
  const failures: ProviderFailure[] = [];
  for (const link of chain) {
    const hash = cacheKey(prompt.promptText, prompt.contractText, fixtureSource, link.model);
    const file = cachePath(hash);
    if (existsSync(file)) {
      const cached = JSON.parse(readFileSync(file, "utf8")) as CachedCall;
      return { success: { provider: cached.provider, model: cached.model, result: cached.result }, cached: true };
    }
    try {
      const success = await runFilterCall(request, prompt, env, [link]);
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify({ provider: success.provider, model: success.model, result: success.result } satisfies CachedCall, null, 2));
      return { success, cached: false };
    } catch (error) {
      if (error instanceof ProviderChainError) failures.push(...error.failures);
      else failures.push({ provider: link.provider, model: link.model, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  throw new ProviderChainError(failures);
}

function functionInput(fixtureId: string, fn: EligibleFunction): FilterFunctionInput {
  const candidates: FilterCandidateInput[] = generateCandidateMutants(fn).map((c) => ({
    candidateId: c.id,
    rule: c.rule,
    rewrite: c.rewrite,
    diff: c.diff,
  }));
  return { functionId: `${fixtureId}:${fn.name}`, name: fn.name, source: fn.source, docstring: fn.docstring, candidates };
}

interface CandidateRow {
  candidateId: string;
  rule: string;
  diff: { line: number; before: string; after: string };
  verdict: "loaded" | "rejected";
  label: string | null;
  reason: string | null;
  checklist: Record<string, unknown>;
  equivalent: boolean | null;
  distinguishingInputCount: number | null;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const resolution = resolvePrompt(args);
  if (resolution.kind === "no-prompts-at-all") {
    console.log("The filter lab needs Hatim's first prompt: no prompts/filter/vNNN.md exists yet. No provider call made.");
    return;
  }
  if (resolution.kind === "version-not-found") {
    console.error(`Prompt version "${resolution.version}" was not found under prompts/filter/. No provider call made.`);
    process.exitCode = 1;
    return;
  }
  const prompt = resolution.prompt;

  const chain = resolveChain(args.provider);
  const runner = createNodeRunner();
  const files = fixtureFiles(args.only);
  if (files.length === 0) {
    console.log(args.only ? `No fixture matched --only "${args.only}".` : "No fixture files found under fixtures/functions/{bootcamp,own}.");
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(join(ROOT, "logs"), { recursive: true });
  if (!existsSync(CANDIDATES_LOG)) writeFileSync(CANDIDATES_LOG, CANDIDATES_LOG_HEADER);

  const fixtureResults: unknown[] = [];
  let candidateCount = 0;
  let loadedCount = 0;
  let rejectedCount = 0;
  let equivalentCount = 0;
  let lastProviderUsed: { provider: string; model: string } | null = null;
  const csvRows: string[] = [];

  for (const file of files) {
    const fixtureId = basename(file, extname(file));
    const source = readFileSync(file, "utf8");
    const fns = extractFunctions(source);
    if (fns.length === 0) {
      fixtureResults.push({ file: fixtureId, error: "no eligible functions extracted" });
      continue;
    }

    const request: FilterRequest = { functions: fns.map((fn) => functionInput(fixtureId, fn)) };

    let outcome: { success: FilterCallSuccess; cached: boolean };
    try {
      outcome = await cachedFilterCall(request, prompt, chain, process.env, source);
    } catch (error) {
      if (error instanceof ProviderChainError) {
        const hosts = error.failures.map((f) => `${f.provider} (${f.model}): ${f.reason}`).join("; ");
        console.error(`Provider failure on fixture "${fixtureId}": ${hosts}`);
      } else {
        console.error(`Provider failure on fixture "${fixtureId}": ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exitCode = 1;
      return;
    }

    lastProviderUsed = { provider: outcome.success.provider, model: outcome.success.model };
    const { loaded, rejected } = outcome.success.result;

    const functionRows: unknown[] = [];
    for (const fn of fns) {
      const functionId = `${fixtureId}:${fn.name}`;
      const candidates = generateCandidateMutants(fn);
      const battery = sharedBattery(fn);
      const rows: CandidateRow[] = [];

      for (const candidate of candidates) {
        candidateCount++;
        const loadedEntry = loaded.find((l) => l.functionId === functionId && l.candidateId === candidate.id);
        const rejectedEntry = rejected.find((r) => r.functionId === functionId && r.candidateId === candidate.id);

        let equivalent: boolean | null = null;
        let distinguishingInputCount: number | null = null;
        if (loadedEntry) {
          loadedCount++;
          // Ticket 09 (distinguish check + equivalent drop) hasn't landed; using the current
          // answer-key path directly (engine's findDistinguishingInputs + sharedBattery) so the
          // lab flags equivalents now rather than waiting on it (ticket 11's Comments/09 note).
          const answerKey = await findDistinguishingInputs(fn, candidate, battery, runner);
          distinguishingInputCount = answerKey.length;
          equivalent = answerKey.length === 0;
          if (equivalent) equivalentCount++;
        } else if (rejectedEntry) {
          rejectedCount++;
        }

        rows.push({
          candidateId: candidate.id,
          rule: candidate.rule,
          diff: candidate.diff,
          verdict: loadedEntry ? "loaded" : "rejected",
          label: loadedEntry?.label ?? null,
          reason: rejectedEntry?.reason ?? null,
          checklist: loadedEntry?.checklist ?? rejectedEntry?.checklist ?? {},
          equivalent,
          distinguishingInputCount,
        });

        const codeHash = createHash("sha256").update(candidate.source).digest("hex");
        const survivedFilter = Boolean(loadedEntry) && equivalent === false;
        csvRows.push(
          [codeHash, csvEscape(loadedEntry?.label ?? ""), String(survivedFilter), "false", prompt.version, "lab"].join(","),
        );
      }

      functionRows.push({ functionId, name: fn.name, signature: fn.signature, docstring: fn.docstring, candidates: rows });
    }

    fixtureResults.push({
      file: fixtureId,
      provider: outcome.success.provider,
      model: outcome.success.model,
      cached: outcome.cached,
      functions: functionRows,
    });
  }

  const scopeCheck = outOfScopeFiles().map((file) => {
    const source = readFileSync(file, "utf8");
    const { eligible, rejected } = scanFunctions(source);
    return {
      file: basename(file),
      rejected: eligible.length === 0,
      reasons: rejected.map((r) => `${r.name}: ${r.violation}`),
    };
  });

  if (csvRows.length > 0) appendFileSync(CANDIDATES_LOG, csvRows.map((r) => `${r}\n`).join(""));

  const outDir = join(ROOT, ".scratch", "filter-lab", prompt.version);
  mkdirSync(outDir, { recursive: true });
  const results = {
    version: prompt.version,
    compareVersion: args.compare,
    provider: lastProviderUsed?.provider ?? null,
    model: lastProviderUsed?.model ?? null,
    generatedAt: new Date().toISOString(),
    fixtures: fixtureResults,
    scopeCheck,
    counts: { candidates: candidateCount, loaded: loadedCount, rejected: rejectedCount, loadedButEquivalent: equivalentCount },
  };
  writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));

  console.log(
    `filter-lab ${prompt.version}: ${fixtureResults.length} fixture(s), ${candidateCount} candidates ` +
      `(${loadedCount} loaded, ${rejectedCount} rejected, ${equivalentCount} loaded-but-equivalent). ` +
      `Wrote ${join(".scratch", "filter-lab", prompt.version, "results.json")}.`,
  );
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
