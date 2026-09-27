## Response format

Respond with one JSON object and nothing else: no prose, no Markdown fences.

{
  "surviving_candidate_ids": ["<a candidate_id you were given>", "..."]
}

Every id in "surviving_candidate_ids" must be a candidate_id you were given for this function.
Do not invent an id, and do not repeat one. Omit an id to drop that candidate from the shrink; an
empty array means none of them survive.
