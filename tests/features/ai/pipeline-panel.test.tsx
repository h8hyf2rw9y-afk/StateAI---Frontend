import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PipelinePanel } from "@/features/ai/components/pipeline-panel";
import type { AgentExecutionLatest, PipelineResult } from "@/features/ai/types";
import type { Opportunity } from "@/features/pipeline/types";

const getPipelineAnalysisMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const getLatestAgentExecutionMock = vi.fn();

vi.mock("@/lib/api/ai", () => ({
  getPipelineAnalysis: (contactId: string) => getPipelineAnalysisMock(contactId),
}));

vi.mock("@/lib/api/pipeline", () => ({
  getOpportunities: (params: unknown) => getOpportunitiesMock(params),
}));

vi.mock("@/lib/api/agent-executions", () => ({
  getLatestAgentExecution: (contactId: string, agentName: string) => getLatestAgentExecutionMock(contactId, agentName),
}));

const OPPORTUNITY_ID_1 = "opp-1";
const OPPORTUNITY_ID_2 = "opp-2";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID_1,
    organization_id: "org-1",
    contact_id: "contact-123",
    property_id: null,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "negotiation",
    title: "Casa San Jerónimo — negotiation",
    description: null,
    expected_value: "4500000.00",
    currency: "MXN",
    probability: 60,
    expected_close_date: null,
    closed_at: null,
    lost_reason: null,
    owner_user_id: null,
    created_by_user_id: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function validResult(overrides: Partial<PipelineResult["analysis"]> = {}): PipelineResult {
  return {
    contact_id: "contact-123",
    analysis: {
      overall_priority: "high",
      summary: "One active negotiation, no immediate risk.",
      opportunities: [
        {
          opportunity_id: OPPORTUNITY_ID_1,
          priority: "high",
          status_assessment: "Active and progressing.",
          reason: "Recent activity and an upcoming offer.",
          recommended_action: "negotiate",
          confidence: 0.8,
        },
      ],
      immediate_actions: [],
      risk_flags: [],
      confidence: 0.85,
      ...overrides,
    },
    model: "llama3.2",
    prompt_version: "v1",
    generated_at: "2026-09-09T00:00:00Z",
  };
}

function storedExecution(overrides: Partial<AgentExecutionLatest<PipelineResult>> = {}): AgentExecutionLatest<PipelineResult> {
  return {
    id: "exec-1",
    agent_name: "pipeline",
    contact_id: "contact-123",
    output: validResult(),
    status: "succeeded",
    created_at: "2026-09-09T00:00:00Z",
    is_stale: false,
    ...overrides,
  };
}

async function waitForIdle() {
  await waitFor(() => expect(screen.queryByText(/checking for a previous analysis/i)).not.toBeInTheDocument());
}

