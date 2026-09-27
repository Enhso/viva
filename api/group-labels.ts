// The label-grouping call's serverless endpoint (07 §6, ticket 22). Holds the Jev and Gemini
// keys; the browser sends this viva's distinct taxonomy labels and gets back which mechanism
// grouped them (Jev, embedding-similarity, or exact-text) plus the label -> group-key map the
// report merges groups by. Relative imports carry `.js` (ticket 06 packaging Ruling).
import { runLabelGrouping } from "../src/llm/grouping.js";
import type { LabelGroupingResult } from "../src/llm/label-grouping.js";

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

function isLabelsBody(value: unknown): value is { labels: string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { labels?: unknown }).labels) &&
    (value as { labels: unknown[] }).labels.every((label) => typeof label === "string")
  );
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method && req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const rawBody = typeof req.body === "string" ? safeJsonParse(req.body) : req.body;
  if (!isLabelsBody(rawBody)) {
    res.status(400).json({ error: 'expected a JSON body of the shape { labels: string[] }' });
    return;
  }

  // runLabelGrouping never throws (07 §6 checklist: the report always renders) -- Jev and
  // embedding failures are caught internally and recorded in `failures`, ending at exact-text.
  const result: LabelGroupingResult = await runLabelGrouping(rawBody.labels);
  res.status(200).json(result);
}
