import { Suspense, act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LeadDetailPage from "@/app/(dashboard)/leads/[id]/page";
import type { Contact } from "@/features/leads/types";

const getContactMock = vi.fn();
const getLeadIntelligenceMock = vi.fn();
const getFollowUpRecommendationMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({
  getContact: (id: string) => getContactMock(id),
}));

vi.mock("@/lib/api/ai", () => ({
  getLeadIntelligence: (contactId: string) => getLeadIntelligenceMock(contactId),
  getFollowUpRecommendation: (contactId: string) => getFollowUpRecommendationMock(contactId),
}));

const REAL_CONTACT_ID = "42be9d7e-bee9-570b-95df-3ffcf0fdeafc";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: REAL_CONTACT_ID,
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

// `LeadDetailPage` reads `params` via React's `use()` (Next.js 16's Client
// Component page pattern), which suspends on the first render even for an
// already-resolved promise — wrapping the initial render in `act()` lets
// that resolve and flush before any assertion runs, instead of getting
// stuck on the Suspense fallback for the length of a `findBy` timeout.
async function renderPage(id: string) {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(
      <Suspense fallback={<div>page-loading</div>}>
        <LeadDetailPage params={Promise.resolve({ id })} />
      </Suspense>
    );
  });
  return utils;
}

describe("LeadDetailPage", () => {
  it("loads and displays the real contact for the id in the URL", async () => {
    getContactMock.mockResolvedValue({ ok: true, data: makeContact() });
    getLeadIntelligenceMock.mockReturnValue(new Promise(() => {}));
    getFollowUpRecommendationMock.mockReturnValue(new Promise(() => {}));

    await renderPage(REAL_CONTACT_ID);

    expect(await screen.findByRole("heading", { name: "Carlos Mendoza" })).toBeInTheDocument();
    expect(screen.getByText("carlos@example.com")).toBeInTheDocument();
    expect(getContactMock).toHaveBeenCalledWith(REAL_CONTACT_ID);
  });

  it("shows a not-found state without crashing when the contact doesn't exist", async () => {
    getContactMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 404 } });

    await renderPage("00000000-0000-0000-0000-000000000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't be found/i);
  });

  it("passes the exact URL id — never a mock/fabricated one — to both AI panels", async () => {
    getContactMock.mockResolvedValue({ ok: true, data: makeContact() });
    getLeadIntelligenceMock.mockReturnValue(new Promise(() => {}));
    getFollowUpRecommendationMock.mockReturnValue(new Promise(() => {}));

    await renderPage(REAL_CONTACT_ID);
    await screen.findByRole("heading", { name: "Carlos Mendoza" });

    // Trigger both AI panels the same way a user would, and confirm the
    // contact id (from the URL/contact fetch) is exactly what's sent —
    // never an organization id, never anything the frontend invented.
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("button", { name: /analyze lead/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate follow-up/i }));

    expect(getLeadIntelligenceMock).toHaveBeenCalledWith(REAL_CONTACT_ID);
    expect(getFollowUpRecommendationMock).toHaveBeenCalledWith(REAL_CONTACT_ID);
  });
});
