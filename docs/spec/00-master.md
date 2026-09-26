# Viva — Master Spec

**Built from:** `brief.md` (Hatim's night-before product brief) + a 49-question
iterative spec interview on 26 Sept 2026, the night before build day.
**Hackathon:** GOMYCODE × NVIDIA "Come Build with AI," 27 Sept 2026. Solo entry.
**Deadline:** 17:30 Tunis/Casablanca time, 27 Sept 2026.
**Executor:** Claude Code (cloud), per Hatim's explicit choice to build ambitiously
rather than default to the brief's minimal-scope framing.

---

## 0. How to use this spec (read this first)

This spec is **more binding than the original brief**, precisely where the two
differ. The brief's own Section 0 said Section 3 (scope/stack) was "genuinely
provisional" and open to change "the moment a better reason appears." Hatim
gave a better reason, explicitly, on the record: *"the product should be
ambitious... I think Claude can handle this."* That single sentence overrode
several of the brief's cost-saving defaults (see `10-later-not-now.md` for
what changed and why).

**What did NOT change:** Section 1 of the brief (why this project, why this
shape) and Section 2 (the hard problem) remain fully in force. Nothing in this
spec pre-decides:
- the mutant taxonomy (§2.3 of the brief — Case B today, Case A someday, and
  building the *filter/checklist* that lets the LLM surprise Hatim is itself
  the hard-idea work)
- the felt experience / pacing of question → answer → reveal (§2.4 — this
  spec fixes the *mechanics* the experience runs on, deliberately leaves the
  *pacing/emotional design* unspecified, per the brief's explicit instruction
  not to write it out as if settled)

If you are Claude Code picking this up: **do not** treat this document as
permission to solve either of those for Hatim. Build the scaffolding. He
wrestles with it live.

**If build-day reality contradicts something here:** say so out loud — "the
spec said X, but Y happened, so we're doing Z" — and proceed. That is success
per the brief's own terms, not deviation. The one exception: if a proposed
deviation would violate the brief's Section 1 (the win condition is
engagement, not rubric score; protect Section 2 build-time over systems
wiring), stop and flag it to Hatim rather than silently drifting, exactly as
the brief itself instructs.

---

## 1. Document map

Read in roughly this order; each depends on decisions made in the ones before it.

| Doc | Covers | Depends on |
|---|---|---|
| [`01-auth-ingestion.md`](./01-auth-ingestion.md) | GitHub OAuth (dual-scope), repo listing, commit fetch, function extraction | — |
| [`02-selection-ordering.md`](./02-selection-ordering.md) | Complexity-proxy ordering, student-set N, selection screen UX | 01 |
| [`03-mutation-pipeline.md`](./03-mutation-pipeline.md) | AST candidate generation, the one LLM call, token-threshold triage call | 02 |
| [`04-answer-key.md`](./04-answer-key.md) | Input battery generation, distinguish-check, dead-mutant drop, sandbox execution | 03 |
| [`05-question-loop.md`](./05-question-loop.md) | Per-mutant/per-input question sequencing, free-text/MCQ mix, MCQ shuffle | 03, 04 |
| [`06-confidence-widget.md`](./06-confidence-widget.md) | Slider/buttons/box input, Brier scoring | 05 |
| [`07-report.md`](./07-report.md) | Two-tier language rule, calibration buckets, taxonomy-label grouping, Jev/embedding matching | 03, 05, 06 |
| [`08-language-layer.md`](./08-language-layer.md) | EN/FR/Darija — static string-table + eager-in-selected-language dynamic translation | 03, 07 |
| [`09-disclosure.md`](./09-disclosure.md) | AI-disclosure content for the hackathon's submission form (separate doc, not in-product) | 03, 04, 07, 08 |
| [`10-later-not-now.md`](./10-later-not-now.md) | Explicitly deferred: webhooks, full-coverage vivas, commit-significance detection, per-student adaptive selection, Case A taxonomy, Darija ASR | — |

---

## 2. The one-sentence architecture

**Determinism handles truth. Judgment handles what's worth asking.**

Every step that touches *correctness* — extracting functions, generating
candidate mutations, computing the answer key, grading, scoring calibration —
is mechanical: an AST parser, a rule engine, or a sandboxed execution. Every
step that touches *judgment* — which candidate mutations are conceptually
loaded, what misconception they suggest, whether two labels mean the same
thing — goes through a model, and is visibly, structurally marked as
provisional wherever it surfaces.

This is not a cost-saving trick (though it helps with free-tier limits). It's
the direct engineering expression of brief §2.3's Case A/B distinction, and
it's what makes a prompt-injection attempt embedded in student code
structurally incapable of affecting a grade — grading is a plain value
comparison, never routed back through a model's opinion.

## 3. LLM/model call sites (full inventory, for the disclosure doc)

Per-viva, in the common case: **one** call (main filter/label, §03). Two
conditional exceptions:

1. **Over-threshold triage call** (§03) — fires only when a single function's
   raw candidate-mutant list exceeds the context-size threshold. Rare.
2. **Translation pass** (§08) — fires only if the student selects Darija or
   French for the session, translating dynamic content (docstring glosses,
   taxonomy labels) eagerly, but only into the one selected language.

Plus one **non-generative** model use:

3. **Jev** (TypeSafe, `typesafe.ai`) — closed classification only, for
   same-concept label matching in the report (§07). Falls back to embedding
   similarity (fixed, untuned cosine threshold) if Jev integration fails.

Full disclosure language lives in `09-disclosure.md` — write that after 03,
04, 07, 08 are built, so it describes what actually shipped, not what was
planned.

## 4. Known open decisions (intentionally left to build-day feel)

These are not gaps in this spec — they're places the brief and the interview
both concluded should stay open. Do not resolve them here or in code comments
as if they were settled:

- Exact pacing/sequencing of the experience (question → answer → reveal →
  synthesis) — prototype, run Hatim through it, feel it out.
- Exact wording/visual treatment of the Tier 2 hedge (the *rule* — visibly
  different treatment for provisional content — is settled; the execution
  isn't).
- Whether Darija output is good enough to show in the demo/video — empirical,
  decide live, cut silently if bad.
- Weighting constant for free-text-vs-MCQ on subsequent inputs per mutant
  (currently: ~80/20 free-text-favored on first input, closer to even
  thereafter — tune by feel).
- Whether a mentor one-on-one happens at all, and whether the pitch (brief
  §1.5) becomes relevant — conditional, don't build for it as certain.

## 5. Success criteria (restated from brief §4 — re-read before cutting anything)

In order of what actually matters:
1. Did wrestling with mutant-loadedness (the filter/checklist design, §03)
   actually happen as real intellectual work, not a rubber-stamp?
2. Did the experience (§05) produce an "oh" moment when Hatim ran through it
   himself?
3. Does the report (§07) visibly separate the two tiers such that Hatim could
   point at it and explain the rule in one sentence?
4. Does it survive a live demo, ideally including the fallback mode on
   purpose?
5. *(Bonus)* Is the systems wiring robust?

A build that scores well on the jury's rubric but where 1–3 didn't happen is,
by Hatim's own terms, not a successful build.
