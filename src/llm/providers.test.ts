import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTransientRetry } from "./providers";

describe("fetchWithTransientRetry", () => {
  afterEach(() => vi.unstubAllGlobals());

  // NVIDIA and Gemini both answered 503 "overloaded" within seconds of a success on 2026-09-27:
  // those fail fast and pass fast, so one quick retry is cheap; anything else moves the chain on.
  it("retries once after a 503 or 429, and returns the second answer", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithTransientRetry("https://example.test", {}, 0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await res.text()).toBe("ok");
  });

  it("does not retry other failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithTransientRetry("https://example.test", {}, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });
});
