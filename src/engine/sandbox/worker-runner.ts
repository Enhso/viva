// Browser-only (Web Worker). Node tests use node-runner.ts; both implement SandboxRunner.
import { DEFAULT_TIMEOUT_MS, type RunOutcome, type RunRequest, type SandboxRunner } from "./types";

export type WorkerMessage = { type: "ready" } | { type: "result"; outcome: RunOutcome };

interface SandboxWorker {
  worker: Worker;
  ready: Promise<void>;
}

function spawn(): SandboxWorker {
  const worker = new Worker(new URL("./sandbox.worker.ts", import.meta.url), { type: "module" });
  const ready = new Promise<void>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === "ready") resolve();
    };
    // A worker that fails to load (bad URL, syntax error in the worker script itself) never
    // sends "ready" — without this, `run` would wait on it forever instead of timing out.
    worker.onerror = (event) => reject(new Error(event.message || "sandbox worker failed to load"));
  });
  return { worker, ready };
}

/**
 * One worker, one run at a time. A run that outlives the timeout gets its worker terminated
 * and replaced, so an infinite loop never freezes the page. The timer starts once the worker
 * has loaded, so a slow first load is never mistaken for a timeout.
 */
export function createWorkerRunner({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}): SandboxRunner & { dispose(): void } {
  let current = spawn();
  let queue: Promise<unknown> = Promise.resolve();

  async function runOne(request: RunRequest): Promise<RunOutcome> {
    const { worker, ready } = current;
    try {
      await ready;
    } catch {
      // The worker that failed to load is still `current`; replace it so the next run gets a
      // fresh attempt instead of repeating the same failure.
      current = spawn();
      return { kind: "threw", errorName: "WorkerLoadError" };
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        current = spawn();
        resolve({ kind: "timeout" });
      }, timeoutMs);
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type !== "result") return;
        clearTimeout(timer);
        resolve(event.data.outcome);
      };
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        current = spawn();
        resolve({ kind: "threw", errorName: "WorkerLoadError" });
      };
      worker.postMessage(request);
    });
  }

  return {
    run(request) {
      const outcome = queue.then(() => runOne(request));
      queue = outcome.catch(() => undefined);
      return outcome;
    },
    dispose() {
      current.worker.terminate();
    },
  };
}
