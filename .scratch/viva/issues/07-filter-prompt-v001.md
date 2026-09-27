# 07: Filter prompt v001

**What to build:** Hatim's first filter/checklist prompt: the wording that tells the filter call which candidate mutants are loaded on both axes (taxonomy and information-theoretic) and what to name them. The output contract already fixes the response shape. Its `checklist` object is an open slot: whatever per-candidate fields the prompt asks for become columns in the filter-lab table, with no code change. This is the hard-idea work of brief §2.3, a checklist loose enough to let the model surprise and sharp enough that its labels classify into something taxonomy-shaped later. Agents do not draft it.

**Blocked by:** None (can start immediately). Hatim may prefer to write it after seeing the rule engine's candidates (ticket 03) or a first lab run (ticket 11); that's his call, not a gate.

**Status:** done

**Type:** hatim
**Spec:** 03 §1–2, brief §2.2–2.3, 00 §5 #1

- [ ] Hatim dictates v001; an agent writes it verbatim as the first version in the filter-prompt directory.
- [ ] Once the harness (ticket 11) exists, suggest `/filter-lab`.

## Comments

Scaffolding available on request. These are options, not recommendations; each is named by what it would make observable in the lab table:
- A `checklist` field per axis (e.g. yes/no plus one line of evidence each): shows, candidate by candidate, where the two axes disagree.
- A field for "the input a shallow reader would try": makes the information-theoretic claim checkable against the answer key later.
- A field for label confidence or a "could also be" alternative: shows how stable labels are before label grouping has to cope with them.
- No checklist fields at all: the lab shows verdict, label, and reason only, the smallest surface to read.
