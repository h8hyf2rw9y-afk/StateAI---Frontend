import { Suspense, act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import OpportunityDetailPage from "@/app/(dashboard)/pipeline/[id]/page";
import type { Opportunity, Activity, OpportunityTask, OpportunityAppointment } from "@/features/pipeline/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { BuyerRequirement } from "@/features/buyer-requirements/types";

const getOpportunityMock = vi.fn();
const updateOpportunityStageMock = vi.fn();
const getOpportunityActivitiesMock = vi.fn();
const getTasksForOpportunityMock = vi.fn();
const getAppointmentsForOpportunityMock = vi.fn();
const getContactMock = vi.fn();
const getPropertyMock = vi.fn();
const getBuyerRequirementMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/pipeline", () => ({
  getOpportunity: (id: string) => getOpportunityMock(id),
  updateOpportunityStage: (...args: unknown[]) => updateOpportunityStageMock(...args),
  getOpportunityActivities: (id: string) => getOpportunityActivitiesMock(id),
  getTasksForOpportunity: (id: string) => getTasksForOpportunityMock(id),
  getAppointmentsForOpportunity: (id: string) => getAppointmentsForOpportunityMock(id),
}));
vi.mock("@/lib/api/contacts", () => ({ getContact: (id: string) => getContactMock(id) }));
vi.mock("@/lib/api/properties", () => ({ getProperty: (id: string) => getPropertyMock(id) }));
vi.mock("@/lib/api/buyer-requirements", () => ({ getBuyerRequirement: (id: string) => getBuyerRequirementMock(id) }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));
// See tests/test-utils/select-stub.tsx — the real Select hangs jsdom under
// fireEvent (no existing test in this repo drives one open); this renders
// the embedded StageSelector's Selects as plain native <select>s instead.
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const OPPORTUNITY_ID = "d3c6071a-8b48-520f-b8ee-8503db845350";
const CONTACT_ID = "a480e9eb-626a-5f08-bf51-553ceb4e7f2c";
const PROPERTY_ID = "dc525277-4c97-5441-90ca-48c9734745cf";
const REQUIREMENT_ID = "b1b1b1b1-0000-0000-0000-000000000001";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID,
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: PROPERTY_ID,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "negotiation",
    title: "Casa San Jerónimo",
    description: "Cliente en negociación activa.",
    expected_value: "3200000.00",
    currency: "MXN",
    probability: 60,
    expected_close_date: "2026-10-01T00:00:00Z",
    closed_at: null,
    lost_reason: null,
    owner_user_id: "user-1",
    created_by_user_id: "user-1",
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Carolina",
    last_name: "Reyes",
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

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: PROPERTY_ID,
    organization_id: "org-1",
    title: "Casa San Jerónimo",
    property_type: "house",
    status: "active",
    price: "3200000.00",
    currency: "MXN",
    address_line: null,
    city: null,
    state: null,
    postal_code: null,
    neighborhood: null,
    latitude: null,
    longitude: null,
    construction_m2: null,
    land_m2: null,
    bedrooms: null,
    bathrooms: null,
    parking_spaces: null,
    description: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    features: [],
    ...overrides,
  };
}

