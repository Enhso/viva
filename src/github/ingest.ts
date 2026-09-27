// Ticket 23 step 2→3: repo tree → filtered `.js` files → fetched → extracted/scope-checked
// (`scanFunctions`, `src/engine`), in the same shape the selection screen already reads for the
// demo corpus (`src/ui/demo-fixtures.ts`) so both sources can feed one screen.
import { scanFunctions } from "../engine";
import type { GithubRepo } from "./api";
import { fetchBlobText, fetchDefaultBranchTree } from "./api";
import { filterJsFiles } from "./tree-filter";

export interface IngestedFunction {
  functionName: string;
  path: string;
  source: string;
  signature: string;
  docstring: string | null;
}

export type IngestRejectionReason = "jsx" | "dom" | "network" | "parse-error" | "not-eligible-file";

export interface IngestRejection {
  path: string;
  name: string;
  reason: IngestRejectionReason;
}

export interface IngestResult {
  eligible: IngestedFunction[];
  rejected: IngestRejection[];
}

/**
 * Fetches the repo's default-branch tree, keeps only plain `.js` files (`filterJsFiles`), fetches
 * each one, and runs the same scope check the demo corpus goes through. A repo with no eligible
 * functions comes back with an empty `eligible` array — the ticket's "a repo with no eligible
 * functions says so" is the caller's job (it has the count to say so with).
 */
export async function ingestRepo(token: string, repo: Pick<GithubRepo, "owner" | "name" | "defaultBranch">): Promise<IngestResult> {
  const tree = await fetchDefaultBranchTree(token, repo.owner, repo.name, repo.defaultBranch);
  const { included, skipped } = filterJsFiles(tree.entries);

  const eligible: IngestedFunction[] = [];
  const rejected: IngestRejection[] = skipped.map(({ entry }) => ({ path: entry.path, name: "", reason: "not-eligible-file" }));

  for (const entry of included) {
    let source: string;
    try {
      if (!entry.sha) throw new Error("tree entry has no blob sha");
      source = await fetchBlobText(token, repo.owner, repo.name, entry.sha);
    } catch {
      rejected.push({ path: entry.path, name: "", reason: "network" });
      continue;
    }
    try {
      const scanned = scanFunctions(source);
      for (const fn of scanned.eligible) {
        eligible.push({ functionName: fn.name, path: entry.path, source: fn.source, signature: fn.signature, docstring: fn.docstring });
      }
      for (const rejection of scanned.rejected) {
        rejected.push({ path: entry.path, name: rejection.name, reason: rejection.violation });
      }
    } catch {
      rejected.push({ path: entry.path, name: "", reason: "parse-error" });
    }
  }

  return { eligible, rejected };
}
