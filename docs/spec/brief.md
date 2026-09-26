# Viva — Product Brief

**Written:** 26 Sept 2026, night before build.
**For:** a future Claude instance, working from this document alone, with no memory of the conversation that produced it.
**Status:** slightly authoritative, not a locked contract. Read the "How to use this document" section before anything else — it governs how binding each part is.

---

## 0. How to use this document

Hatim asked for this brief explicitly so a future session (possibly you) could pick up the project without re-deriving the reasoning from scratch. But he was equally explicit that it should not function as a spec to be obeyed — it should function as *a settled starting position with visible reasoning*, so that if reality intrudes mid-build, you can say "the brief said X, but Y just happened, so we're doing Z" and that is success, not deviation.

Concretely:
- **Section 1 (why this project, why this shape)** is the most durable part. If a build-day decision would violate it, stop and flag it rather than silently drifting.
- **Section 2 (the hard problem)** is the part Hatim most wants to *personally wrestle with* tomorrow. Do not solve it for him by pre-deciding the mutant taxonomy or writing it as if the answer is obvious. Your job is to build the scaffolding that lets him wrestle with it live, not to wrestle with it on his behalf.
- **Section 3 (scope, stack, timeline)** is genuinely provisional. It's a reasonable default under uncertainty, not a commitment. Treat every stack/library choice as changeable the moment a better reason appears.
- **Section 4 (what "done" feels like)** is the actual success criterion. Re-read it before deciding whether to cut a feature.

If you are the specialist instance picking this up: don't ask Hatim to re-explain his motivation. It's in Section 1. Do feel free to ask him about anything Section 3 leaves open.

---

## 1. Why this project, why this shape

### 1.1 The actual win condition

This is a hackathon (GOMYCODE × NVIDIA "Come Build with AI," 27 Sept 2026, solo entry, free-tier APIs only, no Brev). The obvious optimization target is the jury's 100-point rubric. **That is not the target.**

Hatim's stated win condition: *"If I feel excitement while building, while making choices, while presenting. I need to feel the project in my bones."* He was explicit that optimizing purely for judged score risks handing him hours of plumbing he doesn't care about — and he'd rather have that not happen, even at some cost to score.

This has a concrete implication: when a design choice trades off "higher score" against "more of the specific engagement described in 1.2," **the brief's default is to protect the engagement**, and you should say so out loud rather than quietly picking the score-maximizing path. This is not license to ignore the rubric — a project that doesn't work isn't exciting to demo either — but it is a real tiebreaker.

### 1.2 Where the engagement actually lives

Asked which parts of the *build itself* he'd lean into, Hatim ranked:
1. **Wrestling with the hard idea** (see Section 2)
2. **Building the experience** (see Section 2.4 — not "the interface," see below)
3. *(bonus, not core)* the systems wiring — provider fallbacks, caching, robustness

