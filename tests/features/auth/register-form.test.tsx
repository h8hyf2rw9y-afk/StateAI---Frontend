import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signUpMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const provisionMyOrganizationMock = vi.fn();
const joinOrganizationMock = vi.fn();
const previewOrganizationInvitationMock = vi.fn();
let searchParamsString = "";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: signUpMock } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));
vi.mock("@/lib/api/me", () => ({
  provisionMyOrganization: (...args: unknown[]) => provisionMyOrganizationMock(...args),
}));
vi.mock("@/lib/api/organization", () => ({
  joinOrganization: (...args: unknown[]) => joinOrganizationMock(...args),
  previewOrganizationInvitation: (...args: unknown[]) => previewOrganizationInvitationMock(...args),
}));

const { RegisterForm } = await import("@/features/auth/components/register-form");

function fillForm() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Reyes" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
}

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsString = "";
  });

  it("provisions an organization and redirects when Supabase returns an immediate session (email confirmation off)", async () => {
    signUpMock.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    provisionMyOrganizationMock.mockResolvedValue({ ok: true, data: { id: "u1", organization_id: "o1", role: "owner", email: null, provider: null } });

    render(<RegisterForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(provisionMyOrganizationMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("does NOT attempt to provision an organization when email confirmation is required (no session yet)", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<RegisterForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument());
    expect(provisionMyOrganizationMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not attempt to provision an organization when sign-up itself fails", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: { message: "Email already registered", code: "user_already_exists" } });

    render(<RegisterForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(provisionMyOrganizationMock).not.toHaveBeenCalled();
  });
});

describe("RegisterForm — with ?invite=", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsString = "invite=tok123";
  });

  it("shows which organization a valid invite joins, and relabels the button", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: true, organization_name: "Reyes Realty" } });

    render(<RegisterForm />);

    expect(await screen.findByText("Reyes Realty")).toBeInTheDocument();
    expect(screen.getByText(/you've been invited to join/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join workspace/i })).toBeInTheDocument();
  });

  it("warns, but still allows signing up normally, when the invite is no longer valid", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: false, organization_name: null } });

    render(<RegisterForm />);

    expect(await screen.findByText(/no longer valid/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create account$/i })).toBeInTheDocument();
  });

  it("joins the inviter's organization (not a new one) on immediate sign-in", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: true, organization_name: "Reyes Realty" } });
    signUpMock.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    joinOrganizationMock.mockResolvedValue({ ok: true, data: { id: "u1", organization_id: "o1", role: "agent", email: null, provider: null } });

    render(<RegisterForm />);
    await screen.findByText("Reyes Realty");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /join workspace/i }));

    await waitFor(() => expect(joinOrganizationMock).toHaveBeenCalledWith("tok123"));
    expect(provisionMyOrganizationMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("falls back to creating a new organization if joining fails after sign-in", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: true, organization_name: "Reyes Realty" } });
    signUpMock.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    joinOrganizationMock.mockResolvedValue({ ok: false, error: { status: 404 } });
    provisionMyOrganizationMock.mockResolvedValue({ ok: true, data: { id: "u1", organization_id: "o2", role: "owner", email: null, provider: null } });

    render(<RegisterForm />);
    await screen.findByText("Reyes Realty");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /join workspace/i }));

    await waitFor(() => expect(provisionMyOrganizationMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("passes the invite token through emailRedirectTo when confirmation is required", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: true, organization_name: "Reyes Realty" } });
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<RegisterForm />);
    await screen.findByText("Reyes Realty");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /join workspace/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    const options = signUpMock.mock.calls[0][0].options;
    expect(options.emailRedirectTo).toContain("invite=tok123");
  });

  it("never sends an invite token that was never confirmed valid", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: false, organization_name: null } });
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<RegisterForm />);
    await screen.findByText(/no longer valid/i);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    const options = signUpMock.mock.calls[0][0].options;
    expect(options.emailRedirectTo).not.toContain("invite=");
  });
});
