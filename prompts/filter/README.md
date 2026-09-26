# Filter prompts

- `vNNN.md` (v001, v002, …) are Hatim's: the filter/checklist wording for the filter call. A new idea gets a new file, so `/filter-lab` can compare runs. Nothing here is edited by an agent except to transcribe what Hatim dictates.
- `_output-contract.md` is plumbing: the response shape the parser expects. The harness and the app append it after the prompt text, so rewording the prompt never breaks parsing.
- The `checklist` object in the contract is an open slot. Whatever per-candidate fields a prompt asks the model to fill in appear as columns in the filter-lab table, with no code change.
- Fallback mode never reads this directory.
