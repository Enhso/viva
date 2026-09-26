# 11: Filter-lab harness

**What to build:** Hatim runs `/filter-lab` and gets a faithful run of the fixture corpus through the current filter prompt. The harness is built to the contract in the `filter-lab` skill's §2:
- extract functions and generate candidate mutants with the engine;
- call the filter through the llm layer, with the prompt text followed by the output contract;
- make one filter call per fixture;
- cache responses by prompt + contract + fixture source + model id, so a re-run spends calls only on what changed;
- run the scope check on the out-of-scope fixtures;
- write results per prompt version;
- append one row per candidate to the candidate log.

A provider failure ends the run and shows the error and host. Fallback mode stays out of the lab.

**Blocked by:** 02, 03, 06

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §1–2, 03 §7, `filter-lab` skill §2 (the contract)

- [ ] Runs as an npm script taking the arguments the skill lists (version, `--compare`, `--only`, `--provider`).
- [ ] Every item of the skill's §2 contract is met.
- [ ] A second run with nothing changed makes zero provider calls.
- [ ] Whatever `checklist` fields a prompt asks for come through as columns with no code change.
- [ ] With no filter prompt present, the harness makes no call and says the lab needs Hatim's first prompt.
- [ ] If ticket 09 has landed, every candidate the filter marked loaded is distinguish-checked and the equivalent ones are flagged. If it hasn't, ticket 09 adds this when it lands.
- [ ] Verified end to end with a test prompt kept outside the filter-prompt directory, including one real run against a provider that answers (provider and outcome recorded here). The filter-prompt directory is untouched.

## Comments
