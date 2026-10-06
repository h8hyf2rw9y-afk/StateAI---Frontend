import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TeamMembers } from "@/features/admin/components/team-members";

const getOrganizationMembersMock = vi.fn();
const setOrganizationMemberActiveMock = vi.fn();
let currentMe: { id: string; role: string } | null = { id: "owner-1", role: "owner" };

vi.mock("@/lib/api/organization", () => ({
  getOrganizationMembers: () => getOrganizationMembersMock(),
  setOrganizationMemberActive: (...args: unknown[]) => setOrganizationMemberActiveMock(...args),
}));
vi.mock("@/features/auth/current-user-context", () => ({
  useCurrentUser: () => ({ me: currentMe, error: null, isLoading: false }),
}));

function member(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ana",
    email: "ana@gmail.com",
    role: "renova_agent",
    is_active: true,
    deactivated_at: null,
    created_at: "2026-10-01T00:00:00Z",
    renova_cases: { active: 4, closed: 1, archived: 2 },
    ...overrides,
  };
}

const OWNER = member({ id: "owner-1", email: "dueno@gmail.com", role: "owner", renova_cases: { active: 9, closed: 0, archived: 0 } });
const ADMIN = member({ id: "admin-1", email: "admin@gmail.com", role: "admin" });

function rowOf(text: string): HTMLElement {
  const row = screen.getByText(text).closest("tr");
  if (!row) throw new Error(`no row for ${text}`);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentMe = { id: "owner-1", role: "owner" };
  getOrganizationMembersMock.mockResolvedValue({ ok: true, data: [OWNER, ADMIN, member()] });
});

describe("TeamMembers", () => {
  it("lists each member with role, status and their Renova case counts", async () => {
    render(<TeamMembers />);
    await screen.findByText("ana@gmail.com");
    const row = rowOf("ana@gmail.com");
    expect(within(row).getByText("Asesor Renova")).toBeInTheDocument();
    expect(within(row).getByText("Activo")).toBeInTheDocument();
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("(tú)")).toBeInTheDocument();
  });

  it("never offers to deactivate yourself or the owner", async () => {
    render(<TeamMembers />);
    await screen.findByText("ana@gmail.com");
    expect(screen.queryByRole("button", { name: /desactivar a dueno@gmail.com/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar a admin@gmail.com/i })).toBeInTheDocument();
  });

  it("an admin can't deactivate another admin", async () => {
    currentMe = { id: "other-admin", role: "admin" };
    render(<TeamMembers />);
    await screen.findByText("ana@gmail.com");
    expect(screen.queryByRole("button", { name: /desactivar a admin@gmail.com/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar a ana@gmail.com/i })).toBeInTheDocument();
  });

  it("deactivates after confirming and updates the row", async () => {
    setOrganizationMemberActiveMock.mockResolvedValue({
      ok: true,
      data: member({ is_active: false, deactivated_at: "2026-10-06T00:00:00Z" }),
    });
    render(<TeamMembers />);
    fireEvent.click(await screen.findByRole("button", { name: /desactivar a ana@gmail.com/i }));

    expect(screen.getByText(/ya no podrá entrar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^desactivar$/i }));

    await waitFor(() => expect(setOrganizationMemberActiveMock).toHaveBeenCalledWith("ana", false));
    await waitFor(() => expect(within(rowOf("ana@gmail.com")).getByText("Desactivado")).toBeInTheDocument());
    expect(within(rowOf("ana@gmail.com")).getByRole("button", { name: /reactivar a ana@gmail.com/i })).toBeInTheDocument();
  });

  it("shows the server's reason when the change is refused", async () => {
    setOrganizationMemberActiveMock.mockResolvedValue({
      ok: false,
      error: { status: 403, message: "Only the owner can change another admin's access." },
    });
    render(<TeamMembers />);
    fireEvent.click(await screen.findByRole("button", { name: /desactivar a ana@gmail.com/i }));
    fireEvent.click(screen.getByRole("button", { name: /^desactivar$/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
