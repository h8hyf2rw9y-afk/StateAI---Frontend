import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LeadIntelligencePanel } from "@/features/ai/components/lead-intelligence-panel";
import type { AgentExecutionLatest, LeadIntelligenceResult } from "@/features/ai/types";

const getLeadIntelligenceMock = vi.fn();
const getLatestAgentExecutionMock = vi.fn();

vi.mock("@/lib/api/ai", () => ({
  getLeadIntelligence: (contactId: string) => getLeadIntelligenceMock(contactId),
}));
vi.mock("@/lib/api/agent-executions", () => ({
  getLatestAgentExecution: (contactId: string, agentName: string) => getLatestAgentExecutionMock(contactId, agentName),
}));

function validResult(overrides: Partial<LeadIntelligenceResult["analysis"]> = {}): LeadIntelligenceResult {
  return {
    contact_id: "contact-123",
    analysis: {
      priority: "high",
      confidence: 0.87,
      reasoning: "Active buyer requirement and two recent activities suggest strong intent.",
      positive_signals: ["2 activities in the last 5 days"],
      risk_signals: [],
      recommended_next_action: "call",
      insufficient_data: false,
      ...overrides,
    },
    model: "llama3.2",
    prompt_version: "v2",
    generated_at: "2026-09-09T00:00:00Z",
  };
}

function storedExecution(overrides: Partial<AgentExecutionLatest<LeadIntelligenceResult>> = {}): AgentExecutionLatest<LeadIntelligenceResult> {
  return {
    id: "exec-1",
    agent_name: "lead_intelligence",
    contact_id: "contact-123",
    output: validResult(),
    status: "succeeded",
    created_at: "2026-09-09T00:00:00Z",
    is_stale: false,
    ...overrides,
  };
}

/** Waits past the initial "checking for a previous analysis" restore effect. */
async function waitForIdle() {
  await waitFor(() => expect(screen.queryByText(/checking for a previous analysis/i)).not.toBeInTheDocument());
}

describe("LeadIntelligencePanel", () => {
  beforeEach(() => {
    getLeadIntelligenceMock.mockReset();
    getLatestAgentExecutionMock.mockReset();
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });
  });

  it("does not call the LLM agent on mount — only the read-only restore lookup", async () => {
    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();

    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
    expect(getLatestAgentExecutionMock).toHaveBeenCalledWith("contact-123", "lead_intelligence");
  });

  it("shows a loading state while the request is in flight, without freezing the UI", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    getLeadIntelligenceMock.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByText(/analyzing lead/i)).toBeInTheDocument();
    expect(screen.getByText(/may take up to a couple of minutes/i)).toBeInTheDocument();

    resolveRequest({ ok: true, data: validResult() });
    await waitFor(() => expect(screen.queryByText(/analyzing lead/i)).not.toBeInTheDocument());
  });

  it("renders a successful analysis: priority, action, reasoning, and confidence", async () => {
    getLeadIntelligenceMock.mockResolvedValue({ ok: true, data: validResult() });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByText(/high priority/i)).toBeInTheDocument();
    expect(screen.getByText(/call the client/i)).toBeInTheDocument();
    expect(screen.getByText(/active buyer requirement and two recent activities/i)).toBeInTheDocument();
    expect(screen.getByText("87% confidence")).toBeInTheDocument();
    expect(screen.getByText(/2 activities in the last 5 days/i)).toBeInTheDocument();
    expect(getLeadIntelligenceMock).toHaveBeenCalledWith("contact-123");
  });

  it("shows a friendly error message, not raw error detail, on failure", async () => {
    getLeadIntelligenceMock.mockResolvedValue({
      ok: false,
      error: { message: "The AI analysis service is not configured.", status: 503 },
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ai is currently unavailable/i);
  });

  it("shows a friendly message on an authentication failure", async () => {
    getLeadIntelligenceMock.mockResolvedValue({
      ok: false,
      error: { message: "Not authenticated.", status: 401 },
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("handles a malformed/unexpected response by surfacing the mapped error rather than crashing", async () => {
    getLeadIntelligenceMock.mockResolvedValue({
      ok: false,
      error: { message: "The AI analysis service returned an unexpected response.", status: 502 },
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected response/i);
  });

  // --- Persistent AI Agent Results per client + smart refresh ---------------

  it("restores a previously stored analysis for this contact without calling the LLM", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution() });

    render(<LeadIntelligencePanel contactId="contact-123" />);

    expect(await screen.findByText(/high priority/i)).toBeInTheDocument();
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /re-analyze lead/i })).toBeInTheDocument();
    expect(screen.queryByText(/new information available/i)).not.toBeInTheDocument();
  });

  it("shows a 'new information available' banner and a Refresh action when the stored result is stale", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution({ is_stale: true }) });

    render(<LeadIntelligencePanel contactId="contact-123" />);

    expect(await screen.findByText(/new information available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh analysis/i })).toBeInTheDocument();
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
  });

  it("clicking Refresh on a stale result runs a real new analysis and clears the stale banner", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution({ is_stale: true }) });
    getLeadIntelligenceMock.mockResolvedValue({
      ok: true,
      data: validResult({ reasoning: "Freshly refreshed reasoning." }),
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    fireEvent.click(await screen.findByRole("button", { name: /refresh analysis/i }));

    expect(await screen.findByText("Freshly refreshed reasoning.")).toBeInTheDocument();
    expect(screen.queryByText(/new information available/i)).not.toBeInTheDocument();
    expect(getLeadIntelligenceMock).toHaveBeenCalledWith("contact-123");
  });

  it("shows the empty state (not an error, not a stale banner) when this contact has never been analyzed", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    await waitForIdle();

    expect(screen.getByText(/get an ai read on how important this lead is/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^analyze lead$/i })).toBeInTheDocument();
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
  });

  it("switching contacts (a remount keyed by contactId, as app/(dashboard)/ai-assistant/page.tsx does) restores the new contact's own result, not the previous one", async () => {
    getLatestAgentExecutionMock.mockImplementation((contactId: string) =>
      Promise.resolve(
        contactId === "contact-A"
          ? { ok: true, data: storedExecution({ contact_id: "contact-A", output: validResult({ reasoning: "Reasoning for A." }) }) }
          : { ok: true, data: null }
      )
    );

    const { rerender } = render(<LeadIntelligencePanel key="contact-A" contactId="contact-A" />);
    expect(await screen.findByText("Reasoning for A.")).toBeInTheDocument();

    // `key` changing is what actually happens at the real call site on a
    // client switch — this unmounts the old instance (and its "Reasoning
    // for A." state) in the same commit that mounts a brand new one, so
    // there's no intermediate render where both could coexist.
    rerender(<LeadIntelligencePanel key="contact-B" contactId="contact-B" />);

    // Client B's empty state must show — Client A's reasoning must never linger.
    expect(screen.queryByText("Reasoning for A.")).not.toBeInTheDocument();
    expect(await screen.findByText(/get an ai read on how important this lead is/i)).toBeInTheDocument();
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
  });
});
