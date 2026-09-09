import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskForm } from "@/features/tasks/components/task-form";
import type { Task } from "@/features/tasks/types";
import type { Contact } from "@/features/leads/types";

const createTaskMock = vi.fn();
const updateTaskMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();
const getOpportunitiesMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/lib/api/tasks", () => ({
  createTask: (...args: unknown[]) => createTaskMock(...args),
  updateTask: (...args: unknown[]) => updateTaskMock(...args),
}));
vi.mock("@/lib/api/contacts", () => ({ getContacts: () => getContactsMock() }));
vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/pipeline", () => ({ getOpportunities: () => getOpportunitiesMock() }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => useUserMock() }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const TASK_ID = "f1f1f1f1-0000-0000-0000-000000000001";
const CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";
const CURRENT_USER_ID = "user-1";

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

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    organization_id: "org-1",
    assigned_to_user_id: CURRENT_USER_ID,
    created_by_user_id: CURRENT_USER_ID,
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    property_interest_id: null,
    opportunity_id: null,
    title: "Follow up with Carlos",
    description: null,
    task_type: "follow_up",
    status: "pending",
    priority: "high",
    due_at: "2026-09-20T16:00:00Z",
    completed_at: null,
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

describe("TaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger closed by default", () => {
    mockDefaults();
    render(<TaskForm trigger={<button>New task</button>} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens titled for create, with no status field shown (a new task always starts pending)", () => {
    mockDefaults();
    render(<TaskForm trigger={<button>New task</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));

    expect(screen.getByRole("heading", { name: "New task" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^status/i)).not.toBeInTheDocument();
  });

  it("opens pre-filled for edit, with a status field shown", () => {
    mockDefaults();
    render(<TaskForm task={makeTask()} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Follow up with Carlos");
    expect(screen.getByLabelText(/^status/i)).toBeInTheDocument();
  });

  it("requires a title and a due date before submitting", () => {
    mockDefaults();
    render(<TaskForm trigger={<button>New task</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));

    expect(screen.getByLabelText(/title/i)).toBeRequired();
    expect(screen.getByLabelText(/due/i)).toBeRequired();
  });

  it("creates a task defaulting assigned_to_user_id to the signed-in user — no assignee picker is shown", async () => {
    mockDefaults();
    createTaskMock.mockResolvedValue({ ok: true, data: makeTask() });

    render(<TaskForm trigger={<button>New task</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));

    expect(screen.queryByLabelText(/assign/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "New follow-up" } });
    fireEvent.change(screen.getByLabelText(/due/i), { target: { value: "2026-09-20T16:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalled());
    const payload = createTaskMock.mock.calls[0][0];
    expect(payload.title).toBe("New follow-up");
    expect(payload.assigned_to_user_id).toBe(CURRENT_USER_ID);
    expect(payload.status).toBeUndefined();
    expect(payload.organization_id).toBeUndefined();
  });

  it("sends the selected contact_id in the create payload", async () => {
    mockDefaults();
    createTaskMock.mockResolvedValue({ ok: true, data: makeTask() });

    render(<TaskForm trigger={<button>New task</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    await screen.findByText("Carlos Mendoza");

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Call" } });
    fireEvent.change(screen.getByLabelText(/due/i), { target: { value: "2026-09-20T16:00" } });
    fireEvent.change(screen.getByLabelText(/contact/i), { target: { value: CONTACT_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalledWith(expect.objectContaining({ contact_id: CONTACT_ID })));
  });

  it("updates an existing task including status, and calls onSaved with the updated task", async () => {
    mockDefaults();
    const task = makeTask();
    updateTaskMock.mockResolvedValue({ ok: true, data: { ...task, status: "completed" } });
    const onSaved = vi.fn();

    render(<TaskForm task={task} onSaved={onSaved} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/^status/i), { target: { value: "completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateTaskMock).toHaveBeenCalledWith(TASK_ID, expect.objectContaining({ status: "completed" }))
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...task, status: "completed" }));
  });

  it("shows a friendly error message on API failure", async () => {
    mockDefaults();
    createTaskMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<TaskForm trigger={<button>New task</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Task" } });
    fireEvent.change(screen.getByLabelText(/due/i), { target: { value: "2026-09-20T16:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
