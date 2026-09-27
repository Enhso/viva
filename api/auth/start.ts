// Step 1/2 of the two OAuth round-trips (01 §2, ticket 23). "Connect GitHub" and "Also include
// private repos" both navigate the browser here first, so the client secret (and the client id
// itself) never has to live in the frontend bundle — this function reads it from the server-only
// env var and redirects on to GitHub with it.
// Relative imports carry `.js` (see api/filter.ts's note; Node ESM on Vercel).
import { buildAuthorizeUrl, GITHUB_CLIENT_ID_ENV_VAR, type GithubScope } from "../../src/github/oauth.js";

interface VercelRequest {
  url?: string;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  json(body: unknown): void;
}

function isGithubScope(value: string | null): value is GithubScope {
  return value === "public_repo" || value === "repo";
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  const scopeParam = url.searchParams.get("scope");
  const scope: GithubScope = isGithubScope(scopeParam) ? scopeParam : "public_repo";

  const clientId = process.env[GITHUB_CLIENT_ID_ENV_VAR];
  if (!clientId) {
    res.status(500).json({ error: `${GITHUB_CLIENT_ID_ENV_VAR} is not set` });
    return;
  }

  const redirectUri = `${url.origin}/api/auth/callback`;
  // No server-side session to stash a CSRF nonce in (01 §1: no persistent state) — `state`
  // carries a random value plus the requested scope, and the callback checks only that GitHub
  // echoed the same value back unchanged. Ruling: this is boilerplate hygiene, not a full
  // cross-site check; a proper per-request nonce needs somewhere server-side to remember it,
  // which the ticket's "no per-student state" checkbox rules out. Cost if wrong: a forged
  // callback link could still complete an OAuth flow the same way any link click could.
  const state = `${scope}:${Math.random().toString(36).slice(2)}`;

  res.status(302).setHeader("Location", buildAuthorizeUrl({ clientId, redirectUri, scope, state }));
  res.end();
}