function makeTask(overrides: Partial<OpportunityTask> = {}): OpportunityTask {
  return {
    id: "task-1",
    organization_id: "org-1",
    assigned_to_user_id: "user-1",
    created_by_user_id: "user-1",
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    property_interest_id: null,
    opportunity_id: OPPORTUNITY_ID,
    title: "Send financing docs",
    description: null,
    task_type: "follow_up",
    status: "pending",
    priority: "high",
    due_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<OpportunityAppointment> = {}): OpportunityAppointment {
  return {
    id: "appt-1",
    organization_id: "org-1",
    created_by_user_id: "user-1",
    assigned_to_user_id: "user-1",
    contact_id: CONTACT_ID,
    property_id: PROPERTY_ID,
    opportunity_id: OPPORTUNITY_ID,
    title: "Second viewing",
    description: null,
    start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    location: null,
    status: "scheduled",
    appointment_type: "showing",
    external_calendar_event_id: null,
    external_calendar_provider: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "activity-1",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: null,
    opportunity_id: OPPORTUNITY_ID,
    created_by_user_id: "user-1",
    activity_type: "stage_change",
    direction: null,
    occurred_at: "2026-08-25T10:00:00Z",
    notes: "Opportunity stage changed from Offer to Negotiation.",
    created_at: "2026-08-25T10:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
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
    budget_min: "2800000.00",
    budget_max: "3500000.00",
    currency: "MXN",
    property_type: "house",
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

function mockSecondaryDefaults() {
  getContactMock.mockResolvedValue({ ok: true, data: makeContact() });
  getPropertyMock.mockResolvedValue({ ok: true, data: makeProperty() });
  getBuyerRequirementMock.mockResolvedValue({ ok: false, error: { message: "not called", status: 404 } });
  getOpportunityActivitiesMock.mockResolvedValue({ ok: true, data: [] });
  getTasksForOpportunityMock.mockResolvedValue({ ok: true, data: [] });
  getAppointmentsForOpportunityMock.mockResolvedValue({ ok: true, data: [] });
  useUserMock.mockReturnValue({ user: { id: "user-1" }, isLoading: false, isAuthenticated: true });
}

async function renderPage(id: string) {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(
      <Suspense fallback={<div>page-loading</div>}>
        <OpportunityDetailPage params={Promise.resolve({ id })} />
      </Suspense>
    );
  });
  return utils;
}

describe("OpportunityDetailPage", () => {
  it("loads and displays the real opportunity for the id in the URL", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });

    await renderPage(OPPORTUNITY_ID);

    expect(await screen.findByRole("heading", { name: "Casa San Jerónimo" })).toBeInTheDocument();
    expect(screen.getByText(/3,200,000/)).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(getOpportunityMock).toHaveBeenCalledWith(OPPORTUNITY_ID);
  });

  it("shows a not-found state without crashing when the opportunity doesn't exist / belongs to another organization", async () => {
    getOpportunityMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 404 } });

    await renderPage("00000000-0000-0000-0000-000000000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't be found/i);
  });

  it("links to the related contact and property", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    const contactLink = await screen.findByText("Carolina Reyes");
    expect(contactLink.closest("a")).toHaveAttribute("href", `/leads/${CONTACT_ID}`);

    const propertyLinks = await screen.findAllByText("Casa San Jerónimo");
    const propertyLink = propertyLinks.find((el) => el.closest("a")?.getAttribute("href") === `/properties/${PROPERTY_ID}`);
    expect(propertyLink).toBeTruthy();
  });

  it("shows the linked buyer requirement and navigates to the contact's lead page — the only place it's actually displayed (no dedicated buyer-requirement page exists)", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({
      ok: true,
      data: makeOpportunity({ property_id: null, buyer_requirement_id: REQUIREMENT_ID }),
    });
    getBuyerRequirementMock.mockResolvedValue({ ok: true, data: makeBuyerRequirement() });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    expect(getBuyerRequirementMock).toHaveBeenCalledWith(REQUIREMENT_ID);
    expect(await screen.findByText(/2,800,000/)).toBeInTheDocument();
    const requirementLink = screen.getByText(/2,800,000/).closest("a");
    expect(requirementLink).toHaveAttribute("href", `/leads/${CONTACT_ID}`);
    expect(screen.getByText("No property linked.")).toBeInTheDocument();
  });

  it("renders real tasks, appointments, and activities linked to this opportunity", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });
    getTasksForOpportunityMock.mockResolvedValue({ ok: true, data: [makeTask()] });
    getAppointmentsForOpportunityMock.mockResolvedValue({ ok: true, data: [makeAppointment()] });
    getOpportunityActivitiesMock.mockResolvedValue({ ok: true, data: [makeActivity()] });

    await renderPage(OPPORTUNITY_ID);

    expect(await screen.findByText("Send financing docs")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument(); // due_at is in the past, status pending
    expect(screen.getByText("Second viewing")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument(); // start_at is in the future, status scheduled
    expect(screen.getByText(/stage changed from Offer to Negotiation/i)).toBeInTheDocument();
  });

  it("shows genuine empty states for tasks/appointments/activities, never fake demo data", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no appointments yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it("shows 'You' as owner when owner_user_id matches the signed-in user, never a fabricated name", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity({ owner_user_id: "user-1" }) });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("lets the user change the opportunity's stage and reflects the update", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity({ stage: "negotiation" }) });
    updateOpportunityStageMock.mockResolvedValue({ ok: true, data: makeOpportunity({ stage: "offer" }) });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    fireEvent.change(screen.getByRole("combobox", { name: "Stage" }), { target: { value: "offer" } });
    fireEvent.click(screen.getByRole("button", { name: /save stage/i }));

    expect(updateOpportunityStageMock).toHaveBeenCalledWith(OPPORTUNITY_ID, { stage: "offer", lost_reason: null });
    // The page's own StageBadge (in the header) reflects the update.
    await screen.findAllByText("Offer");
  });

  it("passes the exact opportunity id from the URL — never a fabricated one — to every related fetch", async () => {
    mockSecondaryDefaults();
    getOpportunityMock.mockResolvedValue({ ok: true, data: makeOpportunity() });

    await renderPage(OPPORTUNITY_ID);
    await screen.findByRole("heading", { name: "Casa San Jerónimo" });

    expect(getOpportunityMock).toHaveBeenCalledWith(OPPORTUNITY_ID);
    expect(getContactMock).toHaveBeenCalledWith(CONTACT_ID);
    expect(getPropertyMock).toHaveBeenCalledWith(PROPERTY_ID);
    expect(getOpportunityActivitiesMock).toHaveBeenCalledWith(OPPORTUNITY_ID);
    expect(getTasksForOpportunityMock).toHaveBeenCalledWith(OPPORTUNITY_ID);
    expect(getAppointmentsForOpportunityMock).toHaveBeenCalledWith(OPPORTUNITY_ID);
    // No organization id is ever part of any of these calls — the backend
    // alone derives organization scope from the bearer token.
    expect(getOpportunityMock).not.toHaveBeenCalledWith(expect.objectContaining({ organization_id: expect.anything() }));
  });
});