describe("PipelinePanel", () => {
  beforeEach(() => {
    getPipelineAnalysisMock.mockReset();
    getOpportunitiesMock.mockReset();
    getLatestAgentExecutionMock.mockReset();
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("does not call the LLM agent on mount — only the read-only restore lookup", async () => {
    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();

    expect(getPipelineAnalysisMock).not.toHaveBeenCalled();
    expect(getLatestAgentExecutionMock).toHaveBeenCalledWith("contact-123", "pipeline");
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    getPipelineAnalysisMock.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText(/analyzing pipeline/i)).toBeInTheDocument();

    resolveRequest({ ok: true, data: validResult() });
    await waitFor(() => expect(screen.queryByText(/analyzing pipeline/i)).not.toBeInTheDocument());
  });

  it("renders a successful analysis: overall priority, summary, confidence, and one opportunity", async () => {
    getPipelineAnalysisMock.mockResolvedValue({ ok: true, data: validResult() });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText(/high priority/i)).toBeInTheDocument();
    expect(screen.getByText("One active negotiation, no immediate risk.")).toBeInTheDocument();
    expect(screen.getByText("85% confidence")).toBeInTheDocument();
    expect(screen.getByText("Casa San Jerónimo — negotiation")).toBeInTheDocument();
    expect(screen.getByText(/continue negotiating/i)).toBeInTheDocument();
    expect(getPipelineAnalysisMock).toHaveBeenCalledWith("contact-123");
    expect(getOpportunitiesMock).toHaveBeenCalledWith({ contact_id: "contact-123" });
  });

  it("renders multiple opportunities independently", async () => {
    getPipelineAnalysisMock.mockResolvedValue({
      ok: true,
      data: validResult({
        opportunities: [
          {
            opportunity_id: OPPORTUNITY_ID_1,
            priority: "high",
            status_assessment: "Active.",
            reason: "Reason one.",
            recommended_action: "negotiate",
            confidence: 0.8,
          },
          {
            opportunity_id: OPPORTUNITY_ID_2,
            priority: "low",
            status_assessment: "Stalled.",
            reason: "Reason two.",
            recommended_action: "monitor",
            confidence: 0.6,
          },
        ],
      }),
    });
    getOpportunitiesMock.mockResolvedValue({
      ok: true,
      data: [makeOpportunity(), makeOpportunity({ id: OPPORTUNITY_ID_2, title: "Depto Del Valle — listing" })],
    });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText("Casa San Jerónimo — negotiation")).toBeInTheDocument();
    expect(screen.getByText("Depto Del Valle — listing")).toBeInTheDocument();
    expect(screen.getByText("Reason one.")).toBeInTheDocument();
    expect(screen.getByText("Reason two.")).toBeInTheDocument();
  });

  it("renders risk flags with their severity", async () => {
    getPipelineAnalysisMock.mockResolvedValue({
      ok: true,
      data: validResult({
        risk_flags: [
          {
            opportunity_id: OPPORTUNITY_ID_1,
            risk: "No activity in 12 days despite a high expected value.",
            reason: "Last activity was 12 days ago.",
            severity: "high",
          },
        ],
      }),
    });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText(/no activity in 12 days/i)).toBeInTheDocument();
    expect(screen.getByText(/last activity was 12 days ago/i)).toBeInTheDocument();
  });

  it("renders immediate actions with their urgency", async () => {
    getPipelineAnalysisMock.mockResolvedValue({
      ok: true,
      data: validResult({
        immediate_actions: [
          {
            opportunity_id: OPPORTUNITY_ID_1,
            action: "collect_documents",
            reason: "Financing approval is pending paperwork.",
            urgency: "urgent",
          },
        ],
      }),
    });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText(/collect documents/i)).toBeInTheDocument();
    expect(screen.getByText(/financing approval is pending paperwork/i)).toBeInTheDocument();
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
  });

  it("falls back to a generic label — never a raw UUID — when an opportunity can't be resolved", async () => {
    getPipelineAnalysisMock.mockResolvedValue({ ok: true, data: validResult() });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] }); // lookup fails/returns nothing

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByText("Opportunity")).toBeInTheDocument();
    expect(screen.queryByText(OPPORTUNITY_ID_1)).not.toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getPipelineAnalysisMock.mockResolvedValue({
      ok: false,
      error: { message: "The AI analysis service is not configured.", status: 503 },
    });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ai is currently unavailable/i);
  });

  it("shows a friendly message on an authentication failure", async () => {
    getPipelineAnalysisMock.mockResolvedValue({
      ok: false,
      error: { message: "Not authenticated.", status: 401 },
    });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("never sends an organization_id — only the contact id is passed to the API layer", async () => {
    getPipelineAnalysisMock.mockResolvedValue({ ok: true, data: validResult() });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));
    await screen.findByText(/high priority/i);

    expect(getPipelineAnalysisMock).toHaveBeenCalledWith("contact-123");
    expect(getPipelineAnalysisMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: expect.anything() })
    );
    expect(getOpportunitiesMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ organization_id: expect.anything() })
    );
  });

  it("only ever calls the read-only analysis/list endpoints — never a CRM write", async () => {
    getPipelineAnalysisMock.mockResolvedValue({ ok: true, data: validResult() });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelinePanel contactId="contact-123" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /analyze pipeline/i }));
    await screen.findByText(/high priority/i);

    // The only three API functions this component imports are all reads
    // (getPipelineAnalysis is a POST that runs an LLM call, not a CRM
    // mutation — see lib/api/ai.ts's own doc comment — getOpportunities is a
    // GET, and getLatestAgentExecution is a read of a stored AgentExecution).
    // Nothing from lib/api/tasks, lib/api/appointments, lib/api/contacts,
    // lib/api/properties, or lib/api/buyer-requirements is imported by this
    // component at all, so no CRM write is even reachable from here.
    expect(getPipelineAnalysisMock).toHaveBeenCalledWith("contact-123");
    expect(getOpportunitiesMock).toHaveBeenCalledWith({ contact_id: "contact-123" });
  });

  // --- Persistent AI Agent Results per client + smart refresh ---------------

  it("restores a previously stored pipeline analysis for this contact without calling the LLM", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution() });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelinePanel contactId="contact-123" />);

    expect(await screen.findByText("One active negotiation, no immediate risk.")).toBeInTheDocument();
    expect(getPipelineAnalysisMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /re-analyze pipeline/i })).toBeInTheDocument();
  });

  it("shows a stale banner and Refresh action when the pipeline's underlying data changed", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution({ is_stale: true }) });

    render(<PipelinePanel contactId="contact-123" />);

    expect(await screen.findByText(/new information available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh analysis/i })).toBeInTheDocument();
    expect(getPipelineAnalysisMock).not.toHaveBeenCalled();
  });
});
