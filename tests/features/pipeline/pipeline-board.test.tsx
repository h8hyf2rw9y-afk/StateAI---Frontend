import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";
import type { Opportunity } from "@/features/pipeline/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";

const getOpportunitiesMock = vi.fn();
const getContactsMock = vi.fn();
const getPropertiesMock = vi.fn();

vi.mock("@/lib/api/pipeline", () => ({
  getOpportunities: (...args: unknown[]) => getOpportunitiesMock(...args),
}));
vi.mock("@/lib/api/contacts", () => ({
  getContacts: () => getContactsMock(),
}));
vi.mock("@/lib/api/properties", () => ({
  getProperties: () => getPropertiesMock(),
}));

const CONTACT_ID = "98db940f-ea93-519f-80c6-1291fb1a0b2b";
const OPPORTUNITY_ID = "d3c6071a-8b48-520f-b8ee-8503db845350";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    organization_id: "org-1",
    first_name: "Gabriela",
    last_name: "Ortiz",
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

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPPORTUNITY_ID,
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: null,
    buyer_requirement_id: null,
    opportunity_type: "buy",
    stage: "negotiation",
    title: "Casa San Jerónimo",
    description: null,
    expected_value: "3200000.00",
    currency: "MXN",
    probability: 60,
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

function mockDefaults() {
  getContactsMock.mockResolvedValue({ ok: true, data: [makeContact()] });
  getPropertiesMock.mockResolvedValue({ ok: true, data: [] as Property[] });
}

describe("PipelineBoard", () => {
  it("shows a loading state before opportunities arrive", () => {
    mockDefaults();
    getOpportunitiesMock.mockReturnValue(new Promise(() => {}));

    render(<PipelineBoard />);

    expect(screen.getByText(/loading pipeline/i)).toBeInTheDocument();
  });

  it("shows a genuine empty state, not fake demo opportunities, when the organization has none", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });

    render(<PipelineBoard />);

    expect(await screen.findByText(/no opportunities yet/i)).toBeInTheDocument();
  });

  it("loads and renders real opportunities, grouped into a column per stage present in the data", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeOpportunity({ id: "opp-1", stage: "negotiation", title: "Casa San Jerónimo" }),
        makeOpportunity({ id: "opp-2", stage: "showing", title: "Depto Del Valle" }),
      ],
    });

    render(<PipelineBoard />);

    expect(await screen.findByText("Casa San Jerónimo")).toBeInTheDocument();
    expect(screen.getByText("Depto Del Valle")).toBeInTheDocument();
    // One column header per stage actually present — not a fixed 13-column board.
    expect(screen.getByText("Negotiation")).toBeInTheDocument();
    expect(screen.getByText("Showing")).toBeInTheDocument();
    expect(screen.queryByText("Closing")).not.toBeInTheDocument();
  });

  it("groups two opportunities in the same stage into the same column", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeOpportunity({ id: "opp-1", stage: "offer", title: "Offer A" }),
        makeOpportunity({ id: "opp-2", stage: "offer", title: "Offer B" }),
      ],
    });

    render(<PipelineBoard />);

    await screen.findByText("Offer A");
    expect(screen.getByText("Offer B")).toBeInTheDocument();
    // Column header shows one "Offer" badge, and a count of 2 for that column.
    expect(screen.getAllByText("Offer")).toHaveLength(1);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("resolves the contact name for each card from the real Contacts list, never a raw id", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelineBoard />);

    expect(await screen.findByText("Gabriela Ortiz")).toBeInTheDocument();
    expect(screen.queryByText(CONTACT_ID)).not.toBeInTheDocument();
  });

  it("links each opportunity card to /pipeline/{real opportunity id}", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [makeOpportunity()] });

    render(<PipelineBoard />);
    const card = await screen.findByText("Casa San Jerónimo");
    const link = card.closest("a");

    expect(link).toHaveAttribute("href", `/pipeline/${OPPORTUNITY_ID}`);
  });

  it("shows a friendly error message on a generic API failure", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<PipelineBoard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<PipelineBoard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("never asks the backend for a specific organization — the opportunities call takes no org id argument", async () => {
    mockDefaults();
    getOpportunitiesMock.mockResolvedValue({ ok: true, data: [] });

    render(<PipelineBoard />);
    await screen.findByText(/no opportunities yet/i);

    // getOpportunities() is called with no arguments at all — organization
    // scope is derived entirely server-side from the bearer token, never
    // supplied by this call (see lib/api/pipeline.ts).
    expect(getOpportunitiesMock).toHaveBeenCalledWith();
  });
});
