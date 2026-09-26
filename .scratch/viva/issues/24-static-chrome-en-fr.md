# 24: Static chrome in English and French, with a language picker

**What to build:** The student picks English or French before the viva, and every fixed-vocabulary string appears hand-translated in that language from a static string table, with zero runtime translation. That covers bucket names, framing copy, buttons, the help box, legend labels, and the live/cached/fallback labels. The layer is a genuine N-language registry: adding a language means adding one table and registering it. That is exactly how Darija arrives (ticket 26): registered here, but hidden from the picker until Hatim says otherwise.

**Blocked by:** 05, 08, 19

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 08 §1–2, 08 §4

- [ ] Every user-visible string resolves through the registry; no hardcoded copy remains.
- [ ] The French table is complete, authored once and checked in, never generated at runtime.
- [ ] A key-parity test fails when a visible language lacks a key the English table has. From this ticket on, any ticket adding a string adds it to every visible language.
- [ ] Darija is registered and hidden from the picker; the parity test covers visible languages only.
- [ ] The chosen language holds through the viva and into the report.
- [ ] The report's connecting-line templates exist per language, with placeholders for dynamic content.

## Comments

Note: Hatim reads French. A spot check of the French table is welcome, not a gate.
