import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadsWorkspace } from "@/features/leads/components/leads-workspace";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const getContactsMock = vi.fn();
const getRenovaCasesMock = vi.fn();

vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
}));
vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCaseCounts: vi.fn().mockResolvedValue({ ok: true, data: { active: 1, closed: 0, rejected: 0, cancelled: 0, archived: 0 } }),
  updateRenovaCase: vi.fn(),
}));
vi.mock("@/features/auth/current-user-context", () => ({
  useCurrentUser: () => ({ me: { id: "ana", role: "renova_agent" }, error: null, isLoading: false }),
}));
vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  // Even a URL asking for the CRM contacts view lands on Renova.
  useSearchParams: () => new URLSearchParams("view=all"),
  usePathname: () => "/leads",
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "ana" }, isLoading: false, isAuthenticated: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeRenovaCase({ owner_name: "Mi cliente" })] });
});

describe("LeadsWorkspace for a Renova-only advisor", () => {
  it("shows only their Renova workspace, never the CRM tabs or contacts", async () => {
    render(<LeadsWorkspace />);

    expect(await screen.findByText("Mi cliente")).toBeInTheDocument();
    expect(screen.getByText("Mis expedientes Renova")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo prospecto renova/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add lead/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Clientes activos")).not.toBeInTheDocument();
    expect(getContactsMock).not.toHaveBeenCalled();
  });
});
