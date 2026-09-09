import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BuyerSearchSection } from "@/features/buyer-requirements/components/buyer-search-section";
import type { BuyerRequirement, PropertyInterest } from "@/features/buyer-requirements/types";

const getBuyerRequirementsForContactMock = vi.fn();
const createBuyerRequirementMock = vi.fn();
const updateBuyerRequirementMock = vi.fn();
const addBuyerRequirementLocationMock = vi.fn();
const getBuyerRequirementMatchesMock = vi.fn();
const getPropertyInterestsForContactMock = vi.fn();
const getPropertyMock = vi.fn();

vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirementsForContact: (contactId: string) => getBuyerRequirementsForContactMock(contactId),
  createBuyerRequirement: (contactId: string, input: unknown) => createBuyerRequirementMock(contactId, input),
  updateBuyerRequirement: (id: string, input: unknown) => updateBuyerRequirementMock(id, input),
  addBuyerRequirementLocation: (id: string, location: unknown) => addBuyerRequirementLocationMock(id, location),
  getBuyerRequirementMatches: (id: string) => getBuyerRequirementMatchesMock(id),
}));

vi.mock("@/lib/api/property-interests", () => ({
  getPropertyInterestsForContact: (contactId: string) => getPropertyInterestsForContactMock(contactId),
}));

vi.mock("@/lib/api/properties", () => ({
  getProperty: (id: string) => getPropertyMock(id),
}));

const CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";

function makeRequirement(overrides: Partial<BuyerRequirement> = {}): BuyerRequirement {
  return {
    id: "fccd2612-01d6-526f-8932-2dc6d080708a",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    purpose: "buy",
    status: "active",
    budget_min: "4500000.00",
    budget_max: "5500000.00",
    currency: "MXN",
    property_type: "house",
    bedrooms_min: 3,
    bedrooms_max: null,
    bathrooms_min: "2.0",
    bathrooms_max: null,
    construction_m2_min: null,
    construction_m2_max: null,
    land_m2_min: null,
    land_m2_max: null,
    parking_spaces_min: 2,
    timeline: null,
    financing_type: null,
    preapproval_status: null,
    motivation: null,
    notes: null,
    created_at: "2026-08-25T20:33:40Z",
    updated_at: "2026-09-08T20:33:29Z",
    locations: [{ id: "loc-1", city: "San Pedro Garza García", state: null, neighborhood: null, priority: 1 }],
    features: [],
    ...overrides,
  };
}

function makeInterest(overrides: Partial<PropertyInterest> = {}): PropertyInterest {
  return {
    id: "bf3b67dd-d1c8-5750-b84c-82bf2f27a54b",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: "dc525277-4c97-5441-90ca-48c9734745cf",
    status: "not_interested",
    source: "inmuebles24",
    notes: null,
    first_contact_at: null,
    last_contact_at: null,
    created_at: "2026-08-21T20:33:36Z",
    updated_at: "2026-09-09T01:31:20Z",
    ...overrides,
  };
}

describe("BuyerSearchSection", () => {
  it("shows a loading state before requirements/interests arrive", () => {
    getBuyerRequirementsForContactMock.mockReturnValue(new Promise(() => {}));
    getPropertyInterestsForContactMock.mockReturnValue(new Promise(() => {}));

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(screen.getByText(/loading buyer search/i)).toBeInTheDocument();
  });

  it("passes the real contact id to both requirement and interest fetches", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [] });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    await screen.findByText(/no active property search yet/i);
    expect(getBuyerRequirementsForContactMock).toHaveBeenCalledWith(CONTACT_ID);
    expect(getPropertyInterestsForContactMock).toHaveBeenCalledWith(CONTACT_ID);
  });

  it("shows a genuine empty state when there is no requirement or interest at all", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [] });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(await screen.findByText(/no active property search yet/i)).toBeInTheDocument();
  });

  it("displays the active requirement with its real fields", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [makeRequirement()] });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("House")).toBeInTheDocument();
    expect(screen.getByText(/4,500,000/)).toBeInTheDocument();
    expect(screen.getByText(/San Pedro Garza García/)).toBeInTheDocument();
    expect(screen.getByText("3+ bedrooms")).toBeInTheDocument();
  });

  it("keeps historical (non-active) requirements visible instead of hiding them", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({
      ok: true,
      data: [
        makeRequirement({ id: "req-active", status: "active", property_type: "house" }),
        makeRequirement({ id: "req-cancelled", status: "cancelled", property_type: "apartment", budget_min: "3000000.00", budget_max: "4000000.00" }),
      ],
    });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(await screen.findByText("House")).toBeInTheDocument();
    expect(screen.getByText("Apartment")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText(/history/i)).toBeInTheDocument();
  });

  it("shows the property interest with a link to the real property", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [] });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [makeInterest()] });
    getPropertyMock.mockResolvedValue({
      ok: true,
      data: {
        id: "dc525277-4c97-5441-90ca-48c9734745cf",
        organization_id: "org-1",
        title: "Departamento Del Valle",
        property_type: "apartment",
        status: "active",
        price: "3400000.00",
        currency: "MXN",
        address_line: null,
        city: "San Pedro Garza García",
        state: "Nuevo León",
        postal_code: null,
        neighborhood: "Del Valle",
        latitude: null,
        longitude: null,
        construction_m2: "110.00",
        land_m2: null,
        bedrooms: 2,
        bathrooms: "2.0",
        parking_spaces: 1,
        description: null,
        created_at: "2026-08-21T20:33:33Z",
        updated_at: "2026-08-21T20:33:33Z",
        features: [],
      },
    });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    const link = await screen.findByRole("link", { name: "Departamento Del Valle" });
    expect(link).toHaveAttribute("href", "/properties/dc525277-4c97-5441-90ca-48c9734745cf");
    expect(screen.getByText("Not interested")).toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("creates a new requirement using the real contact id and shows it immediately", async () => {
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [] });
    getPropertyInterestsForContactMock.mockResolvedValue({ ok: true, data: [] });
    createBuyerRequirementMock.mockResolvedValue({ ok: true, data: makeRequirement({ locations: [] }) });

    render(<BuyerSearchSection contactId={CONTACT_ID} />);
    await screen.findByText(/no active property search yet/i);

    fireEvent.click(screen.getByRole("button", { name: /new search/i }));
    const submitButton = await screen.findByRole("button", { name: /create search/i });
    fireEvent.click(submitButton);

    await waitFor(() => expect(createBuyerRequirementMock).toHaveBeenCalledWith(CONTACT_ID, expect.any(Object)));
    expect(await screen.findByText("House")).toBeInTheDocument();
  });
});
