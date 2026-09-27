// Runs inside a Web Worker. invocationBody (types.ts) carries the network/randomness hardening;
// this file only has to keep this runner's observable outcomes matching the Node runner's (04 §2).
import { invocationBody, isReturnedFunction, thrownOutcome, type RunOutcome, type RunRequest } from "./types";
import type { WorkerMessage } from "./worker-runner";

function send(message: WorkerMessage): void {
  try {
    postMessage(message);
  } catch (error) {
    // A returned value that can't cross postMessage's structured-clone boundary (e.g. an object
    // holding a function nested inside it, not caught by the isReturnedFunction check below,
    // which only covers a directly-returned function). Node hits the same wall via
    // structuredClone; report it the same way instead of leaving this message unsent.
    postMessage({ type: "result", outcome: thrownOutcome(error) } satisfies WorkerMessage);
  }
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const { source, functionName, input } = event.data;
  let outcome: RunOutcome;
  try {
    const value: unknown = new Function("__input", invocationBody(source, functionName))(input);
    outcome = isReturnedFunction(value) ? { kind: "returnedFunction" } : { kind: "returned", value };
  } catch (error) {
    outcome = thrownOutcome(error);
  }
  send({ type: "result", outcome });
};

send({ type: "ready" });
