import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import type { AppointmentRecord } from "@/features/appointments/types";
import type { Contact } from "@/features/leads/types";

const createAppointmentMock = vi.fn();
const updateAppointmentMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/appointments", () => ({
  createAppointment: (...args: unknown[]) => createAppointmentMock(...args),
  updateAppointment: (...args: unknown[]) => updateAppointmentMock(...args),
}));
vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/pipeline", () => ({ getOpportunities: () => getOpportunitiesMock() }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const APPOINTMENT_ID = "e1e1e1e1-0000-0000-0000-000000000001";
const CONTACT_ID = "a480e9eb-626a-5f08-bf51-553ceb4e7f2c";
const CURRENT_USER_ID = "user-1";

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

function makeAppointment(overrides: Partial<AppointmentRecord> = {}): AppointmentRecord {
  return {
    id: APPOINTMENT_ID,
    organization_id: "org-1",
    created_by_user_id: CURRENT_USER_ID,
    assigned_to_user_id: CURRENT_USER_ID,
    contact_id: CONTACT_ID,
    property_id: null,
    opportunity_id: null,
    title: "Second viewing",
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
  getPropertiesMock.mockResolvedValue({ ok: true, data: [] });
  getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });
  useUserMock.mockReturnValue({ user: { id: CURRENT_USER_ID }, isLoading: false, isAuthenticated: true });
}

describe("AppointmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens titled for create, with no status field shown (a new appointment always starts scheduled)", () => {
    mockDefaults();
    render(<AppointmentForm trigger={<button>Schedule</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));

    expect(screen.getByRole("heading", { name: "Schedule appointment" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^status/i)).not.toBeInTheDocument();
  });

  it("opens pre-filled for edit, with a status field shown", () => {
    mockDefaults();
    render(<AppointmentForm appointment={makeAppointment()} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit appointment" })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Second viewing");
    expect(screen.getByLabelText(/^status/i)).toBeInTheDocument();
  });

  it("requires a title, start, and end time before submitting", () => {
    mockDefaults();
    render(<AppointmentForm trigger={<button>Schedule</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));

    expect(screen.getByLabelText(/title/i)).toBeRequired();
    expect(screen.getByLabelText(/starts/i)).toBeRequired();
    expect(screen.getByLabelText(/ends/i)).toBeRequired();
  });

  it("rejects an end time before the start time client-side, disabling submit", () => {
    mockDefaults();
    render(<AppointmentForm trigger={<button>Schedule</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Call" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-09-20T17:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-09-20T16:00" } });

    expect(screen.getByText(/end must be after the start time/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule appointment" })).toBeDisabled();
    expect(createAppointmentMock).not.toHaveBeenCalled();
  });

  it("creates an appointment defaulting assigned_to_user_id to the signed-in user, with the real fields, no organization_id", async () => {
    mockDefaults();
    createAppointmentMock.mockResolvedValue({ ok: true, data: makeAppointment() });

    render(<AppointmentForm trigger={<button>Schedule</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Viewing" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-09-20T16:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-09-20T17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule appointment" }));

    await waitFor(() => expect(createAppointmentMock).toHaveBeenCalled());
    const payload = createAppointmentMock.mock.calls[0][0];
    expect(payload.title).toBe("Viewing");
    expect(payload.assigned_to_user_id).toBe(CURRENT_USER_ID);
    expect(payload.status).toBeUndefined();
    expect(payload.organization_id).toBeUndefined();
  });

  it("updates an existing appointment including status", async () => {
    mockDefaults();
    const appointment = makeAppointment();
    updateAppointmentMock.mockResolvedValue({ ok: true, data: { ...appointment, status: "completed" } });
    const onSaved = vi.fn();

    render(<AppointmentForm appointment={appointment} onSaved={onSaved} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^status/i), { target: { value: "completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateAppointmentMock).toHaveBeenCalledWith(APPOINTMENT_ID, expect.objectContaining({ status: "completed" }))
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...appointment, status: "completed" }));
  });

  it("shows the outcome field only when editing and status is set to completed", () => {
    mockDefaults();
    render(<AppointmentForm appointment={makeAppointment({ status: "confirmed" })} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.queryByLabelText(/what happened at this showing/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^status/i), { target: { value: "completed" } });
    expect(screen.getByLabelText(/what happened at this showing/i)).toBeInTheDocument();
  });

  it("sends outcome_notes only alongside status completed, never on a bare status change", async () => {
    mockDefaults();
    const appointment = makeAppointment();
    updateAppointmentMock.mockResolvedValue({ ok: true, data: { ...appointment, status: "completed" } });

    render(<AppointmentForm appointment={appointment} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^status/i), { target: { value: "completed" } });
    fireEvent.change(screen.getByLabelText(/what happened at this showing/i), {
      target: { value: "Liked the property but wants to compare two more." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateAppointmentMock).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        expect.objectContaining({ status: "completed", outcome_notes: "Liked the property but wants to compare two more." })
      )
    );
  });

  it("does not send outcome_notes when the field is left blank", async () => {
    mockDefaults();
    const appointment = makeAppointment();
    updateAppointmentMock.mockResolvedValue({ ok: true, data: { ...appointment, status: "completed" } });

    render(<AppointmentForm appointment={appointment} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^status/i), { target: { value: "completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAppointmentMock).toHaveBeenCalled());
    const payload = updateAppointmentMock.mock.calls[0][1];
    expect(payload.outcome_notes).toBeUndefined();
  });

  it("shows a friendly error message on API failure", async () => {
    mockDefaults();
    createAppointmentMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<AppointmentForm trigger={<button>Schedule</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Call" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-09-20T16:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-09-20T17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule appointment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
