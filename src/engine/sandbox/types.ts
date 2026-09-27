/** What one execution of a function on one input observably did. */
export type RunOutcome =
  | { kind: "returned"; value: unknown }
  // A returned function can't cross the structured-clone/postMessage boundary either runner uses,
  // so both runners detect it before cloning and report this fixed outcome instead (04 §2; ticket
  // 17 gives it a richer rendering). Ruling: the thrown message never counts either — V8 (Node) and
  // the browser's engine word errors differently, so comparing messages would make the two runners
  // (and the distinguishing check) disagree on code that behaves identically; errorName is stable.
  | { kind: "returnedFunction" }
  | { kind: "threw"; errorName: string }
  | { kind: "timeout" };

export interface RunRequest {
  /** Source that declares the function, e.g. an eligible function's or a mutant's. */
  source: string;
  functionName: string;
  input: unknown[];
}

/** Executes student code away from the page. Node runs it in `node:vm` (tests); the browser runs it in a Web Worker. */
export interface SandboxRunner {
  run(request: RunRequest): Promise<RunOutcome>;
}

export const DEFAULT_TIMEOUT_MS = 1000;

// Fixed for every run, so two runs of the same input agree (04 §2). Arbitrary constants: only
// determinism (repeatability) is required, not realism.
const RANDOM_SEED = 0x5eed1234;
const FIXED_TIME_MS = 1_700_000_000_000;

/**
 * Prepended to every run, in both runners, before the student's own source. Runs first each time
 * (a fresh `vm` context per Node run; re-executed on every call in the Worker, since one Worker
 * handles many runs) so it can't leak state between runs or between mutant and original.
 * - Seeds `Math.random` and fixes `Date.now` so randomness/clock use is repeatable.
 * - Clears `fetch`/`XMLHttpRequest`/`WebSocket` so there is nothing to reach the network with.
 * Dynamic `import(...)` needs no stub: Node's `vm` has no import-callback configured (throws
 * synchronously or rejects the returned promise), and the browser blocks it too (04, manual check).
 */
const SANDBOX_PREAMBLE = `
globalThis.fetch = undefined;
globalThis.XMLHttpRequest = undefined;
globalThis.WebSocket = undefined;
(function seedMathRandom(seed) {
  Math.random = function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})(${RANDOM_SEED});
Date.now = function () { return ${FIXED_TIME_MS}; };
`;

/** Function body that declares the student's function and calls it with the `__input` array. Shared by both runners. */
export function invocationBody(source: string, functionName: string): string {
  return `${SANDBOX_PREAMBLE}\n${source}\nreturn ${functionName}(...__input);`;
}

/** True for any value that cannot cross the structured-clone/postMessage boundary a run's result travels over. */
export function isReturnedFunction(value: unknown): boolean {
  return typeof value === "function";
}

export function thrownOutcome(error: unknown): RunOutcome {
  if (error !== null && typeof error === "object" && "name" in error) {
    return { kind: "threw", errorName: String(error.name) };
  }
  return { kind: "threw", errorName: typeof error };
}
