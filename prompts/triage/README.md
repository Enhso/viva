# Triage prompts

The named exception in `03-mutation-pipeline.md` §4: a second, smaller LLM call that shrinks one
function's candidate list *before* the main filter call, only when that function's raw candidate
list alone would push the main call past `TRIAGE_TOKEN_THRESHOLD` (`src/llm/triage.ts`).

- **Agent-authored, open to Hatim's overrule.** Unlike `prompts/filter/`, this directory is
  plumbing (ticket 13's Comments note: `03` §4 sits outside the `hatim` list in `CLAUDE.md`). An
  agent wrote `v001.md` to get the scaffolding working; it still shapes which candidates the
  filter call ever sees for an over-threshold function, so flag it for Hatim and apply whatever he
  dictates verbatim, the same as any other prompt file.
- `vNNN.md` (v001, v002, …): the triage instructions. A new idea gets a new file, same convention
  as `prompts/filter/`.
- `_output-contract.md`: the response shape the parser expects (`src/llm/triage.ts`
  `parseTriageResponse`). It is a narrower contract than the filter call's: triage only picks
  *which* candidates survive the shrink, it never labels them — labeling is still the main filter
  call's job, once the survivors reach it.
- This path is rare by design (most student functions never trip the threshold) and is exercised
  at least once against a real provider before demo day (ticket 13) so it isn't a first-time-live
  surprise, but it is not polished beyond that.
