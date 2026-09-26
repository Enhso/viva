# 13: Over-threshold triage call

**What to build:** When one function's raw candidate-mutant list would push the filter call past a concrete token threshold, a second, smaller model call runs first and picks which of that function's candidates survive the shrink. The threshold is a named constant, sized to the smallest context window in the provider chain with margin. A deliberately branchy stress fixture trips it. That fixture is kept outside the bootcamp corpus, so the lab's corpus is unchanged. The path is exercised at least once against a real provider before demo day, so it isn't a first-time-live surprise.

**Blocked by:** 03, 06

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §4–5

- [ ] The filter call's prompt size is estimated in tokens; the threshold's number and how it was derived are recorded here (the disclosure quotes both).
- [ ] Only over-threshold functions go through triage; the others are untouched.
- [ ] A triage failure is treated like a filter-call failure: the chain moves on, and total failure runs the viva in fallback mode. No mechanical truncation exists anywhere (03 §4 rejected it).
- [ ] The triage prompt is its own versioned file, separate from Hatim's filter prompts, and marked as agent-authored and open to Hatim's overrule.
- [ ] The stress fixture trips the threshold in a test.
- [ ] Whether triage fired is recorded per viva, for the disclosure and the candidate log.
- [ ] One real run's outcome is recorded here: fired yes/no, provider, candidates in and out.

## Comments

Note: 03 §4 sits outside the `hatim` list, so the triage prompt is plumbing. It still shapes which candidate mutants the filter call ever sees; point Hatim at it when it lands.
