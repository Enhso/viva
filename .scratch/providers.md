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

# Provider smoke test — 2026-09-27 (~12:55 Casablanca)

Tiny chat completion per model, `max_tokens` ≤ 200. Session hook reported all four hosts reachable and all keys set. No keys printed.

| Provider | Model id | HTTP | Outcome |
| --- | --- | --- | --- |
| Gemini | `gemini-2.5-flash` | 404 | "no longer available to new users", suggests `gemini-3.8-flash` |
| Gemini | `gemini-3.8-flash` (`v1beta/models/…:generateContent`, `x-goog-api-key`) | 200 | answered "ok" (response parts carry a `thoughtSignature`) |
| NVIDIA | `openai/gpt-oss-20b` | 200 | answered "ok"; separate `reasoning` field |
| NVIDIA | `nvidia/nemotron-3-super-120b-a12b` | 200 | answered; reasoning model, spends the token budget in `reasoning_content` first |
| NVIDIA | `moonshotai/kimi-k2.6` | 404 | `Function '<uuid>': Not found for account` (the 09-26 failure shape, now per-model) |
| NVIDIA | `deepseek-ai/deepseek-v4.1-flash` | — | curl timeout at 60 s, 0 bytes |
| NVIDIA | `meta/llama-3.1-8b-instruct` | 410 | end of life 2026-08-26 |
| OpenRouter | `nvidia/nemotron-3-super-120b-a12b:free` | 200 | answered |
| OpenRouter | `qwen/qwen3.8-27b:free`, `google/gemma-4-31b-it:free` | 429 | upstream free pool rate-limited |
| OpenRouter | `meta-llama/llama-3.3-70b-instruct:free` | 404 | no longer free |

Upshot for ticket 06: every link in the chain has at least one model that answers today. NVIDIA inference is no longer account-blocked across the board; pick models from `GET /v1/models` and probe, since per-model provisioning varies. Model ids have rotated since most training data: don't hardcode from memory.

## Afternoon, real filter-call payload (~15:10)

Three-function request (42 candidates, ~4.9k prompt tokens), each link alone. Defaults (reasoning on) failed: NVIDIA `gpt-oss-20b` > 60 s (and > 120 s at `reasoning_effort: low`), OpenRouter nemotron > 60 s / no `content`. With reasoning off: NVIDIA `nemotron-3-super-120b-a12b` (`chat_template_kwargs.enable_thinking: false`) 40.8–52.8 s; OpenRouter `nemotron-3-super-120b-a12b:free` (`reasoning.enabled: false`) 27.8–44.2 s; Gemini `gemini-3.8-flash` default 36.9 s, with JSON mode + `thinkingLevel: low` 12.7 s, but 503 "high demand" on 3 of 5 calls this afternoon.
