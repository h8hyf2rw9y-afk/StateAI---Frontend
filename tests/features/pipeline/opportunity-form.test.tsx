import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OpportunityForm } from "@/features/pipeline/components/opportunity-form";
import type { Opportunity } from "@/features/pipeline/types";
import type { Contact } from "@/features/leads/types";
import type { BuyerRequirement } from "@/features/buyer-requirements/types";

const createOpportunityMock = vi.fn();
const updateOpportunityMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getBuyerRequirementsForContactMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/pipeline", () => ({
  createOpportunity: (...args: unknown[]) => createOpportunityMock(...args),
  updateOpportunity: (...args: unknown[]) => updateOpportunityMock(...args),
}));
vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirementsForContact: (id: string) => getBuyerRequirementsForContactMock(id),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const OPPORTUNITY_ID = "d3c6071a-8b48-520f-b8ee-8503db845350";
const CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";
const REQUIREMENT_ID = "b1b1b1b1-0000-0000-0000-000000000002";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Carlos",
    last_name: "Mendoza",
    email: null,
    phone: null,
    preferred_contact_method: null,
    source: null,
    notes: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    roles: [],
    ...overrides,
  };
}

function makeBuyerRequirement(overrides: Partial<BuyerRequirement> = {}): BuyerRequirement {
  return {
    id: REQUIREMENT_ID,
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    purpose: "buy",
    status: "active",
    budget_min: null,
    budget_max: null,
    currency: "MXN",
    property_type: null,
    bedrooms_min: null,
    bedrooms_max: null,
    bathrooms_min: null,
    bathrooms_max: null,
    construction_m2_min: null,
    construction_m2_max: null,
    land_m2_min: null,
    land_m2_max: null,
    parking_spaces_min: null,
    timeline: null,
    financing_type: null,
    preapproval_status: null,
    motivation: null,
    notes: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    locations: [],
    features: [],
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID,
    organization_id: "org-1",
    contact_id: CONTACT_ID,
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

function mockDefaults() {
  getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
  getPropertiesMock.mockResolvedValue({ ok: true, data: [] });
  getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [makeBuyerRequirement()] });
}

describe("OpportunityForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens titled for create, showing Contact/Type/Stage pickers", () => {
    mockDefaults();
    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));

    expect(screen.getByRole("heading", { name: "New opportunity" })).toBeInTheDocument();
    expect(screen.getByLabelText(/contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^stage/i)).toBeInTheDocument();
  });

  it("opens pre-filled for edit, with Contact/Type/Stage NOT shown — immutable after creation", () => {
    mockDefaults();
    render(<OpportunityForm opportunity={makeOpportunity()} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit opportunity" })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Casa San Jerónimo");
    expect(screen.queryByLabelText(/contact/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^stage/i)).not.toBeInTheDocument();
  });

  it("only offers stages valid for the selected type (buy) — never a sell-only stage like Listing", () => {
    mockDefaults();
    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));

    const stageSelect = screen.getByLabelText(/^stage/i);
    const options = Array.from(stageSelect.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toContain("Offer");
    expect(options).not.toContain("Listing");
    expect(options).not.toContain("Marketing");
  });

  it("switches to sell-only stages when the type is changed to sell, resetting an incompatible stage", () => {
    mockDefaults();
    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));

    fireEvent.change(screen.getByLabelText(/^stage/i), { target: { value: "search" } }); // buy-only
    fireEvent.change(screen.getByLabelText(/^type/i), { target: { value: "sell" } });

    const stageSelect = screen.getByLabelText(/^stage/i) as HTMLSelectElement;
    const options = Array.from(stageSelect.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toContain("Listing");
    expect(options).not.toContain("Search");
    // "search" is no longer valid for "sell" — reset to the default "qualification".
    expect(stageSelect.value).toBe("qualification");
  });

  it("re-fetches buyer requirements scoped to the newly selected contact, and clears the previous selection", async () => {
    const secondContact = makeContact({ id: "second-contact", first_name: "Gabriela", last_name: "Ortiz" });
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact(), secondContact] });
    getBuyerRequirementsForContactMock.mockResolvedValue({ ok: true, data: [makeBuyerRequirement()] });

    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));
    await screen.findByText("Carlos Mendoza");

    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: CONTACT_ID } });
    await waitFor(() => expect(getBuyerRequirementsForContactMock).toHaveBeenCalledWith(CONTACT_ID));

    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: "second-contact" } });
    await waitFor(() => expect(getBuyerRequirementsForContactMock).toHaveBeenCalledWith("second-contact"));
  });

  it("requires a contact and a title before submitting on create", () => {
    mockDefaults();
    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));
    expect(screen.getByLabelText(/title/i)).toBeRequired();
  });

  it("creates an opportunity with the real fields (contact_id via the URL path, opportunity_type set, no organization_id), and redirects to its detail page", async () => {
    mockDefaults();
    createOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });

    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));
    await screen.findByText("Carlos Mendoza");

    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: CONTACT_ID } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Nueva oportunidad" } });
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity" }));

    await waitFor(() => expect(createOpportunityMock).toHaveBeenCalled());
    const [contactArg, typeArg, payload] = createOpportunityMock.mock.calls[0];
    expect(contactArg).toBe(CONTACT_ID);
    expect(typeArg).toBe("buy");
    expect(payload.title).toBe("Nueva oportunidad");
    expect(payload.stage).toBe("qualification");
    expect(payload.organization_id).toBeUndefined();
    expect(payload.contact_id).toBeUndefined();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/pipeline/${OPPORTUNITY_ID}`));
  });

  it("updates an existing opportunity's non-stage fields, sending no stage and no immutable fields", async () => {
    const opportunity = makeOpportunity();
    updateOpportunityMock.mockResolvedValue({ ok: true, data: { ...opportunity, title: "Renamed" } });
    const onSaved = vi.fn();
    mockDefaults();

    render(<OpportunityForm opportunity={opportunity} onSaved={onSaved} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateOpportunityMock).toHaveBeenCalledWith(OPPORTUNITY_ID, expect.objectContaining({ title: "Renamed" }))
    );
    const payload = updateOpportunityMock.mock.calls[0][1];
    expect(payload.stage).toBeUndefined();
    expect(payload.opportunity_type).toBeUndefined();
    expect(payload.contact_id).toBeUndefined();
    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...opportunity, title: "Renamed" }));
  });

  it("sends expected_value/probability as plain numbers, matching the Decimal-as-string-in/number-out convention", async () => {
    const opportunity = makeOpportunity();
    updateOpportunityMock.mockResolvedValue({ ok: true, data: opportunity });
    mockDefaults();

    render(<OpportunityForm opportunity={opportunity} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/expected value/i), { target: { value: "500000" } });
    fireEvent.change(screen.getByLabelText(/probability/i), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateOpportunityMock).toHaveBeenCalled());
    const payload = updateOpportunityMock.mock.calls[0][1];
    expect(payload.expected_value).toBe(500000);
    expect(payload.probability).toBe(75);
  });

  it("shows a friendly error message on API failure and does not close", async () => {
    mockDefaults();
    createOpportunityMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<OpportunityForm trigger={<button>New opportunity</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New opportunity" }));
    await screen.findByText("Carlos Mendoza");
    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: CONTACT_ID } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa" } });
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
