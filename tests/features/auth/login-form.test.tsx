import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signInWithPasswordMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
const provisionMyOrganizationMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: signInWithPasswordMock } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/api/me", () => ({
  provisionMyOrganization: (...args: unknown[]) => provisionMyOrganizationMock(...args),
}));

const { LoginForm } = await import("@/features/auth/components/login-form");

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions the caller's organization after a successful sign-in, before redirecting", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    provisionMyOrganizationMock.mockResolvedValue({ ok: true, data: { id: "u1", organization_id: "o1", role: "owner", email: null, provider: null } });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(provisionMyOrganizationMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("does not attempt to provision an organization when sign-in fails", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid credentials", code: "invalid_credentials" } });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "wrongpassword1" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(provisionMyOrganizationMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("still redirects even if provisioning fails — never strands the user on a login error for a backend-side issue", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    provisionMyOrganizationMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });
});
