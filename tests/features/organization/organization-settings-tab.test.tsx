import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrganizationSettingsTab } from "@/features/organization/components/organization-settings-tab";

const getMeMock = vi.fn();
const getMyOrganizationMock = vi.fn();
const getOrganizationInvitationsMock = vi.fn();
const createOrganizationInvitationMock = vi.fn();
const revokeOrganizationInvitationMock = vi.fn();

vi.mock("@/lib/api/me", () => ({
  getMe: () => getMeMock(),
}));
vi.mock("@/lib/api/organization", () => ({
  getMyOrganization: () => getMyOrganizationMock(),
  getOrganizationInvitations: () => getOrganizationInvitationsMock(),
  createOrganizationInvitation: (...args: unknown[]) => createOrganizationInvitationMock(...args),
  revokeOrganizationInvitation: (...args: unknown[]) => revokeOrganizationInvitationMock(...args),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const owner = { id: "u1", email: "owner@example.com", organization_id: "o1", role: "owner", provider: "email" };
const agent = { id: "u2", email: "agent@example.com", organization_id: "o1", role: "agent", provider: "email" };
const org = { id: "o1", name: "Reyes Realty" };

function invitation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv-1",
    email: "colega@example.com",
    role: "agent",
    status: "pending",
    expires_at: "2026-10-09T00:00:00Z",
    accepted_at: null,
    created_at: "2026-10-02T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMyOrganizationMock.mockResolvedValue({ ok: true, data: org });
  getOrganizationInvitationsMock.mockResolvedValue({ ok: true, data: [] });
  revokeOrganizationInvitationMock.mockResolvedValue({ ok: true, data: undefined });
  // jsdom has no real clipboard by default.
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("OrganizationSettingsTab — role gating", () => {
  it("shows the organization name for every role", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: agent });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByDisplayValue("Reyes Realty")).toBeInTheDocument();
  });

  it("hides the invite form and never fetches invitations for a plain agent", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: agent });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByText(/only the organization's owner or an admin/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
    expect(getOrganizationInvitationsMock).not.toHaveBeenCalled();
  });

  it("shows the invite form and the invitations list for an owner", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: owner });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument();
    await waitFor(() => expect(getOrganizationInvitationsMock).toHaveBeenCalled());
  });
});

describe("OrganizationSettingsTab — inviting", () => {
  beforeEach(() => {
    getMeMock.mockResolvedValue({ ok: true, data: owner });
  });

  it("creates an invitation and shows a copyable link", async () => {
    createOrganizationInvitationMock.mockResolvedValue({
      ok: true,
      data: { ...invitation(), token: "tok-abc123" },
    });
    render(<OrganizationSettingsTab />);
    await screen.findByLabelText(/^email$/i);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "colega@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    await waitFor(() => expect(createOrganizationInvitationMock).toHaveBeenCalledWith("colega@example.com", "agent"));
    expect(await screen.findByDisplayValue(/invite=tok-abc123/)).toBeInTheDocument();
  });

  it("shows an error and never clears the form when creating fails", async () => {
    createOrganizationInvitationMock.mockResolvedValue({ ok: false, error: { status: 422, message: "Invalid" } });
    render(<OrganizationSettingsTab />);
    await screen.findByLabelText(/^email$/i);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "colega@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("colega@example.com");
  });
});

describe("OrganizationSettingsTab — listing / revoking", () => {
  beforeEach(() => {
    getMeMock.mockResolvedValue({ ok: true, data: owner });
  });

  it("shows an empty state when there are no invitations", async () => {
    render(<OrganizationSettingsTab />);
    expect(await screen.findByText(/no invitations yet/i)).toBeInTheDocument();
  });

  it("lists invitations with their status", async () => {
    getOrganizationInvitationsMock.mockResolvedValue({ ok: true, data: [invitation()] });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByText("colega@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("offers a revoke action only for pending invitations", async () => {
    getOrganizationInvitationsMock.mockResolvedValue({
      ok: true,
      data: [invitation({ id: "inv-1", status: "pending" }), invitation({ id: "inv-2", email: "ya@example.com", status: "revoked" })],
    });
    render(<OrganizationSettingsTab />);
    await screen.findByText("colega@example.com");

    expect(screen.getByRole("button", { name: /revoke invitation for colega@example.com/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revoke invitation for ya@example.com/i })).not.toBeInTheDocument();
  });

  it("revoking an invitation calls the API and refreshes the list", async () => {
    getOrganizationInvitationsMock.mockResolvedValueOnce({ ok: true, data: [invitation()] });
    render(<OrganizationSettingsTab />);
    await screen.findByText("colega@example.com");

    getOrganizationInvitationsMock.mockResolvedValueOnce({
      ok: true,
      data: [invitation({ status: "revoked" })],
    });
    fireEvent.click(screen.getByRole("button", { name: /revoke invitation for colega@example.com/i }));

    await waitFor(() => expect(revokeOrganizationInvitationMock).toHaveBeenCalledWith("inv-1"));
    expect(await screen.findByText("Revoked")).toBeInTheDocument();
  });
});
