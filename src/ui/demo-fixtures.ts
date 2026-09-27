// The fixture corpus (bootcamp, out-of-scope, own), extracted and scope-checked (ticket 02).
import { scanFunctions } from "../engine";

const sources = import.meta.glob<string>(
  ["/fixtures/functions/bootcamp/*.js", "/fixtures/functions/out-of-scope/*", "/fixtures/functions/own/*.js"],
  { query: "?raw", import: "default", eager: true },
);

export interface DemoFixture {
  functionName: string;
  path: string;
  /** The function's own source (its declaration only), not the whole file. */
  source: string;
  signature: string;
  /** The JSDoc block, verbatim, or null when the function has none (01 §6: never a stand-in). */
  docstring: string | null;
}

export type ScopeRejectionReason = "jsx" | "dom" | "network" | "parse-error";

export interface RejectedFixture {
  path: string;
  /** Empty when the whole file failed to parse, rather than one named function being rejected. */
  name: string;
  reason: ScopeRejectionReason;
}

// The English text for each reason (ticket 24) now lives in the string table under
// "scope.<reason>" — SelectionScreen resolves it through `t`, never a hardcoded label here.

function scanCorpus(): { eligible: DemoFixture[]; rejected: RejectedFixture[] } {
  const eligible: DemoFixture[] = [];
  const rejected: RejectedFixture[] = [];
  for (const [globPath, source] of Object.entries(sources)) {
    const path = globPath.replace(/^\//, "");
    try {
      const scanned = scanFunctions(source);
      for (const fn of scanned.eligible) {
        eligible.push({ functionName: fn.name, path, source: fn.source, signature: fn.signature, docstring: fn.docstring });
      }
      for (const rejection of scanned.rejected) {
        rejected.push({ path, name: rejection.name, reason: rejection.violation });
      }
    } catch {
      // A file that fails to parse is reported, but never stops the rest of the corpus (02).
      rejected.push({ path, name: "", reason: "parse-error" });
    }
  }
  return { eligible, rejected };
}

const corpus = scanCorpus();
export const DEMO_FIXTURES: DemoFixture[] = corpus.eligible;
export const REJECTED_FIXTURES: RejectedFixture[] = corpus.rejected;
