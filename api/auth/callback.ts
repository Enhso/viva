// Step 2/2 of the two OAuth round-trips (01 §2, ticket 23): GitHub redirects here with `code`
// after the student authorizes. This is the only place the client secret is used — it exchanges
// `code` for an access token server-side and hands only the token back to the browser, as a
// small self-contained HTML page (not JSON: this response *is* the browser navigation GitHub's
// redirect lands on). The client secret itself never reaches the response.
// Relative imports carry `.js` (see api/filter.ts's note; Node ESM on Vercel).
import {
  exchangeCodeForToken,
  GITHUB_CLIENT_ID_ENV_VAR,
  GITHUB_CLIENT_SECRET_ENV_VAR,
  OAuthExchangeError,
} from "../../src/github/oauth.js";
import { STORAGE_KEY } from "../../src/github/token-store.js";

interface VercelRequest {
  url?: string;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  json(body: unknown): void;
}

// Escapes the one thing a JSON string embedded in a `<script>` body needs escaped: a literal
// `</script>` sequence the token or an error message could (implausibly, but cheaply) contain.
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
}

function successPage(token: string, scope: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Connecting…</title><script>
try { sessionStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${jsonForScript(JSON.stringify({ token, scope }))}); } catch (e) {}
location.replace("/");
</script>`;
}

function errorPage(message: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Could not connect GitHub</title>
<p>GitHub sign-in did not complete: ${escapeHtml(message)}</p>
<p><a href="/">Back to Viva</a></p>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function sendHtml(res: VercelResponse, status: number, body: string): void {
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    sendHtml(res, 200, errorPage(url.searchParams.get("error_description") ?? error));
    return;
  }
  if (!code) {
    sendHtml(res, 400, errorPage("no authorization code from GitHub"));
    return;
  }

  const clientId = process.env[GITHUB_CLIENT_ID_ENV_VAR];
  const clientSecret = process.env[GITHUB_CLIENT_SECRET_ENV_VAR];
  if (!clientId || !clientSecret) {
    sendHtml(res, 500, errorPage(`${GITHUB_CLIENT_ID_ENV_VAR} / ${GITHUB_CLIENT_SECRET_ENV_VAR} not set on the server`));
    return;
  }

  const redirectUri = `${url.origin}/api/auth/callback`;

  try {
    const { token, scope } = await exchangeCodeForToken({ code, clientId, clientSecret, redirectUri });
    sendHtml(res, 200, successPage(token, scope));
  } catch (err) {
    const message = err instanceof OAuthExchangeError ? err.message : err instanceof Error ? err.message : String(err);
    sendHtml(res, 200, errorPage(message));
  }
}
