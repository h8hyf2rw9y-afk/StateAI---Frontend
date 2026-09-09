import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: getSessionMock } }),
}));

// Imported after the mock above so apiRequest picks up the mocked module.
const { apiRequest } = await import("@/lib/api/client");

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: () => Promise.resolve(body),
  } as Response;
}

describe("apiRequest", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("attaches the current Supabase session's access token as a Bearer header", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "test-access-token" } } });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiRequest("/some/path");

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-access-token");
  });

  it("sends no Authorization header when signed out", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await apiRequest("/some/path");

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("returns ok:true with the parsed body on a 200", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { hello: "world" }));

    const result = await apiRequest<{ hello: string }>("/some/path");

    expect(result).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("surfaces the backend's `detail` message (FastAPI's error shape) and status on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(503, { detail: "The AI analysis service is not configured." }));

    const result = await apiRequest("/ai/lead-intelligence/abc");

    expect(result).toEqual({
      ok: false,
      error: { message: "The AI analysis service is not configured.", status: 503 },
    });
  });

  it("aborts and returns a timeout error if the request exceeds timeoutMs", async () => {
    vi.useFakeTimers();
    // A fetch that never resolves on its own — only the internal AbortController should end it.
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new DOMException("The operation was aborted.", "AbortError");
            reject(error);
          });
        })
    );

    const pending = apiRequest("/slow/path", { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("timeout");
      expect(result.error.message).toMatch(/took too long/i);
    }
  });

  it("returns a network-error message when fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await apiRequest("/some/path");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Failed to fetch");
  });
});
