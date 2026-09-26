# 06: Provider chain and live filter call

**What to build:** When a filter prompt exists and a provider answers, a viva's mutants come from the filter call. The browser sends the selected functions (source, and docstring or its absence) with their full candidate-mutant lists to a serverless function that holds the keys. The function then:
1. builds the prompt as the prompt file's text followed by the output contract;
2. calls the provider chain in priority order;
3. validates the response against the contract;
4. returns the loaded mutants with their taxonomy labels, plus the rejected candidates with their reasons.

The viva then runs on the loaded mutants. If a provider fails, the chain moves on. If every provider fails, or no filter prompt exists yet, the viva runs in fallback mode and says why. The mode indicator names the provider and model that served a live viva. A demo switch forces fallback on purpose, so "kill the key mid-demo" is one clearly labelled act.

**Blocked by:** 01

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §2–3, 03 §5–6, 00 §3, 09 §4

- [ ] One filter call per viva, covering all selected functions.
- [ ] Chain order: NVIDIA → Gemini → OpenRouter `:free` (see Ruling).
- [ ] Each provider client sends its auth header only when its key's env var is set.
- [ ] A response that misses a given function or candidate id, repeats one, or fails to parse counts as that provider failing.
- [ ] Every provider failing → the viva runs in fallback mode, labelled, with the reason available to the student.
- [ ] No filter prompt present → fallback mode, with a message saying the filter prompt hasn't been written yet.
- [ ] The app loads the highest-numbered filter prompt version unless a version is pinned (ticket 12 pins one).
- [ ] The mode indicator shows "live" with provider and model name, or "fallback".
- [ ] In a deployed preview, the function finds the prompt and contract files, and the force-fallback switch works and is labelled.
- [ ] Rejected candidates and their reasons are kept beside the loaded mutants, for the report and the candidate log.
- [ ] Parsing and validation are tested offline against recorded responses. Test prompts live outside the filter-prompt directory, which is Hatim's.
- [ ] Verified with at least one real call to a provider that answers; provider, model, and outcome recorded here. An outage is reported with the exact error and host, never mocked.
- [ ] Nothing under engine or grading imports from the llm layer (boundary test green).

## Comments

Ruling: the chain is NVIDIA → Gemini → OpenRouter, and a malformed response counts as that provider failing — spec 03 §5 said NVIDIA → Groq → Gemini → OpenRouter, but setup dropped Groq (commit `bfa6664`: no key, no host check), so the chain ships with three providers — cost if wrong: re-adding one client. (R5, approved by Hatim at breakdown review, 2026-09-26.)

Context: `.scratch/providers.md` (26 Sep) found that the NVIDIA key lists models but gets 404 on inference (account not provisioned), and OpenRouter returned 402 on paid models and 429 on the free pools. Gemini was network-blocked then; the session probe now reports it reachable. Expect Gemini to be the only working provider until the accounts are fixed.

Note: the filter prompt v001 is ticket 07 (Hatim's). Until it exists, the live path runs only against test prompts.
