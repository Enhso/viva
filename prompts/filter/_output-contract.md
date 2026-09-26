## Response format

Respond with one JSON object and nothing else: no prose, no Markdown fences.

{
  "functions": [
    {
      "function_id": "<the function_id you were given>",
      "candidates": [
        {
          "candidate_id": "<the candidate_id you were given>",
          "verdict": "loaded" | "rejected",
          "label": "<short noun phrase naming the misconception; required when verdict is loaded>",
          "reason": "<one sentence>",
          "checklist": { }
        }
      ]
    }
  ]
}

Every function_id and candidate_id you were given appears exactly once. Put any additional per-candidate judgments the instructions above ask for inside "checklist", as flat key/value pairs.
