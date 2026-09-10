import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const CONTACT_ID = "c1111111-1111-1111-1111-111111111111";

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
    fireEvent.click(await screen.findByRole("button", { name: /analyze pipeline/i }));

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
});
