import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadsTable } from "@/features/leads/components/leads-table";
import type { Contact } from "@/features/leads/types";

const getContactsMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({
  getContacts: () => getContactsMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organization_id: "org-1",
    first_name: "Carlos",
    last_name: "Mendoza",
    email: "carlos@example.com",
    phone: "+52 81 5500 0011",
    preferred_contact_method: "whatsapp",
    source: "inmuebles24",
    notes: null,
    created_at: "2026-08-15T10:00:00Z",
    updated_at: "2026-08-15T10:00:00Z",
    roles: [{ role_key: "buyer" }],
    ...overrides,
  };
}

describe("LeadsTable", () => {
  it("shows a loading state before contacts arrive", () => {
    getContactsMock.mockReturnValue(new Promise(() => {}));

    render(<LeadsTable />);

    expect(screen.getByText(/loading leads/i)).toBeInTheDocument();
  });

  it("renders real contacts once loaded — name, email, phone, role, source", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<LeadsTable />);

    expect(await screen.findByText("Carlos Mendoza")).toBeInTheDocument();
    expect(screen.getByText("carlos@example.com")).toBeInTheDocument();
    expect(screen.getByText("+52 81 5500 0011")).toBeInTheDocument();
    expect(screen.getByText("Buyer")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles24")).toBeInTheDocument();
  });

  it("never fabricates a status or score column — only real contact fields render", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<LeadsTable />);
    await screen.findByText("Carlos Mendoza");

    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/budget/i)).not.toBeInTheDocument();
  });

  it("shows an empty state, not fake demo leads, when the organization has no contacts", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [] });

    render(<LeadsTable />);

    expect(await screen.findByText(/no leads yet/i)).toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<LeadsTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getContactsMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<LeadsTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("navigates to /leads/{real contact id} when a row is clicked", async () => {
    getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });

    render(<LeadsTable />);
    const row = (await screen.findByText("Carlos Mendoza")).closest("tr")!;
    fireEvent.click(row);

    expect(pushMock).toHaveBeenCalledWith("/leads/11111111-1111-1111-1111-111111111111");
  });
});
