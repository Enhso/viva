# 15: Candidate log from app vivas

**What to build:** Every candidate mutant the filter call judged in an app viva, loaded or rejected, lands in a durable log. The log uses the same columns as the filter lab's candidate log (`filter-lab` skill §2), with `source` marking app runs. This is Case A groundwork: the data exists and isn't thrown away. No export, no dashboard, nothing more.

**Blocked by:** 06

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 03 §7, brief §2.3

- [ ] One row per candidate per live viva, rejected ones included.
- [ ] `question_asked` reflects whether a beat was actually asked on that candidate.
- [ ] The sink outlives both the serverless invocation and the browser tab; runtime logs with short retention don't count. The choice is a Ruling here.
- [ ] Fallback-mode vivas log nothing; there are no filter judgments to log.
- [ ] A logging failure never breaks a viva.
- [ ] No export feature, dashboard, or viewer exists.

## Comments
