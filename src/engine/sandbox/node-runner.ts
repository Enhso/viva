// Node-only (imports node:vm). Never import this from browser code; the browser uses worker-runner.ts.
import { runInNewContext } from "node:vm";
import { DEFAULT_TIMEOUT_MS, invocationBody, isReturnedFunction, thrownOutcome, type SandboxRunner } from "./types";

export function createNodeRunner({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}): SandboxRunner {
  return {
    async run({ source, functionName, input }) {
      const script = `(function (__input) {\n${invocationBody(source, functionName)}\n})(__input)`;
      try {
        // A fresh context each run: its own realm (network globals absent, Math/Date untouched
        // outside it) and its own copy of the input (structuredClone), so nothing leaks between runs.
        const value = runInNewContext(script, { __input: structuredClone(input) }, { timeout: timeoutMs });
        if (isReturnedFunction(value)) return { kind: "returnedFunction" };
        // Suppress "unhandled rejection" noise from a returned promise (e.g. a dynamic import
        // attempt) that structuredClone below is about to reject on anyway. Duck-typed: the
        // promise was made in the vm's own realm, so it is not `instanceof` the host's Promise.
        if (value !== null && typeof (value as { catch?: unknown }).catch === "function") {
          (value as Promise<unknown>).catch(() => undefined);
        }
        // Clone out of the vm's realm, as postMessage does for the Worker runner.
        return { kind: "returned", value: structuredClone(value) };
      } catch (error) {
        if ((error as { code?: string } | null)?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") return { kind: "timeout" };
        return thrownOutcome(error);
      }
    },
  };
}
