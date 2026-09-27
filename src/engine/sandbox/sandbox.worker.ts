// Runs inside a Web Worker. Network blocking and seeded randomness arrive with ticket 04.
import { invocationBody, thrownOutcome, type RunOutcome, type RunRequest } from "./types";
import type { WorkerMessage } from "./worker-runner";

function send(message: WorkerMessage): void {
  postMessage(message);
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const { source, functionName, input } = event.data;
  let outcome: RunOutcome;
  try {
    const value: unknown = new Function("__input", invocationBody(source, functionName))(input);
    outcome = { kind: "returned", value };
  } catch (error) {
    outcome = thrownOutcome(error);
  }
  send({ type: "result", outcome });
};

send({ type: "ready" });
