import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrganizationSettingsTab } from "@/features/organization/components/organization-settings-tab";

const getMeMock = vi.fn();
const getMyOrganizationMock = vi.fn();

vi.mock("@/lib/api/me", () => ({
  getMe: () => getMeMock(),
}));
vi.mock("@/lib/api/organization", () => ({
  getMyOrganization: () => getMyOrganizationMock(),
}));

const owner = { id: "u1", email: "owner@example.com", organization_id: "o1", role: "owner", provider: "email" };
const agent = { id: "u2", email: "agent@example.com", organization_id: "o1", role: "agent", provider: "email" };
const renovaAgent = { ...agent, id: "u3", role: "renova_agent" };
const org = { id: "o1", name: "Reyes Realty" };

beforeEach(() => {
  vi.clearAllMocks();
  getMyOrganizationMock.mockResolvedValue({ ok: true, data: org });
});

describe("OrganizationSettingsTab", () => {
  it("shows the organization name and the caller's role", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: renovaAgent });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByDisplayValue("Reyes Realty")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Asesor Renova")).toBeInTheDocument();
  });

  it("points owners to Administración instead of duplicating the invite form", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: owner });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByRole("link", { name: /ir a administración/i })).toHaveAttribute("href", "/admin");
    expect(screen.queryByLabelText(/^correo$/i)).not.toBeInTheDocument();
  });

  it("tells a plain agent only an owner or admin can invite", async () => {
    getMeMock.mockResolvedValue({ ok: true, data: agent });
    render(<OrganizationSettingsTab />);

    expect(await screen.findByText(/only the organization's owner or an admin/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /administración/i })).not.toBeInTheDocument();
  });
});
