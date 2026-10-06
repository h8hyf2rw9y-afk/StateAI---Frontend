import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AccessGate } from "@/components/layout/access-gate";
import { CurrentUserProvider } from "@/features/auth/current-user-context";

const getMeMock = vi.fn();
const replaceMock = vi.fn();
let pathname = "/dashboard";

vi.mock("@/lib/api/me", () => ({ getMe: () => getMeMock() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

function me(role: string) {
  return { ok: true, data: { id: "u1", email: "x@example.com", organization_id: "o1", role, provider: "google" } };
}

function renderGate() {
  return render(
    <CurrentUserProvider>
      <AccessGate>
        <p>contenido de la página</p>
      </AccessGate>
    </CurrentUserProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = "/dashboard";
});

describe("AccessGate", () => {
  it("shows the page to an owner", async () => {
    getMeMock.mockResolvedValue(me("owner"));
    renderGate();
    expect(await screen.findByText("contenido de la página")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("sends a Renova-only advisor from a CRM page to Leads → Renova without rendering it", async () => {
    getMeMock.mockResolvedValue(me("renova_agent"));
    renderGate();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/leads?view=renova"));
    expect(screen.queryByText("contenido de la página")).not.toBeInTheDocument();
  });

  it("lets a Renova-only advisor use Leads", async () => {
    pathname = "/leads";
    getMeMock.mockResolvedValue(me("renova_agent"));
    renderGate();
    expect(await screen.findByText("contenido de la página")).toBeInTheDocument();
  });

  it("keeps a CRM agent out of Administración", async () => {
    pathname = "/admin";
    getMeMock.mockResolvedValue(me("agent"));
    renderGate();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("explains a deactivated account instead of rendering anything", async () => {
    getMeMock.mockResolvedValue({ ok: false, error: { status: 403, message: "This account has been deactivated." } });
    renderGate();
    expect(await screen.findByText("Tu acceso está desactivado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    expect(screen.queryByText("contenido de la página")).not.toBeInTheDocument();
  });

  it("explains an account that was never invited", async () => {
    getMeMock.mockResolvedValue({
      ok: false,
      error: { status: 403, message: "This account is not yet assigned to an organization." },
    });
    renderGate();
    expect(await screen.findByText("Tu cuenta aún no tiene acceso")).toBeInTheDocument();
  });
});
