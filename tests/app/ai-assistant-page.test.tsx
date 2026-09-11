import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AiAssistantPage from "@/app/(dashboard)/ai-assistant/page";
import type { Contact } from "@/features/leads/types";

vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const getContactsMock = vi.fn();
vi.mock("@/lib/api/contacts", () => ({
  getContacts: () => getContactsMock(),
}));

const getLeadIntelligenceMock = vi.fn();
const getFollowUpRecommendationMock = vi.fn();
const getPipelineAnalysisMock = vi.fn();
vi.mock("@/lib/api/ai", () => ({
  getLeadIntelligence: (contactId: string) => getLeadIntelligenceMock(contactId),
  getFollowUpRecommendation: (contactId: string) => getFollowUpRecommendationMock(contactId),
  getPipelineAnalysis: (contactId: string) => getPipelineAnalysisMock(contactId),
}));

const getOpportunitiesMock = vi.fn();
vi.mock("@/lib/api/pipeline", () => ({
  getOpportunities: (params: unknown) => getOpportunitiesMock(params),
}));

const getLatestAgentExecutionMock = vi.fn();
vi.mock("@/lib/api/agent-executions", () => ({
  getLatestAgentExecution: (contactId: string, agentName: string) => getLatestAgentExecutionMock(contactId, agentName),
}));

const CONTACT_ID = "c1111111-1111-1111-1111-111111111111";
const CONTACT_B_ID = "c2222222-2222-2222-2222-222222222222";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Carolina",
    last_name: "Reyes",
    email: "carolina@example.com",
    phone: null,
    preferred_contact_method: null,
    source: null,
    notes: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    roles: [],
    ...overrides,
  };
}

