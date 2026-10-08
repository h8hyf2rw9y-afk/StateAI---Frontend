import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TeamInvitations } from "@/features/admin/components/team-invitations";

const getOrganizationInvitationsMock = vi.fn();
const createOrganizationInvitationMock = vi.fn();
const revokeOrganizationInvitationMock = vi.fn();
let currentRole = "owner";

vi.mock("@/lib/api/organization", () => ({
  getOrganizationInvitations: () => getOrganizationInvitationsMock(),
  createOrganizationInvitation: (...args: unknown[]) => createOrganizationInvitationMock(...args),
  revokeOrganizationInvitation: (...args: unknown[]) => revokeOrganizationInvitationMock(...args),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/features/auth/current-user-context", () => ({
  useCurrentUser: () => ({ me: { id: "me", role: currentRole }, error: null, isLoading: false }),
}));

function invitation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv-1",
    email: "colega@example.com",
    role: "renova_agent",
    status: "pending",
    expires_at: "2026-10-09T00:00:00Z",
    accepted_at: null,
    created_at: "2026-10-02T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentRole = "owner";
  getOrganizationInvitationsMock.mockResolvedValue({ ok: true, data: [] });
  revokeOrganizationInvitationMock.mockResolvedValue({ ok: true, data: undefined });
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("TeamInvitations", () => {
  it("invites as Asesor Retify by default and shows the one-time code plus a copyable link", async () => {
    createOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { ...invitation(), token: "ABCDE-FG234" } });
    render(<TeamInvitations />);
    await screen.findByText(/aún no hay invitaciones/i);

    expect(screen.getByText(/solo usa retify y solo ve los expedientes que tiene asignados/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^correo$/i), { target: { value: "colega@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invitar$/i }));

    await waitFor(() => expect(createOrganizationInvitationMock).toHaveBeenCalledWith("colega@example.com", "renova_agent"));
    expect(await screen.findByDisplayValue("ABCDE-FG234")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/invite=ABCDE-FG234/)).toBeInTheDocument();
  });

  it("can invite a CRM agent instead", async () => {
    createOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { ...invitation({ role: "agent" }), token: "t" } });
    render(<TeamInvitations />);
    await screen.findByText(/aún no hay invitaciones/i);

    fireEvent.change(screen.getByLabelText(/^rol$/i), { target: { value: "agent" } });
    fireEvent.change(screen.getByLabelText(/^correo$/i), { target: { value: "crm@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invitar$/i }));

    await waitFor(() => expect(createOrganizationInvitationMock).toHaveBeenCalledWith("crm@example.com", "agent"));
  });

  it("lets a normal admin invite advisors but not administrators or CRM agents", async () => {
    currentRole = "admin";
    render(<TeamInvitations />);
    await screen.findByText(/aún no hay invitaciones/i);

    const role = screen.getByLabelText(/^rol$/i);
    expect(role).toHaveTextContent("Asesor Retify");
    expect(role).not.toHaveTextContent("Administrador");
    expect(role).not.toHaveTextContent("Agente CRM");
  });

  it("keeps the email and shows the error when creating fails", async () => {
    createOrganizationInvitationMock.mockResolvedValue({ ok: false, error: { status: 422, message: "Invalid" } });
    render(<TeamInvitations />);
    await screen.findByText(/aún no hay invitaciones/i);

    fireEvent.change(screen.getByLabelText(/^correo$/i), { target: { value: "colega@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invitar$/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText(/^correo$/i)).toHaveValue("colega@example.com");
  });

  it("lists invitations with role and status, offering revoke only while pending", async () => {
    getOrganizationInvitationsMock.mockResolvedValue({
      ok: true,
      data: [invitation(), invitation({ id: "inv-2", email: "ya@example.com", status: "revoked", role: "agent" })],
    });
    render(<TeamInvitations />);

    expect(await screen.findByText("colega@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Revocada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revocar invitación de colega@example.com/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revocar invitación de ya@example.com/i })).not.toBeInTheDocument();
  });

  it("revoking calls the API and refreshes the list", async () => {
    getOrganizationInvitationsMock.mockResolvedValueOnce({ ok: true, data: [invitation()] });
    render(<TeamInvitations />);
    await screen.findByText("colega@example.com");

    getOrganizationInvitationsMock.mockResolvedValueOnce({ ok: true, data: [invitation({ status: "revoked" })] });
    fireEvent.click(screen.getByRole("button", { name: /revocar invitación de colega@example.com/i }));

    await waitFor(() => expect(revokeOrganizationInvitationMock).toHaveBeenCalledWith("inv-1"));
    expect(await screen.findByText("Revocada")).toBeInTheDocument();
  });
});
