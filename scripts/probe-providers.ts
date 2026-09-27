// `npm run probe:providers`: one tiny call per provider-chain link (the models PROVIDER_CHAIN
// actually uses) plus one authenticated Jev call, printed as Markdown for the SessionStart hook.
// Host reachability isn't enough: on 2026-09-27 every host answered while a model had been
// retired, another timed out on real requests, and the TypeSafe key returned 401.
import { jevPairwiseSame } from "../src/llm/jev.js";
import { PROVIDER_CHAIN } from "../src/llm/providers.js";

const PROBE_TIMEOUT_MS = 25_000;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`no answer in ${PROBE_TIMEOUT_MS / 1000} s`)), PROBE_TIMEOUT_MS)),
  ]);
}

async function probe(name: string, work: () => Promise<unknown>): Promise<string> {
  const started = Date.now();
  try {
    await withTimeout(work());
    return `- ${name}: ok (${Date.now() - started} ms)`;
  } catch (error) {
    const reason = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").slice(0, 160);
    return `- ${name}: BLOCKED (${reason})`;
  }
}

const lines = await Promise.all([
  ...PROVIDER_CHAIN.map((link) =>
    probe(`${link.provider} ${link.model}`, () => link.call('Reply with the JSON {"ok": true} and nothing else.', process.env[link.envVar] || undefined)),
  ),
  probe("jev (typesafe)", () => jevPairwiseSame([{ a: "off-by-one error", b: "fencepost error" }], process.env.TYPESAFE_API_KEY || undefined)),
]);
console.log(lines.join("\n"));
process.exit(0);