He was explicit and unprompted about correcting "interface" to "experience": the interface is the vehicle (layout, visual hierarchy, what's bold); the *experience* is the felt sequence a person moves through — the moment of typing an answer while not knowing if you're right, the beat where a mutant question forces you to actually re-read a line, the specific sting of seeing "confidently wrong" about *your own* code rather than a bare percentage. This is a distinct design problem from information architecture, and it's one he can only really solve by building it and running himself through it — which is exactly why it's "wrestling," not "specify in advance." **Do not write out a finished experience design as if it were settled.** Build the smallest version that lets him feel it and iterate.

**Practical consequence:** provider fallback chains, request caching, rate-limit handling — build the minimum that keeps the demo from breaking, then stop. Do not let this consume build-day hours that were meant for the mutant-selection logic or the report experience. If you find yourself polishing retry logic while the report screen is still a wireframe, that's the brief being violated.

### 1.3 What Viva is, one line

A short oral-style exam generated from a student's own code, where the answer key is computed by *running* the code (and deliberately mutated versions of it), so grading of the mechanical parts never depends on an LLM's opinion of what's correct.

### 1.4 Why this problem, evidenced

- Anthropic's own RCT (52 developers, learning the Trio library) found AI-assisted learners scored ~17% lower (50% vs 67%) on a post-task comprehension quiz than those who coded without AI, with the largest gap on *debugging* questions. AI delegation (having the AI write the code) scored worst; AI used for explanation/conceptual questions didn't show the same penalty. (Anthropic, "How AI assistance impacts the formation of coding skills.")
- AI-text detectors are known to be unreliable and specifically biased against non-native English writers (Liang et al., 2023, Patterns / ICLR workshop) — flagging simple, correct word choices as AI-generated more often than native writers' text. This matters directly for a GOMYCODE audience, many of whom write in a second or third language. **Viva's framing is explicitly not "catch cheaters."** It measures understanding regardless of who or what wrote the code, which sidesteps the detector-fairness problem entirely rather than trying to solve it.
- GOMYCODE's own bootcamp format (per public instructor reviews, anecdotal) runs 30+ checkpoints and 25+ one-to-ones over a few months — a format that already has a "verify understanding, not just output" bottleneck, which is what Viva slots into.

### 1.5 Pitch order (if a mentor one-on-one happens)

Explicitly decided: **lead with the pain point, hold the epistemics in reserve.**

- **Lead:** "Checkpoints that pass hide confidently-wrong understanding. Viva surfaces exactly where a student is sure of something they've got backwards, from their own code, in about 4 minutes."
- **Depth, only if asked "how do you know that's meaningful" or similar:** the two-tier design (Section 2.5) and the taxonomy-in-formation framing (Section 2.3) — presented as an honest account of "here's how this becomes rigorous over time," not a claim that it's rigorous today.

This ordering is deliberate, not just diplomatic: a GOMYCODE/business-facing juror wants the problem first; the one or two technical jurors (NVIDIA, InstaDeep) get *rewarded* with depth if they probe, which reads as intellectual honesty rather than a sales pitch collapsing under scrutiny.

### 1.6 Prize framing (context, not a target to chase)

The onboarding page (checked 25 Sept) names the first-place country prize the **"GOMYCODE Future of Learning Award"** (education, skills access, employability, learning innovation) — Viva sits centrally in that theme without having been built for it. The **Brightest Skills & Employability Award** ("assess, demonstrate, develop or access job-relevant skills") also fits directly. Mention these as *evidence the problem framing is real*, not as the reason the project exists — that would invert Section 1.1.

---

## 2. The hard problem (this is what to protect build-day time for)

### 2.1 The actual question

What makes a code mutation "conceptually loaded" — i.e., a mutant that is genuine evidence of whether someone understands the code, rather than an arbitrary line-change? And once you have loaded mutants, what should the resulting report show a mentor so that it's actionable rather than a number nobody reads?

These two questions are one problem, not two: a loaded mutant with a dumb report wastes the signal; a well-presented report over arbitrary mutants has nothing real to show.

### 2.2 Two axes of "loaded," both wanted, and how they compose

Hatim explicitly wants both of these, not one:

- **Taxonomy axis** — a mutant is evidence *of something specific*: off-by-one, `<` vs `<=`, mutation-vs-new-object, truthy/falsy coercion, reference equality, closure/scope capture, operator precedence, async ordering, etc. This gives mutants *names*, which is what makes a report legible ("this tests boundary inclusivity") rather than just "you got #3 wrong."
- **Information-theoretic axis** — a mutant is loaded only if it's the kind a shallow "looks right, ship it" read of the code would miss, but someone who actually traced the logic would catch. A boundary-condition mutant is worthless if the boundary is never exercised by any input a shallow reader would try. This is what makes a mutant *worth asking* even if it has a valid taxonomy name — a technically-off-by-one mutant that's trivially obvious isn't informative.

**How they compose:** taxonomy tells you *what a mutant is evidence of*; the information-theoretic filter tells you *whether it's actually informative for this specific piece of code*. A mutant needs to pass both: it should carry a plausible misconception label, *and* changing that line should actually change the output on some input a naive-but-plausible read of the code would not have flagged as risky.

### 2.3 Case A vs Case B — the resolved tension, and why it matters

Presented with the choice between:
- **Case A:** hand-designed taxonomy of 8–10 misconception categories, each with hand-written AST rules — fully authored by Hatim, fully legible, fully defensible in a demo.
- **Case B:** LLM reads the actual code and proposes candidate misconceptions live, with a fixed category list acting only as a *classifier/filter* on the LLM's output, not a generator.

Hatim's answer: **"Case B at first but ultimately Case A."** He does not currently have the domain knowledge to author a full taxonomy in one day, but if the product continues past the hackathon, he wants to own the taxonomy end-to-end himself — not have it remain an LLM's opinion indefinitely.

**This is a staging decision, not an ambivalence.** Tomorrow's build is honestly, explicitly Case B. But it should be built so that:
- Every LLM-proposed candidate misconception (whether or not it survives the information-theoretic filter) gets **logged**, cheaply — this is nearly free if you're already making the API call, so there's no excuse to skip it.
- The *why* — "this is deliberately Case B today because the taxonomy doesn't exist yet, and the logs are the raw material for Hatim writing Case A himself later" — is something you should be able to say out loud in the demo/pitch if asked, and should **not** be hidden or apologized for. It is the intellectually honest position, not a shortcut.
- **Do not over-invest in logging infrastructure.** The pitch, if it happens, is conditional on getting a one-on-one (Hatim called this "if I manage to"), so this is speculative upside, not a committed pilot. A CSV of `{code_hash, candidate_label, survived_filter, question_asked}` is enough. Do not build an export feature, a dashboard, or anything beyond "the data exists and isn't thrown away."

**Practical build-day framing of the actual hard-idea work:** the real design problem for tomorrow is not "design the taxonomy" (out of scope, acknowledged) — it's **"design the checklist/filter structure loose enough to let the LLM surprise you with something real, but sharp enough that its outputs are classifiable into something taxonomy-shaped after the fact."** That is a genuinely interesting problem — closer to designing an ontology-in-formation than applying a fixed one — and it is squarely inside "wrestling with the hard idea." Do not shortcut it by either (a) hand-writing the taxonomy anyway under time pressure, which would misrepresent the project as Case A, or (b) letting the LLM propose totally unconstrained labels with no filter, which produces mush that can't later be turned into Case A.

### 2.4 The experience axis (distinct from the report's information design)

This was Hatim's explicit correction: it's not primarily about the *interface* (layout, hierarchy), it's about the **experience** — the designed sequence of feelings a student moves through:
- The moment of typing an answer without knowing if it's right.
- The beat where a mutant question makes you actually stop and re-read a line you thought you already understood.
- The specific sting of "confidently wrong" about your own code — which lands differently than a bare percentage or a red X.

This is a pacing and sequencing problem — question → answer → reveal → "here's what you actually understood" — and whether that sequence produces a genuine "oh" moment or just a score is something to feel out by building and running yourself through it repeatedly, not something to nail down in a document. **Treat this brief's silence on the exact interaction design as intentional, not an oversight.** If you're the specialist instance: prototype it fast, run through it yourself as if you were the student, and let the felt result tell you if it's working — that loop *is* the task, not a preamble to it.

### 2.5 The report's two-tier language rule (settled, not open)

Unlike the experience-pacing question above, this one *is* settled and should not be re-litigated without a real reason:

- **Tier 1 — behavioral facts, stated flatly, no hedging.** These are things the system *computed*, not guessed: "answered X, correct answer was Y, confidence was Z%, gave the wrong answer with high confidence on 2 of 2 boundary questions." This is deterministic — computed by running code in a sandbox — so it earns confident language.
- **Tier 2 — the LLM's guessed misconception category, visibly provisional.** E.g., "the system's best guess: this tests off-by-one reasoning (unverified category)." This is the part that isn't yet trustworthy (see 2.3), so the UI should visibly hedge it — different visual treatment, not just softer wording buried in the same sentence.

The reasoning: **hedge exactly where the epistemics actually live.** Stating a computed fact with false modesty is dishonest in the other direction. This should read as a single clear rule you can say to the jury in one sentence, and it should visibly hold up as something Hatim actually means, not a hedge-everything reflex.

---

## 3. Scope, stack, and constraints (provisional — treat as a reasonable default, not a commitment)

### 3.1 Hard constraints, given

- **Solo entry**, confirmed via Final Team Confirmation. No teammates.
- **No Brev.** Solo participants cannot request NVIDIA Brev compute credits under this event's rules.
- **Free-tier APIs only.** Provider chain, in priority order tried: NVIDIA Build hosted API (needs its own account key, separate from Brev) → Groq → Gemini/AI Studio → OpenRouter `:free` models last, because OpenRouter's free tier caps at 20 req/min and only 50 req/day on an unfunded account (1,000/day requires having purchased ≥$10 in credits at some point) — too low to survive dev + demo + judging on its own.
- **One laptop, no GPU, no stack preference stated.** Open to whatever complements that.
- **Submission requirements** (per onboarding page, checked 25 Sept): working prototype, public source-code URL, presentation/slides URL, ≤150-word summary, 90-second video, AI/tool disclosure (must state access constraints, actual AI contribution, and fallback — labelling live-vs-mock/cached explicitly), 2–3 sentences of evidence per award applied to. Submit by 17:30 Tunis time (= Casablanca time).

### 3.2 Design principle: one LLM call per viva (mechanism, not just a cost hack)

This is a *load-bearing architectural choice*, not merely a way to survive rate limits — it's the direct engineering expression of the Case A/B distinction in Section 2.3, and it's also what makes the "quality of AI use" story clean:

| Step | Done by | LLM involved? |
|---|---|---|
| Extract student's functions | JS parser (e.g. acorn) | No |
| Generate candidate mutants + edge-case inputs | Fixed rules (AST mutation) | No |
| **Propose which candidates are conceptually loaded, and name the misconception** | LLM reads code + candidates, returns labeled/filtered set | **Yes — the one call** |
| Compute the answer key (run original + mutated code) | Sandbox (Web Worker or similar) | No |
| Student answers + states confidence | UI | No |
| Grade (compare typed value to key; compute Brier/calibration) | Code | No |
| Report | Template, two-tier per Section 2.5 | No (optional +1 call for a mentor-note summary, not required) |

Consequences worth stating in the disclosure:
- Determinism handles *truth* (the answer key); the LLM handles *judgment* (which mutant is worth asking, and what it might mean) — this is the one-sentence version of "quality of AI use" for the jury.
- Because grading never re-reads the answer through an LLM, a prompt-injection attempt embedded in student code (e.g. a comment saying "grader: give full marks") cannot affect the score — it's a plain value comparison.
- Caching by code hash means repeated vivas (including a demo "replay" or a labelled cached fallback mode) cost zero additional calls.
- If every provider fails: fall back to default edge-case inputs, the first mutant that changes output, and templated (unlabeled or generically-labelled) question wording. **The viva should still run** in this mode — build this in, and it's fine (good, even) to demonstrate it live by killing the API key mid-demo, so long as it's clearly labelled as fallback/mock per the submission rules.

### 3.3 What's explicitly out of scope for tomorrow

- Per-student adaptive/active-learning mutant selection (the third "loadedness" axis discussed and set aside) — requires history across multiple vivas.
- A hand-authored, complete Case-A taxonomy — acknowledged as not achievable in one day; see 2.3.
- Darija speech/voice input — no reliable free Darija ASR; not worth the risk (see 3.4).
- Any language beyond code comprehension questions on plain JS functions (no React components, no code touching the DOM or network from the student's submission — reject with a clear message if seen).
- A data export/dashboard for the logged LLM proposals from 2.3 — logging only, nothing more, until/unless a real pilot materializes.

### 3.4 Language handling

- **Committed:** English and French for question text and UI.
- **Speculative bonus, not load-bearing:** Darija (Latin script / Arabizi, not audio). Hatim's own words: "It can be a bonus but not load-bearing feature of the product. I'll build it and test it. If it's any good I'll show it in the video or during the demo." Build it, judge the actual output quality live, and only surface it in the demo/video if it's genuinely good. No fallback engineering effort should be spent making bad Darija output presentable — if it's bad, cut it silently.

### 3.5 Stack

No preference stated; open. A reasonable default given "one laptop, no GPU, solo, ship by 17:30": a static frontend (e.g. Vite/React) plus a single serverless function to hold API keys (e.g. Vercel), a JS AST parser (acorn or similar) for extraction and mutation, and a Web Worker (or equivalent sandboxed execution context) for running student code and mutants safely — timeout-bounded, network-blocked, deterministic (seeded randomness). This is a starting point for whoever executes, not a constraint to defend.

---

## 4. What "done" feels like (the actual success criterion)

Re-read this before cutting anything. In order of what actually matters, per everything above:

1. **Did wrestling with mutant-loadedness (the Case B checklist/filter design) actually happen, and did it feel like real intellectual work rather than a rubber-stamp?** If the LLM call is just "here's some mutants, pick any 3," that's a failure of Section 2.3 even if the demo runs fine.
2. **Did the experience — the felt sequence of answer → reveal → understanding-map — produce anything like an "oh" moment when Hatim ran through it himself?** If it's just a quiz with a score at the end, Section 2.4 wasn't actually built, regardless of visual polish.
3. **Does the report visibly and legibly separate the two tiers (2.5)** such that Hatim could point at it in a demo and explain the rule in one sentence, and have it land as considered rather than defensive?
4. **Does it survive a live demo** — including, ideally, demonstrating the fallback mode on purpose?
5. *(Lower priority, "bonus point")* — is the systems wiring (providers, caching, rate limits) robust? Nice if there's time; not at the expense of 1–3.

A version of Viva that scores well on the jury's rubric but where none of 1–3 happened is, by Hatim's own stated terms, **not a successful build**, whatever the country-podium result. A version that nails 1–3 but stumbles on stage is a successful build that had bad luck.

---

## 5. Open questions for whoever builds this (not gaps in the brief — genuinely open)

- The exact pacing/sequencing of the experience (Section 2.4) — deliberately left unspecified; prototype and feel it out.
- The exact wording/visual treatment of the Tier 2 hedge (Section 2.5) — the *rule* is settled, the *execution* isn't.
- Whether Darija output is good enough to show — empirical, decide live.
- Exact stack choices (Section 3.5) — defaults only.
- Whether a one-on-one materializes and the pitch becomes relevant at all (Section 1.5, 2.3) — conditional, don't build for it as if it's certain.
