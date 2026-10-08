import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const signUpMock = vi.fn();
const signInWithOAuthMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const joinOrganizationMock = vi.fn();
const previewOrganizationInvitationMock = vi.fn();
let searchParamsString = "";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: signUpMock, signInWithOAuth: signInWithOAuthMock } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));
vi.mock("@/lib/api/organization", () => ({
  joinOrganization: (...args: unknown[]) => joinOrganizationMock(...args),
  previewOrganizationInvitation: (...args: unknown[]) => previewOrganizationInvitationMock(...args),
}));

const { RegisterForm } = await import("@/features/auth/components/register-form");

function validPreview() {
  previewOrganizationInvitationMock.mockResolvedValue({
    ok: true,
    data: { valid: true, organization_name: "Grupo Retify" },
  });
}

async function unlockWithCode(code = "ABCDE-FG234") {
  fireEvent.change(screen.getByLabelText(/código de invitación/i), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: /verificar código/i }));
  await screen.findByText("Grupo Retify");
}

function fillEmailForm() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Reyes" } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "password123" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsString = "";
});

describe("RegisterForm invitation gate", () => {
  it("requires an invitation code before showing Google or account fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/código de invitación/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
  });

  it("validates a typed code and unlocks Google sign-up", async () => {
    validPreview();
    render(<RegisterForm />);
    await unlockWithCode("abcde fg234");

    expect(previewOrganizationInvitationMock).toHaveBeenCalledWith("ABCDE FG234");
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it("keeps the gate closed for an invalid code", async () => {
    previewOrganizationInvitationMock.mockResolvedValue({ ok: true, data: { valid: false, organization_name: null } });
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/código de invitación/i), { target: { value: "BAD-CODE" } });
    fireEvent.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/inválido, vencido o utilizado/i);
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it("validates a code received in the invitation link", async () => {
    searchParamsString = "invite=ABCDE-FG234";
    validPreview();
    render(<RegisterForm />);

    expect(await screen.findByText("Grupo Retify")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });
});

describe("RegisterForm invitation consumption", () => {
  it("joins the invited organization after an immediate email sign-up", async () => {
    validPreview();
    signUpMock.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    joinOrganizationMock.mockResolvedValue({ ok: true, data: { role: "renova_agent" } });

    render(<RegisterForm />);
    await unlockWithCode();
    fillEmailForm();
    fireEvent.click(screen.getByRole("button", { name: /unirme con correo/i }));

    await waitFor(() => expect(joinOrganizationMock).toHaveBeenCalledWith("ABCDE-FG234"));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("never creates a private workspace when consuming the invitation fails", async () => {
    validPreview();
    signUpMock.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    joinOrganizationMock.mockResolvedValue({ ok: false, error: { status: 403 } });

    render(<RegisterForm />);
    await unlockWithCode();
    fillEmailForm();
    fireEvent.click(screen.getByRole("button", { name: /unirme con correo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mismo correo/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("carries the verified code through email confirmation", async () => {
    validPreview();
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });

    render(<RegisterForm />);
    await unlockWithCode();
    fillEmailForm();
    fireEvent.click(screen.getByRole("button", { name: /unirme con correo/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    expect(signUpMock.mock.calls[0][0].options.emailRedirectTo).toContain("invite=ABCDE-FG234");
  });
});
