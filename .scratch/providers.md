# Provider smoke test — 2026-09-26

One-token chat completion attempted per provider. No keys printed below.

| Provider | Model id chosen | HTTP status | Outcome |
| --- | --- | --- | --- |
| NVIDIA (integrate.api.nvidia.com) | `nvidia/llama-3.1-nemotron-70b-instruct` | 404 | `Function '<uuid>': Not found for account`. Model listing (`GET /v1/models`) returns 200 with 82 models — key authenticates fine — but no inference function is provisioned on this account. Retried with `mistralai/mistral-7b-instruct-v0.3`, same 404 shape with a different function uuid. Looks like an account-provisioning gap, not a model-choice problem. |
| Gemini (generativelanguage.googleapis.com) | not reached | n/a | BLOCKED by network allowlist (proxy CONNECT tunnel returns 403; confirmed again live, matches the SessionStart check). `$GEMINI_API_KEY` is set but unusable from this session until the host is allowed. |
| OpenRouter (openrouter.ai) | `meta-llama/llama-3.1-8b-instruct` (paid attempt), then `google/gemma-4-31b-it:free`, then `qwen/qwen3.8-27b:free` | 402, then 429, then 429 | Model listing returns 200 with 458 models. Paid model: 402 insufficient credits (account never purchased credits). Two different free-tier models: 429, both from the shared upstream free pool (Google AI Studio, then ModelRun) — congested at test time, not this key's fault. |

## Root cause guess

SessionStart flagged `environment: UNSET` — the custom `viva` environment likely wasn't applied to this session. That would explain the Gemini network block (host not in the fallback allowlist) and is plausibly unrelated to the NVIDIA/OpenRouter account-level issues (those look like billing/provisioning on the actual accounts, not network policy).

## What to do

- NVIDIA: check which NIM functions are actually enabled on this account/key at build.nvidia.com; the key can list but not invoke anything.
- OpenRouter: add credits, or plan around free-tier congestion (retry/backoff or a paid model once credits exist).
- Gemini: fix the `viva` environment's network allowlist, or add `generativelanguage.googleapis.com` to this session's allowed hosts.
