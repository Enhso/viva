/**
 * The app's own seeded PRNG (05 §4): the position shuffle (and, ticket 18, the free-text/
 * multiple-choice format draw) must be chosen by "your own randomness source," never by the
 * LLM. This is deliberately a separate implementation from the sandbox preamble's Math.random
 * monkey-patch (sandbox/types.ts) -- that one seeds a *different* global inside a separate vm/
 * worker realm, for repeatable student-code execution, and is not available to app code anyway.
 * A seeded generator here is fine (CLAUDE.md/ticket 18 context): it makes the format/shuffle
 * choices reproducible, including in the uniformity test below and in multiple-choice.test.ts.
 *
 * mulberry32: a small, fast, statistically decent 32-bit generator. Returns a function that
 * yields a new draw in [0, 1) on every call, advancing its own closed-over state.
 */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
