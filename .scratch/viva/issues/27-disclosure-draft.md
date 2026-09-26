# 27: Disclosure draft from what shipped

**What to build:** A written draft of the hackathon's AI/tool disclosure, built from what actually shipped rather than from the spec, ready for Hatim to trim to the form's limits. It covers access constraints, actual AI contribution, and fallback, labelling live vs. mock/cached explicitly. The inventory:
- the filter call, and which provider(s) actually served it;
- the triage call, its token threshold, and whether it fired;
- the translation pass, and when it fires;
- Jev for label grouping (early access, no independent track record), with the embedding fallback, its provider, and the untuned threshold;
- the fully deterministic parts;
- the one-sentence architecture claim;
- fallback-mode labelling for the live demo;
- the OAuth scopes and the unused write grant;
- the Case A/B staging framing, with the candidate log.

**Blocked by:** 13, 15, 22, 23, 25

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** 09 §1–6

- [ ] Every bracketed fill-in in 09 §2 is answered from recorded evidence (ticket comments, per-viva records), with its source noted; nothing is filled in from the spec's plans.
- [ ] Anything that didn't ship is stated as not shipped, not described.
- [ ] The mode labels in the text match what the UI actually shows.
- [ ] A full version and a short version for tight field limits, committed under `docs/`.
- [ ] Hatim reviews and submits it; no agent submits anything.

## Comments
