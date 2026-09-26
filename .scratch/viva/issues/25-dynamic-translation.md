# 25: Dynamic content translation into the selected language

**What to build:** A student who selects French sees dynamic content (docstring glosses, taxonomy labels, report synthesis text) translated into French and only French. Translation is its own model call through the provider chain, separate from the filter call and never via Jev. It runs eagerly at two moments: a pre-viva moment before the first beat, for anything the loop shows, and the report's existing loading beat, for labels and synthesis. With English selected, no translation call happens at all. If translation fails, the viva keeps running in the source language, labelled.

**Blocked by:** 06, 24

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 08 §2–4, 03 §5, 00 §3

- [ ] Zero translation calls when English is selected.
- [ ] Exactly one target language per viva, never every registered language.
- [ ] A separate call from the filter call, through the provider chain, never Jev.
- [ ] It fires only at the pre-viva moment and the report's loading beat; no new wait appears mid-viva.
- [ ] The original docstring stays visible beside its gloss.
- [ ] Label grouping (ticket 22) runs on source-language labels; translation applies to display only, and translated labels still render through the Tier 2 component.
- [ ] A translation failure shows source-language content with a visible note; the viva never stops.
- [ ] Whether translation fired is recorded per viva, for the disclosure.
- [ ] Verified with a real French viva, outcome recorded here. Outages are reported with exact error and host, never mocked.

## Comments
