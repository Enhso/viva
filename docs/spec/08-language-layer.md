# 08 — Language Layer

Depends on: `03-mutation-pipeline.md` (taxonomy labels are dynamic content
needing translation), `07-report.md` (report narrative is dynamic content
needing translation).
Feeds into: `09-disclosure.md` (translation is a conditional LLM call site).

---

## 1. Three languages, two different commitment levels

- **English and French** — committed, per brief §3.4. Full support, no
  hedging on quality.
- **Darija (Latin script / Arabizi, not audio)** — speculative bonus, per
  brief §3.4, in Hatim's own words: *"It can be a bonus but not
  load-bearing feature of the product. I'll build it and test it. If it's
  any good I'll show it in the video or during the demo."* **No fallback
  engineering effort should be spent making bad Darija output presentable —
  if it's bad, cut it silently**, don't ship a degraded-but-visible version.

**Important architectural note, confirmed explicitly during spec review:**
even though Darija is speculative *for the demo*, it is **not** speculative
*architecturally*. The rendering approach below (§2) must be built as a
genuine three-language abstraction from the start — not English generated
once with Darija bolted on as a translation afterthought, and not three
separate hardcoded string sets. Adding Darija today should be
architecturally the same kind of operation as adding a fourth real language
later. This is more build-day work than a quick translation pass, but it's
the difference between Darija being a real precedent and being a demo trick
that gets ripped out.

## 2. Two-tier rendering: static string-table + eager dynamic translation

**Static UI chrome** — bucket names, framing copy ("here's what actually
happened"), button labels, help-box text, legend labels, and any other
fixed-vocabulary string a judge is likely to read first — is **hand-
translated once** into all three languages and stored as a static
string-table/template set. **Zero runtime translation risk on this layer.**
This was chosen deliberately over live-translating UI chrome, specifically
because this is exactly the content a judge reads first, and pre-authored
quality is worth far more here than architectural purity.

**Dynamic content** — docstring glosses, taxonomy labels, report synthesis
prose, anything that doesn't exist until the pipeline actually runs on a
specific student's specific code — cannot be pre-authored. This is where
"judge the actual output quality live" (brief §3.4) genuinely applies, and
it's a narrow, isolated slice of the total UI, not the whole thing.

## 3. Dynamic-content translation: a separate pass, not bundled

**Decision:** translation of dynamic content is a **separate LLM call**,
distinct from the main filter/label call in `03-mutation-pipeline.md`, and
explicitly **not** done via Jev (Jev's closed-classification design doesn't
fit an open-generation task like translation).

**Why separate rather than bundled into the main call (preserved
reasoning):** asking one model call to do taxonomy labeling/filtering *and*
translation simultaneously risks degrading either task — the primary
judgment work (the actual hard-idea work per §2.3) shouldn't compete with a
secondary translation task inside the same response. A dedicated pass keeps
each call doing one job well, at the cost of an additional call and
latency.

**This makes translation the third conditional LLM call site,** alongside
the over-threshold triage call from `03-mutation-pipeline.md`. State this
plainly in `09-disclosure.md`: up to three call sites per viva, only one
(main filter/label) is core and unconditional; the triage call and the
translation pass are both named, rare-or-conditional exceptions.

## 4. Eager-within-selected-language, not eager-across-all-languages

**This distinction was explicitly walked through and matters — get it
right, it's a real rate-limit consideration, not a nicety.**

"Eager" here means: translate everything needed **the moment it's needed,
for whichever single language the student has already selected** — not
on-demand/lazy within that language, and **critically, not translating into
all three languages regardless of what the student picked.**

A fully-eager-across-all-languages approach (translate into English, French,
*and* Darija every single viva, regardless of student selection) was
considered and rejected: it would silently triple call volume and burn
free-tier rate-limit headroom (a real constraint per brief §3.1 — OpenRouter
specifically caps at 20 req/min, 50 req/day unfunded) on languages nobody
will ever look at.

**Concrete behavior:** if a student selects French, dynamic content gets
translated into French only, upfront (bundled into whatever loading screen
already exists — the report is a single end-of-viva screen per
`07-report.md` §1, so a report-assembly loading beat already exists and can
absorb this translation cost without introducing a *new* wait; pre-viva
content, e.g. mutated code framing, needs its own upfront translation
moment before the first question, since the report's loading screen is too
late for that). No English-of-non-English-source or unused-language
translation happens in the background.

## 5. What this hands off

To `09-disclosure.md`: the translation pass is call-site #3 (conditional —
only fires if French or Darija is selected), with the eager-within-selected-
language behavior stated so a technical juror understands why call volume
doesn't triple regardless of language choice.
