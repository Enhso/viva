---
name: filter-lab
description: Run the fixture corpus through the current filter prompt and publish a comparison table for Hatim.
disable-model-invocation: true
argument-hint: "[vNNN] [--compare vMMM] [--only <fixture>] [--provider <name>]"
---

The filter lab is Hatim's instrument for designing the filter/checklist (brief §2.3, spec `03` §1–2). The table is the product; Hatim reads it and decides. Your part is a faithful run and a legible table.

## 1. Resolve the run

- Prompt: the version passed as an argument, else the highest `prompts/filter/vNNN.md`. None exists: tell Hatim the lab needs his first prompt and stop.
- Compare: `--compare` if passed, else the previous version when one exists.
- Every `.js` file under `fixtures/functions/bootcamp/` and `fixtures/functions/own/`, or only `--only`.

## 2. Make sure the harness exists

The harness is `scripts/filter-lab.mjs`, run as `npm run filter-lab -- <args>`. If it's missing or broken, build or fix it first (plumbing) to this contract:

- Extract functions and generate candidate mutants with `src/engine/`; call the filter through `src/llm/` with the prompt file's text followed by `prompts/filter/_output-contract.md`.
- One viva per fixture file, so one filter call per fixture.
- Cache each response at `.scratch/filter-lab/cache/<sha256>.json`, keyed by prompt text + contract text + fixture source + model id, so a re-run only spends calls on what changed. Free tiers are small (OpenRouter's unfunded tier allows 50 requests a day).
- When the answer-key engine exists, run the distinguish check on every candidate the filter marked `loaded` and flag the equivalent ones.
- Also run the scope check on `fixtures/functions/out-of-scope/` and record whether each file was rejected with a reason.
- Write `.scratch/filter-lab/<version>/results.json`, and append one row per candidate to `logs/candidates.csv` with columns `code_hash,candidate_label,survived_filter,question_asked,prompt_version,source` (`question_asked=false`, `source=lab`).

A provider failure ends the run with the error and host shown. Fallback mode stays out of the lab: a lab run with no model has nothing to show.

## 3. Publish the table

Publish, or update in place, an artifact titled `Filter lab <version>`:

- Header: prompt version, compare version, provider and model, and counts: candidates, loaded, rejected, loaded-but-equivalent.
- Per fixture: the source (collapsed), then one row per candidate: rule · one-line diff · verdict · label · reason · every `checklist` field the model returned, as columns.
- Against the compare version, mark each row NEW-LOADED, NEWLY-REJECTED, or RELABELED.
- Label census: every distinct label this run, with its count, marked NEW when absent from the compare run.
- Scope check: each out-of-scope fixture with rejected yes/no and the reason shown.

If artifacts are unavailable in the session, write the same content as `.scratch/filter-lab/<version>/report.md`.

## 4. Report in chat

Three lines at most: the artifact link (or report path), the counts, and any fixture that errored. The table carries the rest; judging which labels are good is Hatim's read.

## Prompt files

`prompts/filter/v*.md` belong to Hatim. Write one only when he dictates its content, and write what he said.
