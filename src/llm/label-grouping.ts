// Label grouping (07 §6, ticket 22): pure data shapes and the pairwise-decisions-to-groups
// algorithm. Deliberately network-free -- the Jev call (jev.ts) and the embedding-similarity
// fallback (embedding.ts) both reduce to "is this pair the same concept?" and hand their answer
// to `pairsToGroups` here, which is the one place partitioning logic lives and the one place its
// correctness is tested.

export type LabelGroupingMechanism = "jev" | "embedding" | "exact-text";

export interface UnorderedPair {
  a: string;
  b: string;
}

/**
 * The result the report consumes as plain data (checklist item: label grouping runs behind the
 * serverless function; the report never calls a model, it just reads this).
 */
export interface LabelGroupingResult {
  mechanism: LabelGroupingMechanism;
  /** Named only for "embedding" -- 09-disclosure.md names the provider that actually served. */
  provider?: string;
  /** Every input label maps to its group's representative key; entries whose labels share a key
   * belong in the same report group. */
  groupKeyByLabel: Record<string, string>;
  /** Present only when an earlier mechanism failed and the chain moved on -- the exact error and
   * host, never swallowed silently (CLAUDE.md deviation protocol). */
  failures?: string[];
}

/** A stable, order-independent identity for an unordered pair -- used to look a pair's verdict
 * back up in a Map keyed by this string. */
export function pairKey(pair: UnorderedPair): string {
  return `${pair.a}\u0000${pair.b}`;
}

/** Every unique unordered pair among distinct labels, in a fixed (sorted) order -- so a batched
 * request (Jev's one call per viva, jev.ts) lists its questions deterministically. */
export function uniquePairs(labels: string[]): UnorderedPair[] {
  const sorted = Array.from(new Set(labels)).sort();
  const pairs: UnorderedPair[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) pairs.push({ a: sorted[i], b: sorted[j] });
  }
  return pairs;
}

/**
 * Ruling: pairwise same/different decisions become groups by transitive closure (union-find) --
 * A~B and B~C but not A~C still puts all three in one group, rather than leaving C on its own or
 * requiring every pair in a group to have been independently judged the same. This is the
 * simplest rule that turns independent pairwise judgments into a partition; the cost if wrong is
 * an occasional over-merged group (two concepts bridged by one ambiguous label) rather than a
 * crash or an undefined bucket assignment. The group's key is deterministic and order-independent:
 * the lexicographically smallest label among its members.
 */
export function pairsToGroups(labels: string[], same: (pair: UnorderedPair) => boolean): Record<string, string> {
  const unique = Array.from(new Set(labels));
  const parent = new Map(unique.map((label) => [label, label]));

  function find(label: string): string {
    let root = label;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(label, root);
    return root;
  }

  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return;
    // Smaller label always wins as root, so the final key is the group's lexicographically
    // smallest member regardless of the order pairs were unioned in.
    if (rootA < rootB) parent.set(rootB, rootA);
    else parent.set(rootA, rootB);
  }

  for (const pair of uniquePairs(unique)) {
    if (same(pair)) union(pair.a, pair.b);
  }

  const result: Record<string, string> = {};
  for (const label of unique) result[label] = find(label);
  return result;
}

/** The no-mechanism-available fallback: every distinct label is its own group. */
export function exactTextGroups(labels: string[]): Record<string, string> {
  return pairsToGroups(labels, () => false);
}
