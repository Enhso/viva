// Ticket 23: the callback handler exercised directly, with a stubbed `fetch` standing in for
// GitHub's token endpoint — no real network call, no real client secret needed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./callback";

function fakeRes() {
  const calls: { status?: number; headers: Record<string, string>; body?: string; json?: unknown } = { headers: {} };
  const res = {
    status(code: number) {
      calls.status = code;
      return res;
    },
    setHeader(name: string, value: string) {
      calls.headers[name] = value;
    },
    end(body?: string) {
      calls.body = body;
    },
    json(body: unknown) {
      calls.json = body;
    },
  };
  return { res, calls };
}

describe("api/auth/callback", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("exchanges the code and hands the token to the browser via sessionStorage, never the secret", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "the-token", scope: "public_repo" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchStub);

    const { res, calls } = fakeRes();
    await handler({ url: "/api/auth/callback?code=abc123&state=public_repo:xyz" }, res);

    expect(calls.status).toBe(200);
    expect(calls.headers["Content-Type"]).toContain("text/html");
    expect(calls.body).toContain("the-token");
    expect(calls.body).not.toContain("test-client-secret");

    // The secret was sent to GitHub, server-side, but never appears in the response body.
    const [, init] = fetchStub.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ client_secret: "test-client-secret", code: "abc123" });
  });

  it("shows an error page, not a hard failure, when GitHub reports an error", async () => {
    const { res, calls } = fakeRes();
    await handler({ url: "/api/auth/callback?error=access_denied&error_description=user+declined" }, res);

    expect(calls.status).toBe(200);
    expect(calls.body).toContain("user declined");
  });

  it("responds 400 when GitHub sends no code and no error", async () => {
    const { res, calls } = fakeRes();
    await handler({ url: "/api/auth/callback" }, res);

    expect(calls.status).toBe(400);
  });

  it("reports missing server env vars instead of throwing", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    const { res, calls } = fakeRes();
    await handler({ url: "/api/auth/callback?code=abc" }, res);

    expect(calls.status).toBe(500);
    expect(calls.body).toContain("GITHUB_CLIENT_ID");
  });

  it("shows an error page when the token exchange itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const { res, calls } = fakeRes();
    await handler({ url: "/api/auth/callback?code=abc" }, res);

    expect(calls.status).toBe(200);
    expect(calls.body).toContain("github.com");
  });
});
