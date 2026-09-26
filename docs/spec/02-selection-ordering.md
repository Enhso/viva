# 02 — Selection & Ordering

Depends on: `01-auth-ingestion.md` (needs the extracted function list).
Feeds into: `03-mutation-pipeline.md`.

---

## 1. What "eligible" means here

Every function extracted in step 01 that passed the JS-only, no-React/DOM/
network scope check is eligible for selection. For the hackathon build, the
student selects a **subset** of eligible functions to include in this viva
(full-coverage — every eligible function, always — is the real product
target; see `10-later-not-now.md`).

## 2. Ordering: complexity proxy, not information-theoretic score

**This naming distinction matters and should be preserved in code, UI copy,
and variable names.** Two different things were considered for "how do we
order/rank functions before the LLM has looked at anything":

- A **cheap, pre-LLM complexity proxy** — computable instantly from the AST
  for every function, free, no model call: cyclomatic complexity, branch
  count, distinct code paths, or similar.
- The **real information-theoretic (IT) score**, as actually defined in the
  brief (§2.2): whether a mutant is the kind a shallow read would miss but a
  careful trace would catch. This is a property of a *mutant*, evaluated
  *inside* the LLM call — it does not exist before the LLM has looked at a
  function's actual candidate mutations, and cannot be cheaply approximated
  pre-call.

**Decision: use the cheap complexity proxy for ordering, and call it a
"complexity score" everywhere — never "IT-score" or "information-theoretic
score."** The alternative (spending an LLM call on every eligible function
just to get a real IT-score before the student has even picked N) would
break the one-call-per-viva architecture (`03-mutation-pipeline.md`) and
waste free-tier budget analyzing functions that may never be selected. This
was an explicit tradeoff, made with the naming consequence understood and
accepted: the selection screen's ordering is an honest complexity heuristic,
not a claim about loadedness. Reserve "information-theoretic" / "IT" for
where it actually lives — inside the mutation pipeline and the report,
describing verified, surviving mutants only.

**Combining with call-graph position:** Hatim's original instinct was
bottom-up ordering (leaf functions — no calls to other user-defined
functions — first, climbing the abstraction tree). This is a legitimate,
separate signal from complexity and was not discarded, just superseded as
the *primary* sort key. If time allows, call-graph position (leaf-first) can
be used as a secondary tiebreaker under the complexity-score primary sort.
This is a nice-to-have, not required for the hackathon build — don't spend
meaningful time on it if the complexity-only sort is working.

## 3. Selection mechanics: student-set N, not a hard cap

**Decision:** N (how many functions this viva covers) is a value the
**student sets themselves** — a slider or numeric input, not a fixed/
hardcoded cap. The full eligible function list is always visible, ordered by
complexity score descending, with no separate "highlighted top N / greyed
rest" visual split needed — the cutoff is just wherever the student's chosen
N currently falls in the ordered list.

**Help box required, not optional.** Since N directly trades off against
viva length and (see `03-mutation-pipeline.md` and `05-question-loop.md`)
against how many questions the student will face, a help box near the N
control should explain the tradeoff in plain terms: more functions = more
coverage, longer viva. This also needs to account for the multiple-inputs-
per-mutant decision in `05-question-loop.md` — the help box's framing should
reflect that both N *and* the per-mutant question count affect total viva
length, not just N in isolation.

## 4. Function card contents (selection screen)

Each function, in its card on the selection screen, shows:
- Signature (always).
- Docstring, if present.
- If no docstring: explicit "no docstring provided" callout, muted styling
  — not a blank space, not an error state.
- Complexity score (however it's surfaced visually — a number, a bar, a
  label like "high/medium/low" — implementation's choice, but it should be
  visible enough that the ordering is a legible rule the student can see,
  not a black box).

## 5. What this hands off

To `03-mutation-pipeline.md`: the student's selected subset of functions
(size N, student-chosen), in complexity-score order, each with its full
source ready to feed into AST-based candidate mutation generation.
