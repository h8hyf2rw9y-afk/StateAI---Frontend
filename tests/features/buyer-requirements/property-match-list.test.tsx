import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PropertyMatchList } from "@/features/buyer-requirements/components/property-match-list";
import type { Property } from "@/features/properties/types";
import type { PropertyMatchAnalysis } from "@/features/buyer-requirements/types";

const getBuyerRequirementPropertyMatchesMock = vi.fn();

vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirementPropertyMatches: (...args: unknown[]) => getBuyerRequirementPropertyMatchesMock(...args),
}));

const REQUIREMENT_ID = "fccd2612-01d6-526f-8932-2dc6d080708a";
const PROPERTY_ID = "d6441069-410d-5baf-9105-f89692bceb53";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: PROPERTY_ID,
    organization_id: "org-1",
    title: "Casa Valle Alto",
    property_type: "house",
    status: "active",
    price: "4600000.00",
    currency: "MXN",
    address_line: null,
    city: "San Pedro Garza García",
    state: "Nuevo León",
    postal_code: null,
    neighborhood: "Valle Oriente",
    latitude: null,
    longitude: null,
    construction_m2: "190.00",
    land_m2: "220.00",
    bedrooms: 3,
    bathrooms: "2.0",
    parking_spaces: 2,
    description: null,
    created_at: "2026-09-08T20:33:29Z",
    updated_at: "2026-09-08T20:33:29Z",
    features: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<PropertyMatchAnalysis> = {}): PropertyMatchAnalysis {
  return {
    property: makeProperty(),
    classification: "match",
    criteria_met: ["Property type matches (house).", "Price (4600000.00 MXN) is within budget."],
    criteria_unmet: [],
    summary: "Matches all 2 specified criteria.",
    ...overrides,
  };
}

describe("PropertyMatchList", () => {
  it("shows a loading state before results arrive", () => {
    getBuyerRequirementPropertyMatchesMock.mockReturnValue(new Promise(() => {}));

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(screen.getByText(/analyzing property matches/i)).toBeInTheDocument();
  });

  it("renders a real property result, linking to its real detail page", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [makeResult()] });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    const link = await screen.findByRole("link", { name: /casa valle alto/i });
    expect(link).toHaveAttribute("href", `/properties/${PROPERTY_ID}`);
    expect(getBuyerRequirementPropertyMatchesMock).toHaveBeenCalledWith(REQUIREMENT_ID);
  });

  it("shows the empty state when the organization has no candidate properties", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [] });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByText(/no properties to compare yet/i)).toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({
      ok: false,
      error: { message: "Not authenticated.", status: 401 },
    });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("visually distinguishes match, partial match, and no match classifications", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({
      ok: true,
      data: [
        makeResult({ property: makeProperty({ id: "p1", title: "Full Match House" }), classification: "match" }),
        makeResult({
          property: makeProperty({ id: "p2", title: "Partial House" }),
          classification: "partial_match",
        }),
        makeResult({ property: makeProperty({ id: "p3", title: "No Match House" }), classification: "no_match" }),
      ],
    });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    await screen.findByText("Full Match House");
    expect(screen.getByText("Match")).toBeInTheDocument();
    expect(screen.getByText("Partial match")).toBeInTheDocument();
    expect(screen.getByText("No match")).toBeInTheDocument();
  });

  it("shows the specific criteria met and unmet, never a numeric score or percentage", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({
      ok: true,
      data: [
        makeResult({
          criteria_met: ["Property type matches (house)."],
          criteria_unmet: ["Bedrooms (2) is below the client's minimum of 3."],
        }),
      ],
    });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByText("Property type matches (house).")).toBeInTheDocument();
    expect(screen.getByText("Bedrooms (2) is below the client's minimum of 3.")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  it("shows the summary sentence for each result", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({
      ok: true,
      data: [makeResult({ summary: "Matches 3 of 5 specified criteria." })],
    });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByText("Matches 3 of 5 specified criteria.")).toBeInTheDocument();
  });

  it("never sends an organization_id — only the requirement id is passed to the API layer", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [] });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);
    await screen.findByText(/no properties to compare yet/i);

    expect(getBuyerRequirementPropertyMatchesMock).toHaveBeenCalledWith(REQUIREMENT_ID);
    expect(getBuyerRequirementPropertyMatchesMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: expect.anything() })
    );
  });
});
