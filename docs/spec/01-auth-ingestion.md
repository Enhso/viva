# 01 — Auth & Ingestion

Depends on: nothing (this is the entry point).
Feeds into: `02-selection-ordering.md`.

---

## 1. Trigger model: on-demand, not webhook

**Decision:** A viva is generated only when the student explicitly requests
one. No webhook listener, no polling loop, no persistent "last-seen-commit"
state per student per repo.

**Why (context for Claude Code, not a thing to re-litigate):** Webhook-based
triggering ("a new viva fires automatically on every significant commit") is
the *actual product vision* — see `10-later-not-now.md`. It was explicitly
downgraded to on-demand for the hackathon build given the 17:30 deadline.
"Commit-triggered" for tomorrow means *"a viva is generated from a specific
commit the student points at,"* not *"a commit event fires a viva
automatically."*

This eliminates: webhook endpoint, signature verification, a job
queue/background worker, and any persistent state beyond a single
request/response cycle. Ingestion is a synchronous(-ish) flow: student
clicks → OAuth if needed → pick repo → pick nothing else (latest commit,
default branch, see §4) → fetch → extract → hand off to selection screen.

## 2. OAuth: dual-scope, two round-trips

**Decision:** Default GitHub OAuth scope is `public_repo` (read + list public
repos). A **separate, explicit** second consent step offers to upgrade to
full `repo` scope (read + list all repos, public and private) if the student
wants private repos included.

**These are two distinct GitHub OAuth authorization flows, not one flow with
a toggle.** GitHub does not support requesting a narrower scope and silently
upgrading it later inside an already-granted session — a scope change means
re-running the entire OAuth redirect with the new scope requested. Build
this as:

1. "Connect GitHub" button → OAuth flow with `scope=public_repo` → student
   lands back in-app with public repos listable.
2. A separate, clearly-labeled "Also include private repos" action,
   presented as its own step (not bundled into step 1's button or copy) →
   OAuth flow with `scope=repo` → student lands back in-app, now with
   private repos also listable.

**Known caveat, worth surfacing in the disclosure doc (`09-disclosure.md`):**
GitHub's `repo` scope is *not* read-only — it grants read **and write**
access to repositories. There is no narrower GitHub scope that grants
read-only access to private repos. Viva only ever reads (never writes,
never creates commits/PRs/comments) — the write grant is unused. State this
explicitly in the disclosure so a technical juror inspecting the OAuth
consent screen doesn't wonder why a code-comprehension quiz asked for write
access.

## 3. Repo listing

After either OAuth step succeeds, list the student's repos (respecting
whichever scope is currently granted) so they pick from a list — not a
paste-a-URL flow. Standard GitHub API repo-listing call
(`GET /user/repos` or equivalent), filtered/sorted however is convenient
(e.g., most-recently-pushed first, since that's the most likely one they
want to demo).

## 4. Commit selection: latest on default branch only

**Decision:** No commit picker for tomorrow. Viva always uses the latest
commit on the repo's default branch (`main`/`master`/whatever GitHub reports
as default).

A commit picker (browse recent commit history, pick a specific one) is
deferred alongside webhook triggering — see `10-later-not-now.md`. Don't
build UI affordance for it; it would suggest a feature that doesn't exist.

## 5. What gets fetched and parsed

- Fetch the repo tree at the selected commit (latest, default branch).
- Scope restriction, from brief §3.3, **still fully in force**: plain JS
  functions only. No React components, nothing touching the DOM or network
  from the student's submission. **Reject with a clear message if seen** —
  this isn't a silent skip, the student should know why a file/function was
  excluded.
- Parse with a JS AST parser (acorn or equivalent — brief's suggestion,
  no reason to deviate) to extract function declarations across the fetched
  files.
- Each extracted function needs, at minimum: its full source text, its
  signature, and its docstring/JSDoc if present (see §6).
- Functions that call other user-defined functions vs. functions that don't
  (leaf functions) both matter downstream for ordering — see
  `02-selection-ordering.md` for how ordering actually works (complexity
  proxy, not call-graph position, per the resolved Q2/Q9 discussion — but
  call-graph position may still be worth computing as an available signal;
  see that doc).

## 6. Docstring handling (feeds the selection-screen function cards)

- **Signature is always shown**, docstring or not.
- If a docstring/JSDoc comment exists, show it under the signature.
- If it doesn't exist, **say so explicitly and plainly** (e.g., "no
  docstring provided," muted styling, not an error state) — don't fall back
  to any heuristic (e.g., grabbing the function body's first line) as a
  stand-in description. That was considered and explicitly rejected: a
  first-line-of-body heuristic is unreliable (often a guard clause, not a
  summary) and risks misleading the student before they've even started.
- **Do not use an LLM to generate a description for functions lacking a
  docstring.** This was a real design fork, not an oversight: an
  LLM-written gloss would do part of the reading-comprehension work the
  exam itself is supposed to test, undermining the whole premise. If a
  student used an LLM to write their docstrings in the first place, that's
  a fact about their own code, on them to reckon with — not something Viva
  should paper over or flag.

## 7. What this hands off

To `02-selection-ordering.md`: a list of extracted, eligible functions per
selected commit, each with {source, signature, docstring-or-absence-flag},
ready for complexity scoring and display on the selection screen.
