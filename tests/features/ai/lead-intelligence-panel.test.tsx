import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LeadIntelligencePanel } from "@/features/ai/components/lead-intelligence-panel";
import type { LeadIntelligenceResult } from "@/features/ai/types";

const getLeadIntelligenceMock = vi.fn();

vi.mock("@/lib/api/ai", () => ({
  getLeadIntelligence: (contactId: string) => getLeadIntelligenceMock(contactId),
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

describe("LeadIntelligencePanel", () => {
  it("does not call the API on mount — only on explicit user interaction", () => {
    render(<LeadIntelligencePanel contactId="contact-123" />);
    expect(getLeadIntelligenceMock).not.toHaveBeenCalled();
  });

  it("shows a loading state while the request is in flight, without freezing the UI", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    getLeadIntelligenceMock.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));

    render(<LeadIntelligencePanel contactId="contact-123" />);
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByText(/analyzing lead/i)).toBeInTheDocument();
    expect(screen.getByText(/may take up to a couple of minutes/i)).toBeInTheDocument();

    resolveRequest({ ok: true, data: validResult() });
    await waitFor(() => expect(screen.queryByText(/analyzing lead/i)).not.toBeInTheDocument());
  });

  it("renders a successful analysis: priority, action, reasoning, and confidence", async () => {
    getLeadIntelligenceMock.mockResolvedValue({ ok: true, data: validResult() });

    render(<LeadIntelligencePanel contactId="contact-123" />);
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
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ai is currently unavailable/i);
  });

  it("shows a friendly message on an authentication failure", async () => {
    getLeadIntelligenceMock.mockResolvedValue({
      ok: false,
      error: { message: "Not authenticated.", status: 401 },
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("handles a malformed/unexpected response by surfacing the mapped error rather than crashing", async () => {
    getLeadIntelligenceMock.mockResolvedValue({
      ok: false,
      error: { message: "The AI analysis service returned an unexpected response.", status: 502 },
    });

    render(<LeadIntelligencePanel contactId="contact-123" />);
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected response/i);
  });
});