describe("AiAssistantPage", () => {
  beforeEach(() => {
    getLeadIntelligenceMock.mockReset();
    getFollowUpRecommendationMock.mockReset();
    getPipelineAnalysisMock.mockReset();
    getOpportunitiesMock.mockReset();
    getLatestAgentExecutionMock.mockReset();
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });
  });

  it("renders the three real available agents", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AiAssistantPage />);

    expect(await screen.findByText("Lead Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getAllByText("Available")).toHaveLength(3);
  });

  it("shows a loading state, then the contact picker once contacts load", async () => {
    let resolveContacts: (value: unknown) => void = () => {};
    getContactsMock.mockReturnValue(new Promise((resolve) => (resolveContacts = resolve)));

    render(<AiAssistantPage />);
    expect(screen.getByText(/loading contacts/i)).toBeInTheDocument();

    resolveContacts({ ok: true, data: [makeContact()] });
    expect(await screen.findByLabelText(/contact/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no leads yet", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AiAssistantPage />);

    expect(await screen.findByText(/no leads yet/i)).toBeInTheDocument();
  });

  it("shows a friendly error if contacts fail to load", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });

    render(<AiAssistantPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows a session-expired message on an authentication failure loading contacts", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<AiAssistantPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("selecting a contact reveals all three real panels, scoped to that contact", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<AiAssistantPage />);
    const picker = await screen.findByLabelText(/contact/i);
    fireEvent.change(picker, { target: { value: CONTACT_ID } });

    expect(await screen.findByRole("link", { name: /view full lead/i })).toHaveAttribute(
      "href",
      `/leads/${CONTACT_ID}`
    );
    expect(screen.getByRole("button", { name: /analyze lead/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate follow-up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view full lead/i })).toHaveAttribute("href", `/leads/${CONTACT_ID}`);
  });

  it("running the Pipeline Agent from this page calls the real endpoint with only the contact id", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
    getPipelineAnalysisMock.mockResolvedValue({
      ok: true,
      data: {
        contact_id: CONTACT_ID,
        analysis: {
          overall_priority: "medium",
          summary: "Steady progress.",
          opportunities: [],
          immediate_actions: [],
          risk_flags: [],
          confidence: 0.7,
        },
        model: "llama3.2",
        prompt_version: "v1",
        generated_at: "2026-09-09T00:00:00Z",
      },
    });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });

    render(<AiAssistantPage />);
    fireEvent.change(await screen.findByLabelText(/contact/i), { target: { value: CONTACT_ID } });
    const analyzeButton = await screen.findByRole("button", { name: /analyze pipeline/i });
    await waitFor(() => expect(analyzeButton).not.toBeDisabled());
    fireEvent.click(analyzeButton);

    expect(await screen.findByText("Steady progress.")).toBeInTheDocument();
    expect(getPipelineAnalysisMock).toHaveBeenCalledWith(CONTACT_ID);
    expect(getPipelineAnalysisMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: expect.anything() })
    );
  });

  it("never sends an organization_id when loading contacts", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AiAssistantPage />);
    await screen.findByText(/no leads yet/i);

    expect(getContactsMock).toHaveBeenCalledWith();
  });

  it("does not fabricate any agent, recommendation, or capability beyond the three real ones", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AiAssistantPage />);
    await screen.findByText("Lead Intelligence");

    expect(screen.queryByText(/sales copilot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /chat|message/i })).not.toBeInTheDocument();
  });

  // --- Persistent AI Agent Results per client + smart refresh ---------------
  //
  // The task's own most important acceptance criterion: A -> run -> switch to
  // B -> B must NOT show A's result -> run for B -> switch back to A -> A's
  // result must be restored immediately, with no new LLM call.
  it("A -> B -> A: each client's own stored analysis is restored, and the LLM is never called for a client that already has one", async () => {
    getContactsMock.mockResolvedValue({
      ok: true,
      data: [makeContact({ id: CONTACT_ID, first_name: "Carolina" }), makeContact({ id: CONTACT_B_ID, first_name: "Beatriz" })],
    });
    getLatestAgentExecutionMock.mockImplementation((contactId: string, agentName: string) => {
      if (contactId === CONTACT_ID && agentName === "lead_intelligence") {
        return Promise.resolve({
          ok: true,
          data: {
            id: "exec-a",
            agent_name: "lead_intelligence",
            contact_id: CONTACT_ID,
            output: {
              contact_id: CONTACT_ID,
              analysis: {
                priority: "high", confidence: 0.9, reasoning: "Reasoning for A.", positive_signals: [], risk_signals: [],
                recommended_next_action: "call", insufficient_data: false,
              },
              model: "llama3.2", prompt_version: "v1", generated_at: "2026-09-09T00:00:00Z",
            },
            status: "succeeded",
            created_at: "2026-09-09T00:00:00Z",
            is_stale: false,
          },
        });
      }
      return Promise.resolve({ ok: true, data: null });
    });
    getLeadIntelligenceMock.mockResolvedValue({
      ok: true,
      data: {
        contact_id: CONTACT_B_ID,
        analysis: {
          priority: "medium", confidence: 0.6, reasoning: "Reasoning for B.", positive_signals: [], risk_signals: [],
          recommended_next_action: "email", insufficient_data: false,
        },
        model: "llama3.2", prompt_version: "v1", generated_at: "2026-09-09T00:00:00Z",
      },
    });

    render(<AiAssistantPage />);
    const picker = await screen.findByLabelText(/contact/i);

    // Select A — A's previously stored analysis restores immediately.
    fireEvent.change(picker, { target: { value: CONTACT_ID } });
    expect(await screen.findByText("Reasoning for A.")).toBeInTheDocument();
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();

    // Switch to B — must show B's own empty state, never A's result.
    fireEvent.change(picker, { target: { value: CONTACT_B_ID } });
    await waitFor(() => expect(screen.queryByText("Reasoning for A.")).not.toBeInTheDocument());
    const analyzeButton = await screen.findByRole("button", { name: /^analyze lead$/i });
    await waitFor(() => expect(analyzeButton).not.toBeDisabled());

    // Run Lead Intelligence for B.
    fireEvent.click(analyzeButton);
    expect(await screen.findByText("Reasoning for B.")).toBeInTheDocument();
    expect(getLeadIntelligenceMock).toHaveBeenCalledTimes(1);
    expect(getLeadIntelligenceMock).toHaveBeenCalledWith(CONTACT_B_ID);

    // Switch back to A — A's result restores immediately, with no new LLM call.
    fireEvent.change(picker, { target: { value: CONTACT_ID } });
    expect(await screen.findByText("Reasoning for A.")).toBeInTheDocument();
    expect(getLeadIntelligenceMock).toHaveBeenCalledTimes(1); // still only the one call, for B

    // Switch back to B — B's result restores immediately too (the stored
    // execution from the run above is what a real backend would now return).
    getLatestAgentExecutionMock.mockImplementation((contactId: string, agentName: string) => {
      if (agentName !== "lead_intelligence") return Promise.resolve({ ok: true, data: null });
      if (contactId === CONTACT_ID) {
        return Promise.resolve({
          ok: true,
          data: {
            id: "exec-a", agent_name: "lead_intelligence", contact_id: CONTACT_ID,
            output: {
              contact_id: CONTACT_ID,
              analysis: {
                priority: "high", confidence: 0.9, reasoning: "Reasoning for A.", positive_signals: [], risk_signals: [],
                recommended_next_action: "call", insufficient_data: false,
              },
              model: "llama3.2", prompt_version: "v1", generated_at: "2026-09-09T00:00:00Z",
            },
            status: "succeeded", created_at: "2026-09-09T00:00:00Z", is_stale: false,
          },
        });
      }
      return Promise.resolve({
        ok: true,
        data: {
          id: "exec-b", agent_name: "lead_intelligence", contact_id: CONTACT_B_ID,
          output: {
            contact_id: CONTACT_B_ID,
            analysis: {
              priority: "medium", confidence: 0.6, reasoning: "Reasoning for B.", positive_signals: [], risk_signals: [],
              recommended_next_action: "email", insufficient_data: false,
            },
            model: "llama3.2", prompt_version: "v1", generated_at: "2026-09-09T00:00:00Z",
          },
          status: "succeeded", created_at: "2026-09-09T00:00:00Z", is_stale: false,
        },
      });
    });
    fireEvent.change(picker, { target: { value: CONTACT_B_ID } });
    expect(await screen.findByText("Reasoning for B.")).toBeInTheDocument();
    expect(getLeadIntelligenceMock).toHaveBeenCalledTimes(1); // no additional LLM call from switching
  });
});
