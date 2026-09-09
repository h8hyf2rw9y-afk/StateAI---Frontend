import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppointmentsList } from "@/features/appointments/components/appointments-list";
import type { AppointmentRecord } from "@/features/appointments/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity } from "@/features/pipeline/types";

const getAppointmentsMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/appointments", () => ({ getAppointments: (...args: unknown[]) => getAppointmentsMock(...args) }));
vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/pipeline", () => ({ getOpportunities: () => getOpportunitiesMock() }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));
// See tests/test-utils/select-stub.tsx: the real Select (base-ui, portal +
// position-tracked popup) hangs indefinitely under fireEvent in jsdom —
// confirmed live in a real browser it works fine there (see the Pipeline
// task's README notes); this renders the status filter as a plain native
// <select> instead, driven with fireEvent.change.
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const CONTACT_ID = "a480e9eb-626a-5f08-bf51-553ceb4e7f2c";
const PROPERTY_ID = "dc525277-4c97-5441-90ca-48c9734745cf";
const OPPORTUNITY_ID = "d3c6071a-8b48-520f-b8ee-8503db845350";
const APPOINTMENT_ID = "e1e1e1e1-0000-0000-0000-000000000001";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Natalia",
    last_name: "Ramírez",
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
    title: "Casa Carretera Nacional",
    property_type: "house",
    status: "active",
    price: null,
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

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID,
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: PROPERTY_ID,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "showing",
    title: "Búsqueda de casa — Natalia Ramírez",
    description: null,
    expected_value: null,
    currency: "MXN",
    probability: null,
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

function makeAppointment(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: APPOINTMENT_ID,
    organization_id: "org-1",
    created_by_user_id: "user-1",
    assigned_to_user_id: "user-1",
    contact_id: CONTACT_ID,
    property_id: PROPERTY_ID,
    opportunity_id: OPPORTUNITY_ID,
    title: "Segunda visita — Casa Carretera Nacional",
    description: null,
    start_at: "2026-09-11T16:00:00Z",
    end_at: "2026-09-11T17:00:00Z",
    location: null,
    status: "confirmed",
    appointment_type: "showing",
    external_calendar_event_id: null,
    external_calendar_provider: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

function mockDefaults() {
  getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
  getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty()] });
  getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });
  useUserMock.mockReturnValue({ user: { id: "user-1" }, isLoading: false, isAuthenticated: true });
}

describe("AppointmentsList", () => {
  it("shows a loading state before appointments arrive", () => {
    mockDefaults();
    getAppointmentsMock.mockReturnValue(new Promise(() => {}));

    render(<AppointmentsList />);

    expect(screen.getByText(/loading appointments/i)).toBeInTheDocument();
  });

  it("shows a genuine empty state, not fake demo appointments, when the organization has none", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AppointmentsList />);

    expect(await screen.findByText(/no appointments scheduled/i)).toBeInTheDocument();
  });

  it("loads and renders a real appointment — title, time, type, status", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [makeAppointment()] });

    render(<AppointmentsList />);

    const title = await screen.findByText("Segunda visita — Casa Carretera Nacional");
    const card = title.closest('[data-slot="card"]') as HTMLElement;
    // "Showing" sits as a plain text node alongside sibling <a> links inside
    // the same <p> (type · contact · property · opportunity), so it's not
    // its own queryable element — assert on the row's full text instead.
    expect(card.textContent).toContain("Showing");
    // Scoped to this card, not screen-wide: the status filter's own
    // <select> also has an (off-screen but DOM-present) "Confirmed"
    // <option>, so an unscoped getByText would find two matches.
    expect(within(card).getByText("Confirmed")).toBeInTheDocument();
  });

  it("resolves and links the real contact, property, and opportunity — never a raw id", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [makeAppointment()] });

    render(<AppointmentsList />);
    await screen.findByText("Segunda visita — Casa Carretera Nacional");

    const contactLink = screen.getByText("Natalia Ramírez");
    expect(contactLink.closest("a")).toHaveAttribute("href", `/leads/${CONTACT_ID}`);

    const propertyLink = screen.getByText("Casa Carretera Nacional");
    expect(propertyLink.closest("a")).toHaveAttribute("href", `/properties/${PROPERTY_ID}`);

    const opportunityLink = screen.getByText("Búsqueda de casa — Natalia Ramírez");
    expect(opportunityLink.closest("a")).toHaveAttribute("href", `/pipeline/${OPPORTUNITY_ID}`);

    expect(screen.queryByText(CONTACT_ID)).not.toBeInTheDocument();
  });

  it("groups appointments by real calendar day, derived from start_at", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({
      ok: true,
      data: [
        makeAppointment({ id: "a1", title: "First day appt", start_at: "2026-09-11T10:00:00Z", end_at: "2026-09-11T10:30:00Z" }),
        makeAppointment({ id: "a2", title: "Second day appt", start_at: "2026-09-12T10:00:00Z", end_at: "2026-09-12T10:30:00Z" }),
      ],
    });

    render(<AppointmentsList />);

    expect(await screen.findByText("First day appt")).toBeInTheDocument();
    expect(screen.getByText("Second day appt")).toBeInTheDocument();
    // Two distinct day headings (formatted from the two different start_at days).
    expect(screen.getByText("Sep 11, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sep 12, 2026")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({
      ok: true,
      data: [
        makeAppointment({ id: "a1", title: "Confirmed one", status: "confirmed" }),
        makeAppointment({ id: "a2", title: "Cancelled one", status: "cancelled" }),
      ],
    });

    render(<AppointmentsList />);
    await screen.findByText("Confirmed one");

    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "cancelled" } });

    await waitFor(() => expect(screen.queryByText("Confirmed one")).not.toBeInTheDocument());
    expect(screen.getByText("Cancelled one")).toBeInTheDocument();
  });

  it("filters by search text (title)", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({
      ok: true,
      data: [
        makeAppointment({ id: "a1", title: "Viewing at Del Valle" }),
        makeAppointment({ id: "a2", title: "Financing call" }),
      ],
    });

    render(<AppointmentsList />);
    await screen.findByText("Viewing at Del Valle");

    fireEvent.change(screen.getByPlaceholderText(/search by title or contact/i), { target: { value: "financing" } });

    await waitFor(() => expect(screen.queryByText("Viewing at Del Valle")).not.toBeInTheDocument());
    expect(screen.getByText("Financing call")).toBeInTheDocument();
  });

  it("shows a friendly error message on a generic API failure", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<AppointmentsList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<AppointmentsList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("never asks the backend for a specific organization — the appointments call takes no org id argument", async () => {
    mockDefaults();
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [] });

    render(<AppointmentsList />);
    await screen.findByText(/no appointments scheduled/i);

    expect(getAppointmentsMock).toHaveBeenCalledWith();
  });
});
