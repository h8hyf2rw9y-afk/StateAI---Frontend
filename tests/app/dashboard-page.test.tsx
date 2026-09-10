import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity, Activity } from "@/features/pipeline/types";
import type { Task } from "@/features/tasks/types";
import type { AppointmentRecord } from "@/features/appointments/types";
import type { Notification } from "@/features/notifications/types";

const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const getTasksMock = vi.fn();
const getAppointmentsMock = vi.fn();
const getRecentActivitiesMock = vi.fn();
const getNotificationsMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/pipeline", () => ({ getOpportunities: () => getOpportunitiesMock() }));
vi.mock("@/lib/api/tasks", () => ({ getTasks: () => getTasksMock() }));
vi.mock("@/lib/api/appointments", () => ({ getAppointments: () => getAppointmentsMock() }));
vi.mock("@/lib/api/activities", () => ({ getRecentActivities: (limit: number) => getRecentActivitiesMock(limit) }));
vi.mock("@/lib/api/notifications", () => ({
  getNotifications: (params: unknown) => getNotificationsMock(params),
}));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));

const CONTACT_ID = "c1111111-1111-1111-1111-111111111111";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Carolina",
    last_name: "Reyes",
    email: "carolina@example.com",
    phone: null,
    preferred_contact_method: null,
    source: null,
    notes: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    roles: [],
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "p1",
    organization_id: "org-1",
    title: "Casa Cumbres",
    property_type: "house",
    status: "active",
    price: "4600000.00",
    currency: "MXN",
    address_line: null,
    city: "Monterrey",
    state: "Nuevo León",
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
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    features: [],
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "o1",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "negotiation",
    title: "Casa Cumbres — Carolina",
    description: null,
    expected_value: "4500000.00",
    currency: "MXN",
    probability: 60,
    expected_close_date: null,
    closed_at: null,
    lost_reason: null,
    owner_user_id: null,
    created_by_user_id: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    organization_id: "org-1",
    assigned_to_user_id: null,
    created_by_user_id: null,
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    property_interest_id: null,
    opportunity_id: null,
    title: "Follow up with Carolina",
    description: null,
    task_type: "follow_up",
    status: "pending",
    priority: "high",
    due_at: "2026-08-01T00:00:00Z", // in the past relative to the demo dataset's "today"
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: "a1",
    organization_id: "org-1",
    created_by_user_id: null,
    assigned_to_user_id: null,
    contact_id: CONTACT_ID,
    property_id: null,
    opportunity_id: null,
    title: "Segunda visita",
    description: null,
    start_at: "2099-01-01T10:00:00Z", // far future, always "upcoming"
    end_at: "2099-01-01T11:00:00Z",
    location: null,
    status: "confirmed",
    appointment_type: "showing",
    external_calendar_event_id: null,
    external_calendar_provider: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act1",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: null,
    opportunity_id: null,
    created_by_user_id: null,
    activity_type: "call",
    direction: "outbound",
    occurred_at: "2026-09-08T00:00:00Z",
    notes: "Llamada inicial.",
    created_at: "2026-09-08T00:00:00Z",
    updated_at: "2026-09-08T00:00:00Z",
    ...overrides,
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    organization_id: "org-1",
    user_id: "user-1",
    type: "task_due",
    title: "Task overdue",
    body: "Something is overdue.",
    related_entity_type: "task",
    related_entity_id: "t1",
    read_at: null,
    created_at: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

function mockAllEndpoints(overrides: {
  contacts?: Contact[];
  properties?: Property[];
  opportunities?: Opportunity[];
  tasks?: Task[];
  appointments?: AppointmentRecord[];
  activity?: Activity[];
  notifications?: Notification[];
} = {}) {
  getContactsMock.mockResolvedValue({ ok: true, data: overrides.contacts ?? [] });
  getPropertiesMock.mockResolvedValue({ ok: true, data: overrides.properties ?? [] });
  getOpportunitiesMock.mockResolvedValue({ ok: true, data: overrides.opportunities ?? [] });
  getTasksMock.mockResolvedValue({ ok: true, data: overrides.tasks ?? [] });
  getAppointmentsMock.mockResolvedValue({ ok: true, data: overrides.appointments ?? [] });
  getRecentActivitiesMock.mockResolvedValue({ ok: true, data: overrides.activity ?? [] });
  getNotificationsMock.mockResolvedValue({ ok: true, data: overrides.notifications ?? [] });
  useUserMock.mockReturnValue({ user: null, isLoading: false, isAuthenticated: true });
}

