// The two OAuth round-trips (01 §2): building the authorize redirect and exchanging the
// callback's `code` for an access token. Pure request-shaping/parsing — no env reads here, so
// it's usable from both `api/auth/start.ts` and `api/auth/callback.ts` and testable with a
// stubbed `fetch` (ticket 23: the callback handler is exercised directly with one).
//
// Hatim must confirm these names: the prerequisite (Vercel env vars holding the GitHub OAuth
// App's client id/secret) states that they exist but not what they're called. `GITHUB_CLIENT_ID`
// and `GITHUB_CLIENT_SECRET` are this ticket's guess, each named once, here.
export const GITHUB_CLIENT_ID_ENV_VAR = "GITHUB_CLIENT_ID";
export const GITHUB_CLIENT_SECRET_ENV_VAR = "GITHUB_CLIENT_SECRET";

export type GithubScope = "public_repo" | "repo";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";

export function buildAuthorizeUrl(options: { clientId: string; redirectUri: string; scope: GithubScope; state: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("scope", options.scope);
  url.searchParams.set("state", options.state);
  return url.toString();
}

export class OAuthExchangeError extends Error {}

/**
 * The client secret is used here, server-side only (`api/auth/callback.ts`), and never returned
 * to the caller — only the resulting access token is. `fetchImpl` defaults to the global `fetch`
 * so a test can inject a stub without touching global state.
 */
export async function exchangeCodeForToken(
  options: { code: string; clientId: string; clientSecret: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ token: string; scope: GithubScope }> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      code: options.code,
      redirect_uri: options.redirectUri,
    }),
  });
  if (!res.ok) throw new OAuthExchangeError(`github.com/login/oauth/access_token ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token?: string; scope?: string; error?: string; error_description?: string };
  if (data.error) throw new OAuthExchangeError(`GitHub OAuth error: ${data.error_description ?? data.error}`);
  if (typeof data.access_token !== "string") throw new OAuthExchangeError("token response missing access_token");
  const grantedScopes = (data.scope ?? "").split(",").map((s) => s.trim());
  const scope: GithubScope = grantedScopes.includes("repo") ? "repo" : "public_repo";
  return { token: data.access_token, scope };
}
