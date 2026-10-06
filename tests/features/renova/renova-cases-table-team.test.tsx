import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const getRenovaCasesMock = vi.fn();
const getOrganizationMembersMock = vi.fn();
let currentRole = "owner";

vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCaseCounts: vi.fn().mockResolvedValue({ ok: true, data: { active: 1, closed: 0, rejected: 0, cancelled: 0, archived: 0 } }),
  updateRenovaCase: vi.fn(),
  getRenovaFollowUp: vi.fn(),
  createRenovaFollowUpActivity: vi.fn(),
  updateRenovaFollowUpActivity: vi.fn(),
}));
vi.mock("@/lib/api/organization", () => ({
  getOrganizationMembers: () => getOrganizationMembersMock(),
}));
vi.mock("@/features/auth/current-user-context", () => ({
  useCurrentUser: () => ({ me: { id: "user-me", role: currentRole }, error: null, isLoading: false }),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));

const MEMBERS = [
  { id: "user-me", email: "dueno@gmail.com", role: "owner", is_active: true, deactivated_at: null, created_at: "", renova_cases: { active: 0, closed: 0, archived: 0 } },
  { id: "ana", email: "ana@gmail.com", role: "renova_agent", is_active: true, deactivated_at: null, created_at: "", renova_cases: { active: 1, closed: 0, archived: 0 } },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  currentRole = "owner";
  getOrganizationMembersMock.mockResolvedValue({ ok: true, data: MEMBERS });
  getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeRenovaCase({ assigned_user_id: "ana", owner_name: "Cliente de Ana" })] });
});

describe("RenovaCasesTable — team view", () => {
  it("shows another advisor's email in the Asesor column for an owner", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("Cliente de Ana");
    expect(await screen.findByRole("cell", { name: "ana@gmail.com" })).toBeInTheDocument();
  });

  it("lets an owner filter the table by one advisor", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("Cliente de Ana");
    fireEvent.click(screen.getByRole("button", { name: /^filtros/i }));
    await screen.findByRole("option", { name: "ana@gmail.com" });

    fireEvent.change(screen.getByLabelText("Filtrar por asesor"), { target: { value: "ana" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ assigned_user_id: "ana" }))
    );
  });

  it("offers no advisor filter and never lists members for a Renova-only advisor", async () => {
    currentRole = "renova_agent";
    render(<RenovaCasesTable />);
    await screen.findByText("Cliente de Ana");
    fireEvent.click(screen.getByRole("button", { name: /^filtros/i }));

    expect(screen.queryByLabelText("Filtrar por asesor")).not.toBeInTheDocument();
    expect(getOrganizationMembersMock).not.toHaveBeenCalled();
  });
});
