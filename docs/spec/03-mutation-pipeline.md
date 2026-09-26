# 03 — Mutation Pipeline

Depends on: `02-selection-ordering.md` (needs the student's selected N functions).
Feeds into: `04-answer-key.md`, `05-question-loop.md`, `07-report.md`.

This is the architectural core of Viva. Brief §3.2 calls the one-LLM-call
design "load-bearing... not merely a way to survive rate limits." Everything
in this doc protects that property except where an explicit, named exception
applies (§4 below).

---

## 1. The two axes of "loaded" (context, not a thing to solve here)

Per brief §2.2, a mutant needs to pass **both**:
- **Taxonomy axis** — carries a plausible misconception label (off-by-one,
  `<` vs `<=`, truthy/falsy coercion, reference equality, closure/scope
  capture, operator precedence, async ordering, etc.). Gives mutants names,
  which is what makes the report legible.
- **Information-theoretic axis** — changing the line actually changes output
  on some input a shallow-but-plausible read of the code would not have
  flagged as risky. A technically-valid taxonomy label on a trivially
  obvious mutant isn't informative.

**This spec does not pre-decide the taxonomy list, the filter design, or how
the LLM should weigh these two axes against each other.** That is brief
§2.3's "checklist/filter structure" — the actual hard-idea work Hatim wants
to wrestle with live on build day. Do not hand him a finished filter design;
build the plumbing (below) that lets him iterate on the filter/prompt
quickly.

## 2. Pipeline shape (the settled part)

```
AST rule-engine (mechanical, no LLM)
  → raw candidate mutant list, per selected function (over-generates, includes junk)
  → ONE LLM call: {function source, docstring-or-absence, full candidate list for
     all N selected functions} → {which candidates are conceptually loaded,
     taxonomy label per surviving candidate, optionally a reason for rejected ones}
  → surviving, labeled candidates proceed to 04-answer-key.md
```

**The AST rule-engine never invents a mutation from scratch and the LLM
never invents a mutation from scratch either.** The rule engine mechanically
walks the AST and applies fixed transformation rules (flip `<` to `<=`, flip
`&&` to `||`, off-by-one on an index, swap `===` for `==`, delete a `return`,
etc. — this list is illustrative, not exhaustive; expand as needed, it's all
mechanical). The LLM only ever filters and labels a fixed menu of
already-generated candidates. This is what keeps the "quality of AI use"
story clean: determinism handles what mutations *exist*, judgment handles
what's *worth asking*.

## 3. Candidates are sent uncapped by default

**Decision:** no per-function cap on raw candidates sent to the LLM. Send
the entire generated list for every selected function, every time. This is
an accepted risk (a pathologically branchy function could produce a large
prompt) rather than an artificial ceiling that would silently degrade
ordinary functions.

## 4. Named exception: the over-threshold triage call

**This is the one deliberate exception to "one LLM call per viva," and it
must be stated as such — plainly, not buried — in `09-disclosure.md`.**

If a single function's raw candidate list is large enough to push the main
call past a context-size threshold (pick a concrete token number during
build — e.g., sized to the smallest context window across the provider
fallback chain in §5, with margin), that function's candidates get shrunk
**before** the main call, via a **second, smaller LLM call** dedicated only
to picking which candidates survive the shrink.

Why a second LLM call rather than a mechanical truncation rule (first-N,
or some cheap heuristic): a mechanical rule can't actually make the
judgment call of *which candidates matter most* — pretending it can would be
the less honest choice. A plainly-labeled arbitrary truncation was
considered and rejected in favor of this.

**Framing for the disclosure doc:** "one LLM call per viva, plus a rare
second triage call only when a single function's raw candidate list exceeds
[threshold]." Do not let the rubric-reader assume zero exceptions — state
this exactly.

This path should be rare in practice (most student functions won't
generate enough raw candidates to trip it) — don't over-invest in polishing
it, but it must exist and must be tested at least once before demo day
(e.g., against a deliberately branchy test function) so it isn't a
first-time-live surprise.

## 5. Provider fallback chain (brief §3.1, unchanged)

In priority order: NVIDIA Build hosted API → Groq → Gemini/AI Studio →
OpenRouter `:free` models last (OpenRouter's free tier caps at 20 req/min,
50 req/day unfunded — too low to survive dev + demo + judging alone).

This chain applies to **both** call sites in this document (main call,
triage call) and to the translation pass in `08-language-layer.md`. It does
not apply to Jev (`07-report.md`), which is a separate provider entirely
with its own fallback (embedding similarity).

## 6. Total fallback: every provider fails

Per brief §3.2: if every provider fails, fall back to default edge-case
inputs, the first mutant that changes output, and templated
(unlabeled/generically-labelled) question wording. **The viva should still
run** in this mode. Build this in. It's acceptable — good, even — to
demonstrate this live by killing the API key mid-demo, so long as it's
clearly labelled as fallback/mock per the submission disclosure rules.

## 7. Logging (Case A groundwork — cheap, don't over-build)

Every LLM-proposed candidate misconception — whether or not it survives the
information-theoretic filter — gets logged. This is nearly free since the
API call is already being made. Minimum viable: a CSV or equivalent of
`{code_hash, candidate_label, survived_filter, question_asked}`.

**Do not build an export feature, a dashboard, or anything beyond "the data
exists and isn't thrown away."** This is speculative upside (raw material
for Hatim to eventually author a real Case A taxonomy himself), not a
committed pilot. Over-investing here directly violates brief §1.2's
instruction not to let systems wiring eat hours meant for the actual
hard-idea work.

## 8. What this hands off

To `04-answer-key.md`: surviving, taxonomy-labeled mutants per selected
function, ready for input-battery generation and sandboxed execution.

To `05-question-loop.md`: the same, once answer-key computation (04) has
run — the question loop needs both the mutant and its verified distinguishing
input(s).

To `07-report.md`: taxonomy labels (for grouping) and, where applicable,
the rejected-candidate reasons (context for the report's Tier 2 hedge
language).
