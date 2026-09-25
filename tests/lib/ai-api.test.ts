import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock, waitForAgentExecutionMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  waitForAgentExecutionMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ apiRequest: apiRequestMock }));
vi.mock("@/lib/api/agent-executions", () => ({ waitForAgentExecution: waitForAgentExecutionMock }));

const { getLeadIntelligence } = await import("@/lib/api/ai");

describe("AI API execution safety", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    waitForAgentExecutionMock.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "request-uuid-12345678" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sends an idempotency key with every agent request", async () => {
    apiRequestMock.mockResolvedValue({ ok: true, data: { priority: "high" } });

    await getLeadIntelligence("contact-123");

    expect(apiRequestMock).toHaveBeenCalledWith("/api/v1/ai/lead-intelligence/contact-123", {
      method: "POST",
      timeoutMs: 260_000,
      headers: { "Idempotency-Key": "request-uuid-12345678" },
    });
  });

  it("follows the existing execution when the backend returns 202", async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      data: { status: "running", execution_id: "execution-123", retry_after_seconds: 3 },
    });
    waitForAgentExecutionMock.mockResolvedValue({ ok: true, data: { priority: "medium" } });

    const result = await getLeadIntelligence("contact-123");

    expect(waitForAgentExecutionMock).toHaveBeenCalledWith("execution-123", 3);
    expect(result).toEqual({ ok: true, data: { priority: "medium" } });
  });
});
