import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PropertyMatchList } from "@/features/buyer-requirements/components/property-match-list";
import type { Property } from "@/features/properties/types";
import type { PropertyMatchAnalysis, PropertyInterest } from "@/features/buyer-requirements/types";

const getBuyerRequirementPropertyMatchesMock = vi.fn();
const createPropertyInterestMock = vi.fn();

vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirementPropertyMatches: (...args: unknown[]) => getBuyerRequirementPropertyMatchesMock(...args),
}));
vi.mock("@/lib/api/property-interests", () => ({
  createPropertyInterest: (...args: unknown[]) => createPropertyInterestMock(...args),
}));

const REQUIREMENT_ID = "fccd2612-01d6-526f-8932-2dc6d080708a";
const PROPERTY_ID = "d6441069-410d-5baf-9105-f89692bceb53";
const CONTACT_ID = "a480e9eb-626a-5f08-bf51-553ceb4e7f2c";

function makeInterest(overrides: Partial<PropertyInterest> = {}): PropertyInterest {
  return {
    id: "interest-1",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: PROPERTY_ID,
    status: "new",
    source: null,
    notes: null,
    first_contact_at: null,
    last_contact_at: null,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

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
    ownership_type: "own",
    external_source: null,
    external_advisor_name: null,
    external_advisor_contact: null,
    collaboration_status: null,
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
  beforeEach(() => {
    createPropertyInterestMock.mockReset();
  });

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

  it("does not show an Assign button when no contactId is given (read-only context)", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [makeResult()] });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} />);

    await screen.findByText("Casa Valle Alto");
    expect(screen.queryByRole("button", { name: /assign to client/i })).not.toBeInTheDocument();
  });

  it("lets the advisor manually assign a matched property to the buyer", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [makeResult()] });
    createPropertyInterestMock.mockResolvedValue({ ok: true, data: makeInterest() });
    const onAssigned = vi.fn();

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} contactId={CONTACT_ID} onAssigned={onAssigned} />);

    const button = await screen.findByRole("button", { name: /assign to client/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(createPropertyInterestMock).toHaveBeenCalledWith(CONTACT_ID, { property_id: PROPERTY_ID, status: "new" })
    );
    await waitFor(() => expect(onAssigned).toHaveBeenCalled());
  });

  it("shows 'Assigned to client' instead of a button for a property already interested-in", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [makeResult()] });

    render(
      <PropertyMatchList
        requirementId={REQUIREMENT_ID}
        contactId={CONTACT_ID}
        existingInterests={[makeInterest({ property_id: PROPERTY_ID })]}
      />
    );

    await screen.findByText("Casa Valle Alto");
    expect(screen.getByText(/assigned to client/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign to client/i })).not.toBeInTheDocument();
  });

  it("shows a friendly error if assignment fails, without crashing", async () => {
    getBuyerRequirementPropertyMatchesMock.mockResolvedValue({ ok: true, data: [makeResult()] });
    createPropertyInterestMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });

    render(<PropertyMatchList requirementId={REQUIREMENT_ID} contactId={CONTACT_ID} />);

    const button = await screen.findByRole("button", { name: /assign to client/i });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
