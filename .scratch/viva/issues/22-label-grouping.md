# 22: Label grouping: Jev primary, embedding-similarity fallback

**What to build:** Within each calibration bucket, entries whose independently produced taxonomy labels name the same concept ("off-by-one" and "index boundary handling") are grouped together. The same/different decision comes from Jev (TypeSafe), used for this one closed classification and nothing else. If Jev fails or times out, that viva's grouping falls back to embedding similarity: embed both labels with a free-tier embedding provider, and call them the same when cosine similarity clears a fixed, untuned threshold (about 0.85, an acknowledged placeholder). Grouping is Tier 2 and renders as such. Which mechanism grouped a viva's labels is recorded.

**Blocked by:** 06, 19

**Status:** done

**Type:** plumbing
**Spec:** 07 §6, 00 §3, 09 §2

- [x] Nothing else in the codebase calls Jev.
- [x] Any Jev failure falls back to embedding similarity for that viva. If both fail, grouping falls back to exact label text, and the report still renders.
- [x] The threshold is one named constant, commented as an untuned placeholder.
- [x] How pairwise decisions become groups (e.g. A~B and B~C but not A~C) is a Ruling here.
- [x] Label grouping runs in the llm layer behind the serverless function (keys stay server-side; auth headers only when env vars are set); the report consumes its result. Engine and grading stay model-free.
- [x] Which mechanism served (Jev; embeddings, provider named; or exact text) is recorded per viva for the disclosure.
- [x] Verified with real calls to Jev and to the embedding provider on a handful of label pairs, outcomes recorded here. Outages are reported with exact error and host, never mocked.
- [x] Jev integration uses the `typesafe-ai` skill, scoped to label grouping (CLAUDE.md routing).

## Answer

Built `src/llm/label-grouping.ts` (pure pairwise-decisions-to-groups algorithm: union-find over
same/different verdicts, deterministic group key = lexicographically smallest label), `src/llm/jev.ts`
(the one Jev call site: a single batched request, one Noul question per unique label pair),
`src/llm/embedding.ts` (Gemini `gemini-embedding-001` cosine-similarity fallback), and
`src/llm/grouping.ts` (`runLabelGrouping`: Jev -> embedding -> exact-text, injectable for tests,
never throws). `api/group-labels.ts` runs this behind a serverless function; the browser
(`src/llm/client.ts` `callGroupLabelsApi`) posts this viva's distinct taxonomy labels once, from
`src/ui/App.tsx`, right after the last beat and before the report renders. `src/grading/report.ts`
gained an optional `LabelGroupingInput` (plain data: `{ mechanism, provider?, groupKeyByLabel }`,
no import from `src/llm`) that `buildReport` uses to merge report groups on top of its existing
exact-text grouping, and a `Report.labelGrouping` field (`{ mechanism, provider? }`) recording
which mechanism served, for `09-disclosure.md` to read. A `null` grouping result (no call made
yet, or it failed to reach the browser at all) leaves grouping at exact-text, unchanged from
ticket 19 -- the report always renders.

**Ruling:** pairwise same/different decisions become groups by transitive closure (union-find) --
A~B and B~C but not A~C still puts all three in one group. Simplest rule that turns independent
pairwise judgments into a partition; cost if wrong is an occasional over-merged group (two
concepts bridged by one ambiguous label), not a crash or an undefined bucket assignment. Group key
is the lexicographically smallest label in the group -- deterministic, order-independent.

**Ruling:** the embedding fallback's provider is Gemini (`gemini-embedding-001`). Gemini is
already a working, reachable provider link in this environment (`src/llm/providers.ts`, confirmed
live 2026-09-27 per `.scratch/providers.md`), so it needed no new account or key, matching 07 §6's
"no preference stated; default to whichever is cheapest/fastest to wire up given existing provider
keys." Cost if wrong: swap the one `embed()` call in `src/llm/embedding.ts`.

**Real-call verification (2026-09-27, ~13:00-13:10 Casablanca):**
- **Jev** (`api.typesafe.ai/v1/systemone`, `jev-latest`, exact documented request shape from
  `docs.typesafe.ai/introduction/quickstart.md`): every attempt (direct curl, a standalone Node
  script using `process.env.TYPESAFE_API_KEY`, and through the live `api/group-labels.ts`
  endpoint on the dev server) returned **HTTP 401** from `api.typesafe.ai`:
  `{"detail":{"error_type":"authentication_error","message":"Cannot authenticate with the server.
  Please check your API key and try again."}}`. `$TYPESAFE_API_KEY` is set in this session and
  the SessionStart hook reported the host reachable; the request shape matches the docs' own
  quickstart example verbatim (`Authorization: Bearer $TYPESAFE_API_KEY`). This reads as an
  account/key-provisioning issue on the TypeSafe side, not a code or header-format bug --
  reported here rather than mocked around, per CLAUDE.md's deviation protocol. **Jev never
  succeeded in this session; every real run in this session exercised the embedding fallback
  live**, which is itself a real end-to-end proof that the fallback path works, not just that it
  exists.
- **Embedding fallback** (Gemini `gemini-embedding-001`, `generativelanguage.googleapis.com`):
  succeeded on every real call, including through the live `/api/group-labels` endpoint. Measured
  cosine similarities on real label pairs: "off-by-one" / "index boundary handling" = 0.703,
  "off-by-one" / "wrong comparison operator" = 0.645, "null check omission" / "missing null
  guard" = 0.789. All below the fixed 0.85 threshold, so none of these plausibly-related pairs
  grouped in this probe -- consistent with the spec's own framing of 0.85 as an untuned,
  conservative placeholder, not a tuned number (07 §6). Threshold tuning is explicitly out of
  scope for today.
- **End-to-end** (`curl` against `npm run dev`'s `/api/group-labels`, port 5188): Jev failed with
  the real 401 above, the chain moved to embedding, which succeeded and returned
  `{"mechanism":"embedding","provider":"gemini",...}` with the failures array naming the exact
  Jev error -- confirming the fallback and disclosure-recording behavior against the real chain,
  not just the injectable-mock unit tests.

**Leftovers for Comments:**
- Jev's 401 is worth flagging to Hatim before the demo: if the key is meant to work, whoever
  provisioned `$TYPESAFE_API_KEY` should re-check it at the TypeSafe dashboard
  (`console.typesafe.ai/keys`) -- as shipped, every real viva in this environment will run the
  embedding fallback, not Jev, which is honest (recorded per-viva) but not what §6 names as
  primary.
- `ReportScreen`/`Tier2` don't yet surface `report.labelGrouping` (mechanism/provider) anywhere
  in-product -- 09-disclosure.md says disclosure is a separate written form, not an in-product
  panel, so this wasn't required, but the field is there (`Report.labelGrouping`) if a future
  ticket wants a small in-product note.
- Did not add a `.scratch/providers.md` entry for this ticket's probes (kept in this ticket's
  Answer instead, since the label-grouping calls aren't part of the filter-provider chain that
  file tracks) -- flag if Hatim wants it merged into that file for one place to look.

## Comments
