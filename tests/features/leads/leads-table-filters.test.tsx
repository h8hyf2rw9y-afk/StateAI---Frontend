import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LeadsTable } from "@/features/leads/components/leads-table";
import type { Contact } from "@/features/leads/types";

// Secondary filters (role / source / created) behind the "Filters" button, and
// the Clientes activos view. Roles used to be a visible "All roles" select that
// acted as a primary view; now they are one filter among three.

const getContactsMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));

const DAY_MS = 24 * 60 * 60 * 1000;
const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c0",
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

const CONTACTS = [
  makeContact({ id: "c1", first_name: "Ana", last_name: "Buyer", email: "ana@example.com", roles: [{ role_key: "buyer" }], source: "inmuebles24", created_at: recent(2) }),
  makeContact({ id: "c2", first_name: "Beto", last_name: "Seller", email: "beto@example.com", roles: [{ role_key: "seller" }], source: "facebook", created_at: recent(20) }),
  makeContact({ id: "c3", first_name: "Cata", last_name: "Investor", email: "cata@example.com", roles: [{ role_key: "investor" }], source: "inmuebles24", created_at: recent(200) }),
];

async function renderWithContacts(view?: "all" | "active") {
  getContactsMock.mockResolvedValue({ ok: true, data: CONTACTS });
  render(<LeadsTable view={view} />);
  await screen.findByText("Ana Buyer");
}

function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: /^filters/i }));
}

describe("LeadsTable — secondary filters", () => {
  beforeEach(() => {
    getContactsMock.mockReset();
  });

  it("no longer shows a visible 'All roles' select in the toolbar", async () => {
    await renderWithContacts();

    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
    expect(screen.queryByText("All roles")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("opens a panel with role, source and created filters plus a clear button", async () => {
    await renderWithContacts();

    openFilters();

    expect(await screen.findByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
    expect(screen.getByLabelText("Created")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeDisabled();
  });

  it("filters by role", async () => {
    await renderWithContacts();
    openFilters();

    fireEvent.change(await screen.findByLabelText("Role"), { target: { value: "seller" } });

    expect(screen.getByText("Beto Seller")).toBeInTheDocument();
    expect(screen.queryByText("Ana Buyer")).not.toBeInTheDocument();
    expect(screen.queryByText("Cata Investor")).not.toBeInTheDocument();
  });

  it("filters by source", async () => {
    await renderWithContacts();
    openFilters();

    fireEvent.change(await screen.findByLabelText("Source"), { target: { value: "inmuebles24" } });

    expect(screen.getByText("Ana Buyer")).toBeInTheDocument();
    expect(screen.getByText("Cata Investor")).toBeInTheDocument();
    expect(screen.queryByText("Beto Seller")).not.toBeInTheDocument();
  });

  it("filters by creation date", async () => {
    await renderWithContacts();
    openFilters();

    fireEvent.change(await screen.findByLabelText("Created"), { target: { value: "30d" } });
    expect(screen.getByText("Ana Buyer")).toBeInTheDocument();
    expect(screen.getByText("Beto Seller")).toBeInTheDocument();
    expect(screen.queryByText("Cata Investor")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Created"), { target: { value: "7d" } });
    expect(screen.queryByText("Beto Seller")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Buyer")).toBeInTheDocument();
  });

  it("combines the filters with each other and with the search box", async () => {
    await renderWithContacts();
    openFilters();
    fireEvent.change(await screen.findByLabelText("Source"), { target: { value: "inmuebles24" } });

    fireEvent.change(screen.getByPlaceholderText(/search leads/i), { target: { value: "cata" } });
    expect(screen.getByText("Cata Investor")).toBeInTheDocument();
    expect(screen.queryByText("Ana Buyer")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "buyer" } });
    expect(screen.queryByText("Cata Investor")).not.toBeInTheDocument();
    expect(screen.getByText(/no leads match your filters/i)).toBeInTheDocument();
  });

  it("shows an indicator on the button while filters are active", async () => {
    await renderWithContacts();
    openFilters();

    fireEvent.change(await screen.findByLabelText("Role"), { target: { value: "buyer" } });
    expect(screen.getByRole("button", { name: "Filters (1 active)" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "inmuebles24" } });
    expect(screen.getByRole("button", { name: "Filters (2 active)" })).toBeInTheDocument();
  });

  it("'Clear filters' resets every filter and the indicator", async () => {
    await renderWithContacts();
    openFilters();
    fireEvent.change(await screen.findByLabelText("Role"), { target: { value: "seller" } });
    fireEvent.change(screen.getByLabelText("Created"), { target: { value: "7d" } });
    expect(screen.queryByText("Ana Buyer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("Ana Buyer")).toBeInTheDocument();
    expect(screen.getByText("Beto Seller")).toBeInTheDocument();
    expect(screen.getByText("Cata Investor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });

  it("filters stay applied after the panel is closed", async () => {
    await renderWithContacts();
    openFilters();
    fireEvent.change(await screen.findByLabelText("Role"), { target: { value: "seller" } });
    fireEvent.keyDown(screen.getByLabelText("Role"), { key: "Escape" });

    await waitFor(() => expect(screen.queryByLabelText("Role")).not.toBeInTheDocument());
    expect(screen.getByText("Beto Seller")).toBeInTheDocument();
    expect(screen.queryByText("Ana Buyer")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters (1 active)" })).toBeInTheDocument();
  });

  it("only offers the roles that exist in the loaded contacts", async () => {
    await renderWithContacts();
    openFilters();

    const role = (await screen.findByLabelText("Role")) as HTMLSelectElement;
    const labels = Array.from(role.options)
      .map((o) => o.text)
      .filter(Boolean);
    expect(labels).toEqual(["All roles", "Buyer", "Investor", "Seller"]);
  });

  it("role filtering works the same in the Clientes activos view", async () => {
    await renderWithContacts("active");
    openFilters();

    fireEvent.change(await screen.findByLabelText("Role"), { target: { value: "seller" } });

    expect(screen.getByText("Beto Seller")).toBeInTheDocument();
    expect(screen.queryByText("Ana Buyer")).not.toBeInTheDocument();
    expect(getContactsMock).toHaveBeenCalledWith({ active: true });
  });
});

describe("LeadsTable — views", () => {
  beforeEach(() => {
    getContactsMock.mockReset();
  });

  it("Todos (the default) asks for every contact — no active filter", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<LeadsTable />);
    await screen.findByText("Carlos Mendoza");

    expect(getContactsMock).toHaveBeenCalledWith(undefined);
  });

  it("Clientes activos asks the backend for active=true", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<LeadsTable view="active" />);
    await screen.findByText("Carlos Mendoza");

    expect(getContactsMock).toHaveBeenCalledWith({ active: true });
  });

  it("Clientes activos has its own empty state", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<LeadsTable view="active" />);

    expect(await screen.findByText(/no active clients yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no leads yet/i)).not.toBeInTheDocument();
  });
});
