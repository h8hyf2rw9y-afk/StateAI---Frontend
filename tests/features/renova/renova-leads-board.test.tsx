import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaLeadsBoard } from "@/features/renova/components/renova-leads-board";
import { googleMapsUrl } from "@/features/renova/lib/maps";
import type { RenovaCaseListItem } from "@/features/renova/types";

const getRenovaCasesMock = vi.fn();
const getRenovaCaseCountsMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const getRenovaFollowUpMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCaseCounts: (...args: unknown[]) => getRenovaCaseCountsMock(...args),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
  getRenovaFollowUp: (...args: unknown[]) => getRenovaFollowUpMock(...args),
  createRenovaFollowUpActivity: vi.fn(),
  updateRenovaFollowUpActivity: vi.fn(),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/features/auth/current-user-context", () => ({
  useCurrentUser: () => ({
    me: { id: "user-me", role: "owner", organization_id: "org-1" },
    error: null,
    isLoading: false,
  }),
}));
vi.mock("@/features/organization/use-team-members", () => ({
  useTeamMembers: () => [
    {
      id: "advisor-2",
      email: "asesora@renova.mx",
      role: "renova_agent",
      is_active: true,
      deactivated_at: null,
      created_at: "2026-10-06T12:00:00Z",
      renova_cases: { active: 1, closed: 0, archived: 0 },
    },
  ],
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));

function item(overrides: Partial<RenovaCaseListItem> = {}): RenovaCaseListItem {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-me",
    entry_date: "2026-10-01",
    source: "phone",
    status: "new",
    archived: false,
    owner_name: "María González",
    owner_phone: "+52 81 5555 0101",
    street_address: "Cardo 2010",
    neighborhood: "Privadas Reales",
    municipality: "Salinas Victoria",
    postal_code: "65500",
    dwelling_type: "house",
    is_duplex: false,
    currency: "MXN",
    final_offer: null,
    proposal_type: null,
    debt_coverage_amount: null,
    owner_cash_offer: null,
    total_proposal_value: null,
    market_value: "780000.00",
    property_tax_debt: null,
    property_tax_debt_unit: "mxn",
    other_debt: "192000.00",
    water_debt: null,
    electricity_debt: null,
    gas_debt: null,
    owner_expected_amount: null,
    total_debt: "192000.00",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-06T12:00:00Z",
    follow_up: {
      last_call_activity_id: "activity-1",
      last_call_at: "2026-09-30T18:00:00Z",
      last_result: "no_answer",
      contact_attempt_count: 3,
      next_follow_up_at: "2026-10-06T17:00:00Z",
      is_follow_up_overdue: true,
      contact_state: "attempted_no_answer",
      note_preview: "Intentar después de las 5:00 pm.",
    },
    ...overrides,
  };
}

describe("RenovaLeadsBoard", () => {
  beforeEach(() => {
    getRenovaCasesMock.mockReset();
    getRenovaCaseCountsMock.mockReset();
    updateRenovaCaseMock.mockReset();
    getRenovaFollowUpMock.mockReset();
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [item()] });
    getRenovaCaseCountsMock.mockResolvedValue({ ok: true, data: { active: 1, closed: 2, rejected: 1, cancelled: 1, archived: 3 } });
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: {} });
    getRenovaFollowUpMock.mockResolvedValue({ ok: true, data: { summary: item().follow_up, activities: [] } });
  });

  it("uses the visual active view by default and keeps follow-up visible", async () => {
    render(<RenovaLeadsBoard />);

    expect(await screen.findByText("María González")).toBeInTheDocument();
    expect(screen.getByText(/^vencido:/i)).toBeInTheDocument();
    expect(screen.getByText(/intentar después de las 5:00 pm/i)).toBeInTheDocument();
    expect(getRenovaCasesMock).toHaveBeenCalledWith(expect.objectContaining({ bucket: "active" }));
  });

  it("preserves Rechazados y cancelados and Archivados as server-filtered views", async () => {
    render(<RenovaLeadsBoard />);
    await screen.findByText("María González");

    fireEvent.click(screen.getByRole("radio", { name: /rechazados y cancelados/i }));
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: "closed" })));
    fireEvent.click(screen.getByRole("radio", { name: /archivados/i }));
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: "archived" })));
  });

  it("opens and shares the selected card, never the first card implicitly", async () => {
    const onEdit = vi.fn();
    const onShare = vi.fn();
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [item(), item({ id: "case-2", owner_name: "Luis García" })] });
    render(<RenovaLeadsBoard onEdit={onEdit} onShare={onShare} />);
    await screen.findByText("Luis García");

    fireEvent.click(screen.getByRole("button", { name: "Abrir expediente de Luis García" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver ficha y compartir de Luis García" }));

    expect(onEdit).toHaveBeenCalledWith("case-2");
    expect(onShare).toHaveBeenCalledWith("case-2");
  });

  it("lets an owner filter the visual board by an advisor and shows their email", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [item({ assigned_user_id: "advisor-2" })],
    });
    render(<RenovaLeadsBoard />);

    expect(await screen.findByText(/asesora@renova\.mx/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByLabelText("Asesor"), { target: { value: "advisor-2" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ assigned_user_id: "advisor-2" })
      )
    );
  });

  it("opens the property on Google Maps straight from the card's address", async () => {
    render(<RenovaLeadsBoard />);
    const link = await screen.findByRole("link", { name: /ver en google maps: cardo 2010/i });
    expect(link).toHaveAttribute("href", googleMapsUrl(item()));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("keeps an incomplete address as plain text, not a link", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [item({ street_address: null, neighborhood: null, municipality: null, postal_code: null })] });
    render(<RenovaLeadsBoard />);
    expect(await screen.findByText("Dirección pendiente")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /google maps/i })).not.toBeInTheDocument();
  });

  it("shows the owner's phone under Adeudos as a tap-to-call link", async () => {
    render(<RenovaLeadsBoard />);
    const phone = await screen.findByRole("link", { name: /llamar a maría gonzález/i });
    expect(phone).toHaveTextContent("+52 81 5555 0101");
    expect(phone).toHaveAttribute("href", "tel:+528155550101");
  });
});
