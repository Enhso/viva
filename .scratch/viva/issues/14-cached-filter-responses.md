# 14: Cached filter responses

**What to build:** Running a viva again on unchanged code, with the same prompt version and model, reuses the stored filter response and makes zero provider calls. The mode indicator says "cached", distinct from "live" and "fallback". This protects the free-tier budget through dev, rehearsal, and judging, and lets a rehearsed demo replay if every provider is down. Cuttable: it serves success criterion #5 only.

**Blocked by:** 06

**Status:** ready-for-agent

**Type:** plumbing
**Spec:** brief §3.2 (caching by code hash), 09 §1 (label live vs. mock/cached explicitly)

- [ ] The cache key covers prompt text, output contract, the functions' sources and candidate lists, and model id; any change is a miss.
- [ ] A hit makes zero provider calls and is labelled "cached", naming the provider and model that originally served it.
- [ ] The cache survives a page reload on the demo machine; where it lives is a Ruling here.
- [ ] Rehearsals can clear it.
- [ ] Force-fallback (ticket 06) wins over a cache hit.

## Comments
