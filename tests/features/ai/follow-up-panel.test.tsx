import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FollowUpPanel } from "@/features/ai/components/follow-up-panel";
import type { AgentExecutionLatest, FollowUpResult } from "@/features/ai/types";

const getFollowUpRecommendationMock = vi.fn();
const getLatestAgentExecutionMock = vi.fn();

vi.mock("@/lib/api/ai", () => ({
  getFollowUpRecommendation: (contactId: string) => getFollowUpRecommendationMock(contactId),
}));
vi.mock("@/lib/api/agent-executions", () => ({
  getLatestAgentExecution: (contactId: string, agentName: string) => getLatestAgentExecutionMock(contactId, agentName),
}));

function baseResult(overrides: Partial<FollowUpResult["recommendation"]> = {}): FollowUpResult {
  return {
    contact_id: "contact-456",
    recommendation: {
      should_follow_up: true,
      priority: "high",
      recommended_channel: "whatsapp",
      recommended_action: "send_properties",
      reason: "No contact in 6 days despite an active buyer requirement.",
      suggested_message: "Hola, ¿cómo estás? Encontré unas opciones que te podrían interesar.",
      confidence: 0.85,
      ...overrides,
    },
    model: "llama3.2",
    prompt_version: "v1",
    generated_at: "2026-09-09T00:00:00Z",
  };
}

function storedExecution(overrides: Partial<AgentExecutionLatest<FollowUpResult>> = {}): AgentExecutionLatest<FollowUpResult> {
  return {
    id: "exec-1",
    agent_name: "follow_up",
    contact_id: "contact-456",
    output: baseResult(),
    status: "succeeded",
    created_at: "2026-09-09T00:00:00Z",
    is_stale: false,
    ...overrides,
  };
}

async function waitForIdle() {
  await waitFor(() => expect(screen.queryByText(/checking for a previous recommendation/i)).not.toBeInTheDocument());
}

describe("FollowUpPanel", () => {
  beforeEach(() => {
    getFollowUpRecommendationMock.mockReset();
    getLatestAgentExecutionMock.mockReset();
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });
  });

  it("does not call the LLM agent on mount — only the read-only restore lookup", async () => {
    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();

    expect(getFollowUpRecommendationMock).not.toHaveBeenCalled();
    expect(getLatestAgentExecutionMock).toHaveBeenCalledWith("contact-456", "follow_up");
  });

  it("shows a loading state while the request is in flight", async () => {
    getFollowUpRecommendationMock.mockReturnValue(new Promise(() => {}));

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(await screen.findByText(/generating follow-up recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/may take up to a couple of minutes/i)).toBeInTheDocument();
  });

  it("renders a successful recommendation with a suggested message", async () => {
    getFollowUpRecommendationMock.mockResolvedValue({ ok: true, data: baseResult() });

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(await screen.findByText(/follow-up recommended/i)).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText(/send matching properties/i)).toBeInTheDocument();
    expect(screen.getByText(/no contact in 6 days/i)).toBeInTheDocument();
    expect(screen.getByText(/encontré unas opciones/i)).toBeInTheDocument();
    expect(screen.getByText("85% confidence")).toBeInTheDocument();
    expect(getFollowUpRecommendationMock).toHaveBeenCalledWith("contact-456");
  });

  it("shows a clear 'no message was generated' note instead of an empty box when suggested_message is null", async () => {
    getFollowUpRecommendationMock.mockResolvedValue({
      ok: true,
      data: baseResult({ suggested_message: null }),
    });

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(await screen.findByText(/no message was generated/i)).toBeInTheDocument();
  });

  it("renders 'no follow-up needed' without a priority badge when should_follow_up is false", async () => {
    getFollowUpRecommendationMock.mockResolvedValue({
      ok: true,
      data: baseResult({
        should_follow_up: false,
        recommended_channel: "none",
        recommended_action: "no_action",
        suggested_message: null,
      }),
    });

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(await screen.findByText(/no follow-up needed right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/high priority/i)).not.toBeInTheDocument();
  });

  it("shows a friendly message when the AI service is unavailable", async () => {
    getFollowUpRecommendationMock.mockResolvedValue({
      ok: false,
      error: { message: "irrelevant", status: 503 },
    });

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ai is currently unavailable/i);
  });

  // --- Persistent AI Agent Results per client + smart refresh ---------------

  it("restores a previously stored recommendation for this contact without calling the LLM", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution() });

    render(<FollowUpPanel contactId="contact-456" />);

    expect(await screen.findByText(/follow-up recommended/i)).toBeInTheDocument();
    expect(getFollowUpRecommendationMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^regenerate$/i })).toBeInTheDocument();
  });

  it("shows a stale banner and Refresh action when the underlying context changed", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: storedExecution({ is_stale: true }) });

    render(<FollowUpPanel contactId="contact-456" />);

    expect(await screen.findByText(/new information available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh analysis/i })).toBeInTheDocument();
    expect(getFollowUpRecommendationMock).not.toHaveBeenCalled();
  });

  it("stays independent from Lead Intelligence — its own stored result is keyed by agent_name too", async () => {
    getLatestAgentExecutionMock.mockResolvedValue({ ok: true, data: null });

    render(<FollowUpPanel contactId="contact-456" />);
    await waitForIdle();

    expect(getLatestAgentExecutionMock).toHaveBeenCalledWith("contact-456", "follow_up");
    expect(getLatestAgentExecutionMock).not.toHaveBeenCalledWith("contact-456", "lead_intelligence");
  });
});
