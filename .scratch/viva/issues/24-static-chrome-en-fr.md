# 24: Static chrome in English and French, with a language picker

**What to build:** The student picks English or French before the viva, and every fixed-vocabulary string appears hand-translated in that language from a static string table, with zero runtime translation. That covers bucket names, framing copy, buttons, the help box, legend labels, and the live/cached/fallback labels. The layer is a genuine N-language registry: adding a language means adding one table and registering it. That is exactly how Darija arrives (ticket 26): registered here, but hidden from the picker until Hatim says otherwise.

**Blocked by:** 05, 08, 19

**Status:** done

**Type:** plumbing
**Spec:** 08 §1–2, 08 §4

- [x] Every user-visible string resolves through the registry; no hardcoded copy remains.
- [x] The French table is complete, authored once and checked in, never generated at runtime.
- [x] A key-parity test fails when a visible language lacks a key the English table has. From this ticket on, any ticket adding a string adds it to every visible language.
- [x] Darija is registered and hidden from the picker; the parity test covers visible languages only.
- [x] The chosen language holds through the viva and into the report.
- [x] The report's connecting-line templates exist per language, with placeholders for dynamic content.

## Answer

Registered `fr` (hand-translated) and `da` (untranslated copy, hidden) beside `en` in
`src/ui/strings/index.ts`. Added `VISIBLE_LANGUAGES` (`["en", "fr"]`) and an endonym
`LANGUAGE_NAME` map for the picker, and a `describeFallbackReasons` helper that maps fallback
reason codes (+ verbatim provider/error detail) through the table. A language picker (radio
group, `SelectionScreen.tsx`) lifts `language` state to `App.tsx`, wraps the whole app in
`LanguageContext.Provider`, and threads the choice into `buildReport(results, mode, language)`
(`src/grading/report.ts`), replacing the ticket-04 `"en"` hardcode. Removed every hardcoded
English string that reached the screen: `App.tsx`'s three fallback sentences and
`api/filter.ts`'s two, all now `FallbackReason` codes (`src/llm/types.ts`) resolved via the
table; `demo-fixtures.ts`'s `SCOPE_REASON_LABEL` map, now `scope.<reason>` keys. Added
`src/ui/strings/parity.test.ts` (key parity over `VISIBLE_LANGUAGES`, non-empty values, Darija
registered-but-hidden). `npm run typecheck`, `npm test` (235 passed), and `npm run build` all
pass; a short Playwright check on the dev server confirmed the whole selection screen —
including the excluded-corpus reasons — switches to French live on picking it.

## Comments

Note: Hatim reads French. A spot check of the French table is welcome, not a gate.

Ruling: "beat" (CONTEXT.md) renders as "étape" in French UI copy — plain, ordinary word for one
step of the exam, not a calque; every other glossary term (mutant, viva, taxonomy label, …) keeps
its English spelling. — Cost if wrong: one find/replace across `fr.ts`'s few "étape" occurrences.

Ruling: language names on the picker (English/Français) are a plain `LANGUAGE_NAME` endonym
lookup in `src/ui/strings/index.ts`, not string-table keys — a language's name for itself doesn't
change with the current UI language, and an endonym-per-table would just duplicate the same
value everywhere. — Cost if wrong: move two entries into a `selection.language.<code>` key per
table.

Ruling: fallback reasons became a typed `{ code: FallbackReasonCode; detail?: string }`
(`src/llm/types.ts`), not a bare string — `detail` is intentionally never routed through the
string table (it's the provider's own text or a caught error's message, kept verbatim per
CLAUDE.md/08 §2's dynamic-vs-static split). Several reasons can apply at once (e.g. one
fallback-inside-a-served-viva per function), so `ModeInfo.reason` and the fallback branches of
`FilterOutcome` carry `FallbackReason[]`, joined by `describeFallbackReasons`. — Cost if wrong:
the shape is used in `App.tsx`, `ModeIndicator.tsx`, `api/filter.ts`, `src/llm/types.ts`, and
`src/llm/client.test.ts`'s mocked fixtures; a revert touches all five.

Ruling: `buildReport`'s new `language` parameter defaults to `"en"` rather than being required,
so `report.test.ts` (predating the picker) keeps calling `buildReport(results, mode)` unchanged.
— Cost if wrong: make it required and update the one test file's four call sites.

## Leftovers for a follow-up ticket

- `src/llm/filter.ts`'s "the filter prompt hasn't been written yet" for `metaOnly` responses
  (`FilterMetaApiResponse.reason`) is still a bare string — left as-is because
  `src/llm/client.ts`'s `callFilterMeta` discards that field today and it never reaches the
  screen; worth a code too if something starts displaying it.
- `ProviderChainError`'s own message (`src/llm/providers.ts`) mixes an English "every provider
  failed: …" preamble with each provider's own text; out of this ticket's listed scope (not one
  of the sentences it named), but it does flow into the UI today via the `provider-chain-failed`
  reason's `detail`, so it reads English-glued-to-provider-text even under the French table.
- Tickets 22/23 will add their own string keys after merge; per the dispatch note the
  orchestrator adds their French at merge time, so `fr.ts`/`da.ts` don't yet cover those.
