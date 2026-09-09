import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StageSelector } from "@/features/pipeline/components/stage-selector";
import type { Opportunity } from "@/features/pipeline/types";

const updateOpportunityStageMock = vi.fn();

vi.mock("@/lib/api/pipeline", () => ({
  updateOpportunityStage: (...args: unknown[]) => updateOpportunityStageMock(...args),
}));

// See tests/test-utils/select-stub.tsx: the real Select (base-ui, portal +
// position-tracked popup) hung indefinitely under fireEvent in jsdom — no
// existing test in this repo drives a real Select open. This stub renders
// the same component as one plain native <select>, driven with
// fireEvent.change instead.
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const OPPORTUNITY_ID = "d3c6071a-8b48-520f-b8ee-8503db845350";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID,
    organization_id: "org-1",
    contact_id: "contact-1",
    property_id: null,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "negotiation",
    title: "Casa San Jerónimo",
    description: null,
    expected_value: "3200000.00",
    currency: "MXN",
    probability: 60,
    expected_close_date: null,
    closed_at: null,
    lost_reason: null,
    owner_user_id: null,
    created_by_user_id: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

describe("StageSelector", () => {
  it("shows no Save button until the stage is actually changed", () => {
    render(<StageSelector opportunity={makeOpportunity()} onUpdated={() => {}} />);

    expect(screen.queryByRole("button", { name: /save stage/i })).not.toBeInTheDocument();
  });

  it("only offers stages valid for this opportunity's own type (buy) — never a sell-only stage like listing/marketing", () => {
    render(<StageSelector opportunity={makeOpportunity({ opportunity_type: "buy" })} onUpdated={() => {}} />);

    const stageSelect = screen.getByRole("combobox", { name: "Stage" });
    const optionLabels = Array.from(stageSelect.querySelectorAll("option")).map((o) => o.textContent);

    expect(optionLabels).toContain("Offer");
    expect(optionLabels).not.toContain("Listing");
    expect(optionLabels).not.toContain("Marketing");
  });

  it("saves a plain (non-lost) stage change without asking for a reason", async () => {
    updateOpportunityStageMock.mockResolvedValue({ ok: true, data: makeOpportunity({ stage: "offer" }) });
    const onUpdated = vi.fn();

    render(<StageSelector opportunity={makeOpportunity({ stage: "negotiation" })} onUpdated={onUpdated} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "offer" } });

    expect(screen.queryByRole("combobox", { name: "Lost reason" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save stage/i }));

    expect(updateOpportunityStageMock).toHaveBeenCalledWith(OPPORTUNITY_ID, { stage: "offer", lost_reason: null });
    await vi.waitFor(() => expect(onUpdated).toHaveBeenCalledWith(makeOpportunity({ stage: "offer" })));
  });

  it("requires a lost reason before Save becomes available when the stage is set to Lost", () => {
    render(<StageSelector opportunity={makeOpportunity({ stage: "negotiation" })} onUpdated={() => {}} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "lost" } });

    // A reason picker appears, and Save stays disabled until one is chosen.
    expect(screen.getByRole("combobox", { name: "Lost reason" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save stage/i })).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox", { name: "Lost reason" }), {
      target: { value: "chose_another_property" },
    });

    expect(screen.getByRole("button", { name: /save stage/i })).toBeEnabled();
  });

  it("sends the chosen lost_reason along with stage: lost", async () => {
    updateOpportunityStageMock.mockResolvedValue({
      ok: true,
      data: makeOpportunity({ stage: "lost", lost_reason: "price" }),
    });

    render(<StageSelector opportunity={makeOpportunity({ stage: "negotiation" })} onUpdated={() => {}} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "lost" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Lost reason" }), { target: { value: "price" } });
    fireEvent.click(screen.getByRole("button", { name: /save stage/i }));

    expect(updateOpportunityStageMock).toHaveBeenCalledWith(OPPORTUNITY_ID, { stage: "lost", lost_reason: "price" });
  });

  it("shows a friendly error message and does not call onUpdated when the save fails", async () => {
    updateOpportunityStageMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });
    const onUpdated = vi.fn();

    render(<StageSelector opportunity={makeOpportunity({ stage: "negotiation" })} onUpdated={onUpdated} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "offer" } });
    fireEvent.click(screen.getByRole("button", { name: /save stage/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("lets the stage be moved away from a closed stage (reopening) with no reason required", () => {
    render(<StageSelector opportunity={makeOpportunity({ stage: "lost", lost_reason: "price" })} onUpdated={() => {}} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "negotiation" } });

    expect(screen.queryByRole("combobox", { name: "Lost reason" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save stage/i })).toBeInTheDocument();
  });
});
