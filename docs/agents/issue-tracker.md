# Issue tracker: Local Markdown

Tickets for this repo live as markdown files in `.scratch/`, committed with the code.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`. The hackathon build is one feature: `.scratch/viva/`.
- The spec is `docs/spec/` (not `.scratch/<feature>/spec.md`); tickets point into it.
- One file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, never a single combined tickets file.
- Near the top of every ticket, beneath the template's lines:
  - `**Type:** plumbing` or `**Type:** hatim` (see `CLAUDE.md`, Ownership). A ticket that mixes both gets split.
  - `**Spec:**` the sections it implements, e.g. `04 §1, 05 §2`.
- `**Status:**` uses `ready-for-agent` for plumbing and `ready-for-human` for hatim tickets, then `claimed` and `done`.
- Ticket `01` is the tracer bullet: fallback mode (`03` §6) end to end on one fixture, with no OAuth and no model.
- Rulings, comments, and conversation history append to the bottom of the file under `## Comments`.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. Hatim will normally pass the path or the ticket number directly.
