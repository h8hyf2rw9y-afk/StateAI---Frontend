import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchList } from "@/features/buyer-requirements/components/match-list";
import type { Property } from "@/features/properties/types";

const getBuyerRequirementMatchesMock = vi.fn();

vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirementMatches: (id: string) => getBuyerRequirementMatchesMock(id),
}));

const REQUIREMENT_ID = "fccd2612-01d6-526f-8932-2dc6d080708a";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "d6441069-410d-5baf-9105-f89692bceb53",
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

describe("MatchList", () => {
  it("shows a loading state before matches arrive", () => {
    getBuyerRequirementMatchesMock.mockReturnValue(new Promise(() => {}));

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    expect(screen.getByText(/loading matching properties/i)).toBeInTheDocument();
  });

  it("renders real matching properties returned by the backend, using their real ids", async () => {
    getBuyerRequirementMatchesMock.mockResolvedValue({
      ok: true,
      data: [{ property: makeProperty(), matched_preferred_features: 0, total_preferred_features: 0 }],
    });

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    const link = await screen.findByRole("link", { name: /casa valle alto/i });
    expect(link).toHaveAttribute("href", "/properties/d6441069-410d-5baf-9105-f89692bceb53");
    expect(getBuyerRequirementMatchesMock).toHaveBeenCalledWith(REQUIREMENT_ID);
  });

  it("never fabricates a match percentage — shows the real counts only when there are preferred features", async () => {
    getBuyerRequirementMatchesMock.mockResolvedValue({
      ok: true,
      data: [{ property: makeProperty(), matched_preferred_features: 2, total_preferred_features: 3 }],
    });

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    await screen.findByRole("link", { name: /casa valle alto/i });
    expect(screen.getByText("2 of 3 preferred features matched")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
  });

  it("omits the features caption entirely when the requirement has no preferred features (0 of 0)", async () => {
    getBuyerRequirementMatchesMock.mockResolvedValue({
      ok: true,
      data: [{ property: makeProperty(), matched_preferred_features: 0, total_preferred_features: 0 }],
    });

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    await screen.findByRole("link", { name: /casa valle alto/i });
    expect(screen.queryByText(/preferred features matched/i)).not.toBeInTheDocument();
  });

  it("shows the 'no matches' empty state when the backend returns none", async () => {
    getBuyerRequirementMatchesMock.mockResolvedValue({ ok: true, data: [] });

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByText(/no properties currently match this search/i)).toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getBuyerRequirementMatchesMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<MatchList requirementId={REQUIREMENT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
