# 10 — Later, Not Now

This is a holding pen, not a backlog to work through tomorrow. Everything
here was explicitly raised and explicitly deferred during spec review — it
exists so none of it gets accidentally built (scope creep past the 17:30
deadline) or accidentally forgotten (lost because it wasn't written down
anywhere). If build-day time somehow allows, these are listed roughly in the
order they'd matter most to the real product vision, not in priority order
for tomorrow — tomorrow's priority order is `00-master.md` §5's success
criteria, full stop.

---

## From the original brief (§3.3, unchanged)

- **Per-student adaptive/active-learning mutant selection** — the "third
  loadedness axis," requires history across multiple vivas. Not attempted.
- **A hand-authored, complete Case-A taxonomy** — acknowledged as not
  achievable in one day. Today's build is honestly Case B throughout; see
  `03-mutation-pipeline.md` §7 for the logging groundwork that makes a real
  Case A possible later.
- **Darija speech/voice input** — no reliable free Darija ASR. Not worth the
  risk. (Text-based Darija, Latin-script/Arabizi, is in scope — see
  `08-language-layer.md`. This entry is about audio input specifically.)
- **A data export/dashboard for logged LLM proposals** — logging only,
  nothing more, per `03-mutation-pipeline.md` §7.

## Raised and deferred during spec review

- **Webhook-based automatic viva triggering** — the actual product vision:
  a new viva fires automatically when a "significant" commit (or group of
  commits) lands, no student action required. Deferred to on-demand-only
  (`01-auth-ingestion.md` §1) given the 17:30 deadline and the systems-
  wiring-hours warning in brief §1.2. Building this later requires solving,
  at minimum: a webhook endpoint with signature verification, a
  commit-significance detection mechanism (see next item — this is its own
  open design question, not just infrastructure), a job queue or background
  worker (the current architecture is synchronous request/response and
  doesn't support this), and persistent per-student-per-repo state (current
  architecture has none).

- **"Significant commit" detection** — undefined even conceptually, not just
  undeferred technically. Whatever eventually decides "this commit warrants
  a new viva" wasn't specified during this interview at all — diff size?
  files touched? an LLM judgment call (which would add a call site, worth
  weighing against the one-call architecture)? This needs its own design
  pass before webhook triggering can be built, not just an engineering
  sprint.

- **Full-coverage vivas (every eligible function, always)** — the real
  target per Hatim's own stated intent ("the intent is to cover every
  eligible function"). Today's build uses student-set N selection
  (`02-selection-ordering.md` §3) as an explicit, acknowledged compromise for
  the hackathon only. The selection screen, the help box, and the
  complexity-score ordering are all things a full-coverage version simply
  wouldn't need — worth remembering this entire subsystem may become
  vestigial if/when full-coverage ships, not something to over-invest in
  polishing as if it's permanent.

- **A commit picker** (browse repo history, choose a specific past commit)
  — deferred alongside webhook triggering. Today's build always uses latest
  commit on default branch (`01-auth-ingestion.md` §4).

- **Threshold tuning for the embedding-similarity fallback**
  (`07-report.md` §6) — today's threshold (~0.85 or whatever constant is
  actually used) is an explicit placeholder, chosen without empirical
  validation. A real pilot would need actual label pairs to tune against.

- **Cross-language content beyond the current three** — the language layer
  (`08-language-layer.md`) was deliberately built as a genuine N-language
  abstraction, not a hardcoded EN/FR/Darija special case, specifically so a
  fourth language later is an additive operation, not a rearchitecture.
  Nothing to build now; noted here so the architectural intent isn't lost if
  someone unfamiliar with this spec looks at the code later and wonders why
  it's more general than three languages strictly requires.

## One open thread from the brief, deliberately left alone

- **Whether a mentor one-on-one happens, and whether the pitch (brief §1.5)
  becomes relevant at all** — explicitly conditional ("if I manage to,"
  per the brief). Not something to build for as if certain. If it happens,
  the pitch ordering itself (lead with the pain point, hold the epistemics
  in reserve for a technical juror who probes) is already fully specified in
  the brief and needs no engineering — it's a conversation, not a feature.
