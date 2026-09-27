// Node-only (imports node:vm). Never import this from browser code; the browser uses worker-runner.ts.
import { runInNewContext } from "node:vm";
import { DEFAULT_TIMEOUT_MS, invocationBody, thrownOutcome, type SandboxRunner } from "./types";

export function createNodeRunner({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}): SandboxRunner {
  return {
    async run({ source, functionName, input }) {
      const script = `(function (__input) {\n${invocationBody(source, functionName)}\n})(__input)`;
      try {
        const value = runInNewContext(script, { __input: structuredClone(input) }, { timeout: timeoutMs });
        // Clone out of the vm's realm, as postMessage does for the Worker runner.
        return { kind: "returned", value: structuredClone(value) };
      } catch (error) {
        if ((error as { code?: string } | null)?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") return { kind: "timeout" };
        return thrownOutcome(error);
      }
    },
  };
}