describe("DashboardPage", () => {
  it("shows a loading state before any data arrives", () => {
    getContactsMock.mockReturnValue(new Promise(() => {}));
    getPropertiesMock.mockReturnValue(new Promise(() => {}));
    getOpportunitiesMock.mockReturnValue(new Promise(() => {}));
    getTasksMock.mockReturnValue(new Promise(() => {}));
    getAppointmentsMock.mockReturnValue(new Promise(() => {}));
    getRecentActivitiesMock.mockReturnValue(new Promise(() => {}));
    getNotificationsMock.mockReturnValue(new Promise(() => {}));
    useUserMock.mockReturnValue({ user: null, isLoading: true, isAuthenticated: false });

    render(<DashboardPage />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders real stat values computed from the fetched data — never a fabricated number", async () => {
    mockAllEndpoints({
      contacts: [makeContact(), makeContact({ id: "c2", first_name: "Diego" }), makeContact({ id: "c3", first_name: "Ana" })],
      properties: [makeProperty(), makeProperty({ id: "p2", status: "sold" })],
      opportunities: [makeOpportunity(), makeOpportunity({ id: "o2", stage: "search" })],
    });

    render(<DashboardPage />);

    expect(await screen.findByText("3")).toBeInTheDocument(); // Total leads
    expect(screen.getByText("2")).toBeInTheDocument(); // Open opportunities (both non-closed)
    expect(screen.getByText("1")).toBeInTheDocument(); // Available properties (only one is "active")
    expect(screen.getByText("MX$9,000,000")).toBeInTheDocument(); // Open pipeline value, real MXN sum of both
  });

  it("excludes won/lost opportunities from the open pipeline value", async () => {
    mockAllEndpoints({
      opportunities: [
        makeOpportunity({ id: "o1", stage: "negotiation", expected_value: "1000000.00" }),
        makeOpportunity({ id: "o2", stage: "won", expected_value: "9000000.00" }),
      ],
    });

    render(<DashboardPage />);

    expect(await screen.findByText("MX$1,000,000")).toBeInTheDocument();
    expect(screen.queryByText("MX$10,000,000")).not.toBeInTheDocument();
  });

  it("shows overdue tasks, not future ones", async () => {
    mockAllEndpoints({
      tasks: [
        makeTask({ id: "t1", title: "Overdue task", due_at: "2020-01-01T00:00:00Z", status: "pending" }),
        makeTask({ id: "t2", title: "Future task", due_at: "2099-01-01T00:00:00Z", status: "pending" }),
        makeTask({ id: "t3", title: "Completed but old", due_at: "2020-01-01T00:00:00Z", status: "completed" }),
      ],
    });

    render(<DashboardPage />);

    expect(await screen.findByText("Overdue task")).toBeInTheDocument();
    expect(screen.queryByText("Future task")).not.toBeInTheDocument();
    expect(screen.queryByText("Completed but old")).not.toBeInTheDocument();
  });

  it("shows upcoming appointments and resolves the contact name by id", async () => {
    mockAllEndpoints({
      contacts: [makeContact()],
      appointments: [
        makeAppointment({ title: "Segunda visita", contact_id: CONTACT_ID }),
        makeAppointment({ id: "a2", title: "Cita pasada", start_at: "2020-01-01T00:00:00Z" }),
      ],
    });

    render(<DashboardPage />);

    expect(await screen.findByText("Segunda visita")).toBeInTheDocument();
    expect(screen.getByText("Carolina Reyes")).toBeInTheDocument();
    expect(screen.queryByText("Cita pasada")).not.toBeInTheDocument();
  });

  it("shows the empty states when there is no data", async () => {
    mockAllEndpoints();

    render(<DashboardPage />);

    expect(await screen.findByText(/nothing overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing on the calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/no opportunities yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });

  it("shows real recent activity with the contact name resolved by id, never a raw id", async () => {
    mockAllEndpoints({
      contacts: [makeContact()],
      activity: [makeActivity({ notes: "Llamada inicial." })],
    });

    render(<DashboardPage />);

    expect(await screen.findByText(/llamada inicial/i)).toBeInTheDocument();
    expect(screen.getByText("Carolina Reyes")).toBeInTheDocument();
    expect(screen.queryByText(CONTACT_ID)).not.toBeInTheDocument();
  });

  it("links to the real AI Assistant page instead of showing fabricated recommendations", async () => {
    mockAllEndpoints();

    render(<DashboardPage />);

    const link = await screen.findByRole("link", { name: /run an ai analysis/i });
    expect(link).toHaveAttribute("href", "/ai-assistant");
  });

  it("shows a friendly error message if any request fails", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });
    getPropertiesMock.mockResolvedValue({ ok: true, data: [] });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });
    getTasksMock.mockResolvedValue({ ok: true, data: [] });
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [] });
    getRecentActivitiesMock.mockResolvedValue({ ok: true, data: [] });
    getNotificationsMock.mockResolvedValue({ ok: true, data: [] });
    useUserMock.mockReturnValue({ user: null, isLoading: false, isAuthenticated: true });

    render(<DashboardPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });
    getPropertiesMock.mockResolvedValue({ ok: true, data: [] });
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });
    getTasksMock.mockResolvedValue({ ok: true, data: [] });
    getAppointmentsMock.mockResolvedValue({ ok: true, data: [] });
    getRecentActivitiesMock.mockResolvedValue({ ok: true, data: [] });
    getNotificationsMock.mockResolvedValue({ ok: true, data: [] });
    useUserMock.mockReturnValue({ user: null, isLoading: false, isAuthenticated: true });

    render(<DashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("never sends an organization_id — every fetch takes no organization-scoped argument", async () => {
    mockAllEndpoints();

    render(<DashboardPage />);
    await screen.findByText(/nothing overdue/i);

    expect(getContactsMock).toHaveBeenCalledWith();
    expect(getPropertiesMock).toHaveBeenCalledWith();
    expect(getOpportunitiesMock).toHaveBeenCalledWith();
    expect(getTasksMock).toHaveBeenCalledWith();
    expect(getAppointmentsMock).toHaveBeenCalledWith();
    // getNotifications takes {unread, limit} only — no organization_id, same
    // as every other real fetch on this page (the backend derives org scope
    // from the authenticated user, never from client input).
    expect(getNotificationsMock).toHaveBeenCalledWith({ unread: true, limit: 100 });
  });

  it("Today's priorities: shows real unread-notification counts grouped by type, linking to the real list page", async () => {
    mockAllEndpoints({
      notifications: [
        makeNotification({ id: "n1", type: "task_due" }),
        makeNotification({ id: "n2", type: "task_due" }),
        makeNotification({ id: "n3", type: "opportunity_inactive" }),
        // A read notification must never be counted as a current priority.
        makeNotification({ id: "n4", type: "task_due", read_at: "2026-09-09T00:00:00Z" }),
      ],
    });

    render(<DashboardPage />);

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("Task overdue")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Opportunity inactive")).toBeInTheDocument();

    const tasksLink = screen.getByRole("link", { name: /task overdue/i });
    expect(tasksLink).toHaveAttribute("href", "/tasks");
    const pipelineLink = screen.getByRole("link", { name: /opportunity inactive/i });
    expect(pipelineLink).toHaveAttribute("href", "/pipeline");
  });

  it("Today's priorities: shows an honest empty state, never a fabricated priority", async () => {
    mockAllEndpoints({ notifications: [] });

    render(<DashboardPage />);

    expect(await screen.findByText(/nothing needs your attention right now/i)).toBeInTheDocument();
  });
});
