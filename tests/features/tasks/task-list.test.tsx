import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TaskList } from "@/features/tasks/components/task-list";
import type { Task } from "@/features/tasks/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity } from "@/features/pipeline/types";
import type { BuyerRequirement } from "@/features/buyer-requirements/types";

const getTasksMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const getBuyerRequirementMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/tasks", () => ({ getTasks: (...args: unknown[]) => getTasksMock(...args) }));
vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/pipeline", () => ({ getOpportunities: () => getOpportunitiesMock() }));
vi.mock("@/lib/api/buyer-requirements", () => ({
  getBuyerRequirement: (id: string) => getBuyerRequirementMock(id),
}));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));
// See tests/test-utils/select-stub.tsx: the real Select (base-ui, portal +
// position-tracked popup) hangs indefinitely under fireEvent in jsdom —
// confirmed live in a real browser it works fine there; this renders the
// status/priority filters as plain native <select>s instead.
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";
const PROPERTY_ID = "dc525277-4c97-5441-90ca-48c9734745cf";
const OPPORTUNITY_ID = "a7d1fae8-6771-5fd4-989e-bbf22e4bc86a";
const REQUIREMENT_ID = "b1b1b1b1-0000-0000-0000-000000000002";
const TASK_ID = "f1f1f1f1-0000-0000-0000-000000000001";

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

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: PROPERTY_ID,
    organization_id: "org-1",
    title: "Depto Del Valle",
    property_type: "apartment",
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
    ownership_type: "own",
    external_source: null,
    external_advisor_name: null,
    external_advisor_contact: null,
    collaboration_status: null,
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
    property_id: null,
    buyer_requirement_id: REQUIREMENT_ID,
    opportunity_type: "buy",
    stage: "qualification",
    title: "Búsqueda de casa — Carlos Mendoza",
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

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    organization_id: "org-1",
    assigned_to_user_id: "user-1",
    created_by_user_id: "user-1",
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    property_interest_id: null,
    opportunity_id: OPPORTUNITY_ID,
    title: "Seguimiento — sin respuesta hace 5 días",
    description: null,
    task_type: "follow_up",
    status: "pending",
    priority: "high",
    due_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    ...overrides,
  };
}

function mockDefaults() {
  getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
  getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty()] });
  getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });
  getBuyerRequirementMock.mockResolvedValue({ ok: true, data: makeBuyerRequirement() });
  useUserMock.mockReturnValue({ user: { id: "user-1" }, isLoading: false, isAuthenticated: true });
}

