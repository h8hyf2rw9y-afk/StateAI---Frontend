import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSessionMock = vi.fn();
const getSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getSession: getSessionMock,
    },
  }),
}));

const { GET } = await import("@/app/auth/callback/route");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  exchangeCodeForSessionMock.mockResolvedValue({ error: null });
  getSessionMock.mockResolvedValue({ data: { session: { access_token: "access-token" } } });
});

describe("OAuth callback invitation handling", () => {
  it("joins with the invitation code and redirects to the dashboard", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=oauth-code&invite=ABCDE-FG234"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/me/organization/join");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: "ABCDE-FG234" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("never provisions a private workspace when invitation consumption fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=oauth-code&invite=ABCDE-FG234"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/register?invite=ABCDE-FG234&invite_error=invalid"
    );
  });

  it("keeps idempotent onboarding for an existing Google login without an invitation", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=oauth-code"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/me/organization");
    expect(fetchMock.mock.calls[0][0]).not.toContain("/join");
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });
});
