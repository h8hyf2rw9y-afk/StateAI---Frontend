import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signUpMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const provisionMyOrganizationMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: signUpMock } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/api/me", () => ({
  provisionMyOrganization: (...args: unknown[]) => provisionMyOrganizationMock(...args),
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
