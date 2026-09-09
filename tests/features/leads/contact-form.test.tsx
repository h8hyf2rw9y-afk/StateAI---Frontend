import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactForm } from "@/features/leads/components/contact-form";
import type { Contact } from "@/features/leads/types";

const createContactMock = vi.fn();
const updateContactMock = vi.fn();
const addContactRoleMock = vi.fn();
const removeContactRoleMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({
  createContact: (...args: unknown[]) => createContactMock(...args),
  updateContact: (...args: unknown[]) => updateContactMock(...args),
  addContactRole: (...args: unknown[]) => addContactRoleMock(...args),
  removeContactRole: (...args: unknown[]) => removeContactRoleMock(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
// See tests/test-utils/select-stub.tsx — the real Select hangs jsdom under fireEvent.
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Carlos",
    last_name: "Mendoza",
    email: "carlos@example.com",
    phone: "+52 81 5500 0011",
    preferred_contact_method: "whatsapp",
    source: "referral",
    notes: "Existing notes.",
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    roles: [{ role_key: "buyer" }],
    ...overrides,
  };
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger closed by default", () => {
    render(<ContactForm trigger={<button>Add lead</button>} />);
    expect(screen.getByRole("button", { name: "Add lead" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog on trigger click, titled for create", () => {
    render(<ContactForm trigger={<button>Add lead</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));
    expect(screen.getByRole("heading", { name: "Add lead" })).toBeInTheDocument();
  });

  it("opens pre-filled and titled for edit when given an existing contact", () => {
    render(<ContactForm contact={makeContact()} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit lead" })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Carlos");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Mendoza");
  });

  it("requires first and last name before submitting", () => {
    render(<ContactForm trigger={<button>Add lead</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
  });

  it("blocks submission client-side when creating with neither email nor phone", async () => {
    render(<ContactForm trigger={<button>Add lead</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Nueva" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Persona" } });
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email or a phone/i);
    expect(createContactMock).not.toHaveBeenCalled();
  });

  it("creates a contact with the exact real fields, assigns selected roles, and redirects to its detail page", async () => {
    createContactMock.mockResolvedValue({ ok: true, data: makeContact({ roles: [] }) });
    addContactRoleMock.mockResolvedValue({ ok: true, data: makeContact() });

    render(<ContactForm trigger={<button>Add lead</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Carlos" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Mendoza" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "carlos@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Buyer" }));

    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    await waitFor(() => expect(createContactMock).toHaveBeenCalled());
    expect(createContactMock).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: "Carlos", last_name: "Mendoza", email: "carlos@example.com" })
    );
    // No organization_id, no id, no roles field — matches ContactCreate exactly.
    const payload = createContactMock.mock.calls[0][0];
    expect(payload.organization_id).toBeUndefined();
    expect(payload.roles).toBeUndefined();

    await waitFor(() => expect(addContactRoleMock).toHaveBeenCalledWith(CONTACT_ID, "buyer"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/leads/${CONTACT_ID}`));
  });

  it("updates an existing contact and does not redirect", async () => {
    const contact = makeContact();
    updateContactMock.mockResolvedValue({ ok: true, data: { ...contact, notes: "Updated." } });
    const onSaved = vi.fn();

    render(<ContactForm contact={contact} onSaved={onSaved} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: "Updated." } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateContactMock).toHaveBeenCalledWith(CONTACT_ID, expect.objectContaining({ notes: "Updated." })));
    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...contact, notes: "Updated." }));
  });

  it("diffs roles on edit — removing an unchecked existing role, not touching untouched ones", async () => {
    const contact = makeContact({ roles: [{ role_key: "buyer" }, { role_key: "investor" }] });
    updateContactMock.mockResolvedValue({ ok: true, data: contact });
    removeContactRoleMock.mockResolvedValue({ ok: true, data: contact });

    render(<ContactForm contact={contact} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    // Un-toggle "Buyer" (currently selected) — "Investor" stays selected untouched.
    fireEvent.click(screen.getByRole("button", { name: "Buyer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(removeContactRoleMock).toHaveBeenCalledWith(CONTACT_ID, "buyer"));
    expect(addContactRoleMock).not.toHaveBeenCalled();
  });

  it("shows a friendly error message on API failure and does not close", async () => {
    createContactMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<ContactForm trigger={<button>Add lead</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
