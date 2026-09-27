/** What one execution of a function on one input observably did. */
export type RunOutcome =
  | { kind: "returned"; value: unknown }
  | { kind: "threw"; errorName: string; message: string }
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

/** Function body that declares the student's function and calls it with the `__input` array. Shared by both runners. */
export function invocationBody(source: string, functionName: string): string {
  return `${source}\nreturn ${functionName}(...__input);`;
}

export function thrownOutcome(error: unknown): RunOutcome {
  if (error !== null && typeof error === "object" && "name" in error) {
    const message = "message" in error ? String(error.message) : "";
    return { kind: "threw", errorName: String(error.name), message };
  }
  return { kind: "threw", errorName: typeof error, message: String(error) };
}
