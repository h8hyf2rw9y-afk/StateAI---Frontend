import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LeadsWorkspace } from "@/features/leads/components/leads-workspace";
import type { Contact } from "@/features/leads/types";

const getContactsMock = vi.fn();
const getRenovaCasesMock = vi.fn();
const pushMock = vi.fn();
let currentSearch = new URLSearchParams("");

vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
}));
vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCase: vi.fn(),
  createRenovaCase: vi.fn(),
  updateRenovaCase: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentSearch,
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organization_id: "org-1",
    first_name: "Carlos",
    last_name: "Mendoza",
    email: "carlos@example.com",
    phone: "+52 81 5500 0011",
    preferred_contact_method: null,
    source: "inmuebles24",
    notes: null,
    created_at: "2026-08-15T10:00:00Z",
    updated_at: "2026-08-15T10:00:00Z",
    roles: [{ role_key: "buyer" }],
    ...overrides,
  };
}

function renderAt(query: string) {
  currentSearch = new URLSearchParams(query);
  return render(<LeadsWorkspace />);
}

describe("LeadsWorkspace", () => {
  beforeEach(() => {
    getContactsMock.mockReset();
    getRenovaCasesMock.mockReset();
    pushMock.mockReset();
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });
  });

  it("shows the three tabs: Todos, Clientes activos and Renova", async () => {
    renderAt("");

    expect(screen.getByRole("tab", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Clientes activos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Renova" })).toBeInTheDocument();
    await screen.findByText("Carlos Mendoza");
  });

  it("defaults to Todos when there is no ?view parameter", async () => {
    renderAt("");

    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    await screen.findByText("Carlos Mendoza");
  });

  it("falls back to Todos for an unrecognized ?view value", async () => {
    renderAt("view=bogus");

    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    await screen.findByText("Carlos Mendoza");
  });

  it.each([
    ["view=all", "Todos"],
    ["view=active", "Clientes activos"],
    ["view=renova", "Renova"],
  ])("?%s selects the %s tab (state comes from the URL)", async (query, label) => {
    renderAt(query);

    expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(getContactsMock.mock.calls.length + getRenovaCasesMock.mock.calls.length).toBeGreaterThan(0));
  });

  it("clicking a tab pushes the view into the URL, one history entry per change", async () => {
    renderAt("");
    await screen.findByText("Carlos Mendoza");

    fireEvent.click(screen.getByRole("tab", { name: "Clientes activos" }));
    expect(pushMock).toHaveBeenLastCalledWith("/leads?view=active");

    fireEvent.click(screen.getByRole("tab", { name: "Renova" }));
    expect(pushMock).toHaveBeenLastCalledWith("/leads?view=renova");
    expect(pushMock).toHaveBeenCalledTimes(2);
  });

  it("does not push again when the current tab is clicked", async () => {
    renderAt("view=active");
    await waitFor(() => expect(getContactsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("tab", { name: "Clientes activos" }));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("follows the URL on back/forward: changing the search params changes the view", async () => {
    const { rerender } = renderAt("view=active");
    expect(screen.getByRole("tab", { name: "Clientes activos" })).toHaveAttribute("aria-selected", "true");

    currentSearch = new URLSearchParams("view=all");
    rerender(<LeadsWorkspace />);

    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Clientes activos" })).toHaveAttribute("aria-selected", "false");
  });

  it("tabs are keyboard-focusable and expose tab semantics", () => {
    renderAt("");

    expect(screen.getByRole("tablist", { name: /vistas de leads/i })).toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: "Renova" });
    tab.focus();
    expect(tab).toHaveFocus();
  });

  // --- what each view fetches --------------------------------------------------

  it("Todos loads every contact (no active filter) and never touches the Renova API", async () => {
    renderAt("view=all");

    await screen.findByText("Carlos Mendoza");
    expect(getContactsMock).toHaveBeenCalledTimes(1);
    expect(getContactsMock).toHaveBeenCalledWith(undefined);
    expect(getRenovaCasesMock).not.toHaveBeenCalled();
  });

  it("Clientes activos asks the backend for active=true and never touches the Renova API", async () => {
    renderAt("view=active");

    await screen.findByText("Carlos Mendoza");
    expect(getContactsMock).toHaveBeenCalledWith({ active: true });
    expect(getRenovaCasesMock).not.toHaveBeenCalled();
  });

  it("Renova loads Renova cases and never touches the Contacts API", async () => {
    renderAt("view=renova");

    await screen.findByText(/aún no hay expedientes renova/i);
    expect(getRenovaCasesMock).toHaveBeenCalled();
    expect(getContactsMock).not.toHaveBeenCalled();
  });

  it("shows no Contact roles or contact columns in the Renova view", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });
    renderAt("view=renova");
    await screen.findByText(/aún no hay expedientes renova/i);

    expect(screen.queryByText("Buyer")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^filters/i })).not.toBeInTheDocument();
  });

  // --- contextual header button ---------------------------------------------------

  it.each(["view=all", "view=active"])("%s shows 'Add lead' and no Renova button", async (query) => {
    renderAt(query);
    await screen.findByText("Carlos Mendoza");

    expect(screen.getByRole("button", { name: /add lead/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nuevo prospecto renova/i })).not.toBeInTheDocument();
  });

  it("Renova shows 'Nuevo prospecto Renova' and no 'Add lead'", async () => {
    renderAt("view=renova");
    await screen.findByText(/aún no hay expedientes renova/i);

    expect(screen.getByRole("button", { name: /nuevo prospecto renova/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add lead/i })).not.toBeInTheDocument();
  });

  it("'Nuevo prospecto Renova' opens only the Renova form (not the contact form)", async () => {
    renderAt("view=renova");
    await screen.findByText(/aún no hay expedientes renova/i);

    fireEvent.click(screen.getByRole("button", { name: /nuevo prospecto renova/i }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/nuevo prospecto renova/i);
    // Step 1 of the Renova form ("Registro"); the contact form's fields are absent.
    expect(screen.getByLabelText(/fecha de ingreso/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });

  it("'Add lead' still opens the unchanged contact form", async () => {
    renderAt("view=all");
    await screen.findByText("Carlos Mendoza");

    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(/add lead/i);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });
});
