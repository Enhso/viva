# 22: Label grouping: Jev primary, embedding-similarity fallback

**What to build:** Within each calibration bucket, entries whose independently produced taxonomy labels name the same concept ("off-by-one" and "index boundary handling") are grouped together. The same/different decision comes from Jev (TypeSafe), used for this one closed classification and nothing else. If Jev fails or times out, that viva's grouping falls back to embedding similarity: embed both labels with a free-tier embedding provider, and call them the same when cosine similarity clears a fixed, untuned threshold (about 0.85, an acknowledged placeholder). Grouping is Tier 2 and renders as such. Which mechanism grouped a viva's labels is recorded.

**Blocked by:** 06, 19

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 07 §6, 00 §3, 09 §2

- [ ] Nothing else in the codebase calls Jev.
- [ ] Any Jev failure falls back to embedding similarity for that viva. If both fail, grouping falls back to exact label text, and the report still renders.
- [ ] The threshold is one named constant, commented as an untuned placeholder.
- [ ] How pairwise decisions become groups (e.g. A~B and B~C but not A~C) is a Ruling here.
- [ ] Label grouping runs in the llm layer behind the serverless function (keys stay server-side; auth headers only when env vars are set); the report consumes its result. Engine and grading stay model-free.
- [ ] Which mechanism served (Jev; embeddings, provider named; or exact text) is recorded per viva for the disclosure.
- [ ] Verified with real calls to Jev and to the embedding provider on a handful of label pairs, outcomes recorded here. Outages are reported with exact error and host, never mocked.
- [ ] Jev integration uses the `typesafe-ai` skill, scoped to label grouping (CLAUDE.md routing).

## Comments
