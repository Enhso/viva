import { describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, exchangeCodeForToken, OAuthExchangeError } from "./oauth";

describe("buildAuthorizeUrl", () => {
  it("carries the client id, redirect, scope, and state through to GitHub's authorize URL", () => {
    const url = new URL(
      buildAuthorizeUrl({ clientId: "abc", redirectUri: "https://viva.example/api/auth/callback", scope: "public_repo", state: "xyz" }),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("abc");
    expect(url.searchParams.get("redirect_uri")).toBe("https://viva.example/api/auth/callback");
    expect(url.searchParams.get("scope")).toBe("public_repo");
    expect(url.searchParams.get("state")).toBe("xyz");
  });
});

describe("exchangeCodeForToken", () => {
  it("returns the token and scope GitHub reports", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "tok", scope: "public_repo" }), { status: 200 }));

    const result = await exchangeCodeForToken(
      { code: "the-code", clientId: "id", clientSecret: "secret", redirectUri: "https://viva.example/api/auth/callback" },
      fetchStub,
    );

    expect(result).toEqual({ token: "tok", scope: "public_repo" });
    const [, init] = fetchStub.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ client_id: "id", client_secret: "secret", code: "the-code" });
  });

  it("classifies a granted repo scope as the private-scope tier", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "tok", scope: "repo" }), { status: 200 }));

    const result = await exchangeCodeForToken(
      { code: "c", clientId: "id", clientSecret: "secret", redirectUri: "https://viva.example/api/auth/callback" },
      fetchStub,
    );

    expect(result.scope).toBe("repo");
  });

  it("throws when GitHub reports an OAuth error", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "bad_verification_code", error_description: "expired" }), { status: 200 }));

    await expect(
      exchangeCodeForToken({ code: "c", clientId: "id", clientSecret: "secret", redirectUri: "https://viva.example/api/auth/callback" }, fetchStub),
    ).rejects.toThrow(OAuthExchangeError);
  });

  it("throws, naming the host, on a non-2xx response", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(
      exchangeCodeForToken({ code: "c", clientId: "id", clientSecret: "secret", redirectUri: "https://viva.example/api/auth/callback" }, fetchStub),
    ).rejects.toThrow(/github\.com.*500/);
  });
});