describe("TaskList", () => {
  it("shows a loading state before tasks arrive", () => {
    mockDefaults();
    getTasksMock.mockReturnValue(new Promise(() => {}));

    render(<TaskList />);

    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });

  it("shows a genuine empty state, not fake demo tasks, when the organization has none", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [] });

    render(<TaskList />);

    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it("loads and renders a real task — title, type, status, priority", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask()] });

    render(<TaskList />);

    const title = await screen.findByText("Seguimiento — sin respuesta hace 5 días");
    const card = title.closest('[data-slot="card"]') as HTMLElement;
    expect(card.textContent).toContain("Follow-up");
    expect(within(card).getByText("Pending")).toBeInTheDocument();
    expect(within(card).getByText("High")).toBeInTheDocument();
  });

  it("flags a genuinely overdue task — computed from real due_at vs. now, not hardcoded", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask()] }); // due_at is 2 days in the past

    render(<TaskList />);

    expect(await screen.findByText("Overdue")).toBeInTheDocument();
  });

  it("does not flag a future-dated task as overdue", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [makeTask({ due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() })],
    });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("resolves and links the real contact and opportunity — never a raw id", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask()] });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    const contactLink = screen.getByText("Carlos Mendoza");
    expect(contactLink.closest("a")).toHaveAttribute("href", `/leads/${CONTACT_ID}`);

    const opportunityLink = screen.getByText("Búsqueda de casa — Carlos Mendoza");
    expect(opportunityLink.closest("a")).toHaveAttribute("href", `/pipeline/${OPPORTUNITY_ID}`);

    expect(screen.queryByText(CONTACT_ID)).not.toBeInTheDocument();
  });

  it("resolves a linked buyer requirement via the existing per-id endpoint and links to the contact's lead page", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [makeTask({ buyer_requirement_id: REQUIREMENT_ID, opportunity_id: null })],
    });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    expect(getBuyerRequirementMock).toHaveBeenCalledWith(REQUIREMENT_ID);
    const requirementLink = screen.getByText("Buy");
    expect(requirementLink.closest("a")).toHaveAttribute("href", `/leads/${CONTACT_ID}`);
  });

  it("shows the real assignee as 'You' when it matches the signed-in user", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask({ assigned_to_user_id: "user-1" })] });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    expect(screen.getByTitle("You")).toBeInTheDocument();
  });

  it("shows 'Another team member' for an assignee that isn't the signed-in user, never a fabricated name", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask({ assigned_to_user_id: "someone-else" })] });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    expect(screen.getByTitle("Another team member")).toBeInTheDocument();
  });

  it("groups tasks by real calendar day, derived from due_at", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [
        makeTask({ id: "t1", title: "First day task", due_at: "2026-09-11T10:00:00Z" }),
        makeTask({ id: "t2", title: "Second day task", due_at: "2026-09-12T10:00:00Z" }),
      ],
    });

    render(<TaskList />);

    expect(await screen.findByText("First day task")).toBeInTheDocument();
    expect(screen.getByText("Second day task")).toBeInTheDocument();
    expect(screen.getByText("Sep 11, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sep 12, 2026")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [
        makeTask({ id: "t1", title: "Pending one", status: "pending" }),
        makeTask({ id: "t2", title: "Completed one", status: "completed" }),
      ],
    });

    render(<TaskList />);
    await screen.findByText("Pending one");

    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "completed" } });

    await waitFor(() => expect(screen.queryByText("Pending one")).not.toBeInTheDocument());
    expect(screen.getByText("Completed one")).toBeInTheDocument();
  });

  it("filters by priority", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [
        makeTask({ id: "t1", title: "Urgent one", priority: "urgent" }),
        makeTask({ id: "t2", title: "Low priority one", priority: "low" }),
      ],
    });

    render(<TaskList />);
    await screen.findByText("Urgent one");

    fireEvent.change(screen.getByRole("combobox", { name: "Priority" }), { target: { value: "low" } });

    await waitFor(() => expect(screen.queryByText("Urgent one")).not.toBeInTheDocument());
    expect(screen.getByText("Low priority one")).toBeInTheDocument();
  });

  it("filters by search text (title)", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({
      ok: true,
      data: [
        makeTask({ id: "t1", title: "Send financing docs" }),
        makeTask({ id: "t2", title: "Schedule notary appointment" }),
      ],
    });

    render(<TaskList />);
    await screen.findByText("Send financing docs");

    fireEvent.change(screen.getByPlaceholderText(/search by title or contact/i), { target: { value: "notary" } });

    await waitFor(() => expect(screen.queryByText("Send financing docs")).not.toBeInTheDocument());
    expect(screen.getByText("Schedule notary appointment")).toBeInTheDocument();
  });

  it("shows a genuine no-results state when filters match nothing, not an empty page", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [makeTask()] });

    render(<TaskList />);
    await screen.findByText("Seguimiento — sin respuesta hace 5 días");

    fireEvent.change(screen.getByPlaceholderText(/search by title or contact/i), { target: { value: "nonexistent-xyz" } });

    expect(await screen.findByText(/no tasks match your filters/i)).toBeInTheDocument();
  });

  it("shows a friendly error message on a generic API failure", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<TaskList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<TaskList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("never asks the backend for a specific organization — the tasks call takes no org id argument", async () => {
    mockDefaults();
    getTasksMock.mockResolvedValue({ ok: true, data: [] });

    render(<TaskList />);
    await screen.findByText(/no tasks yet/i);

    expect(getTasksMock).toHaveBeenCalledWith();
  });
});
