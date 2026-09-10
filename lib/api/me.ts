import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";

/**
 * Mirrors the backend's CurrentUser schema (app/schemas/user.py) field for
 * field — the identity GET /me and POST /me/organization both return.
 */
export interface CurrentUser {
  id: string;
  email: string | null;
  organization_id: string;
  role: "owner" | "admin" | "agent";
  provider: string | null;
}

/**
 * `POST /me/organization` — self-service onboarding (see
 * app/api/routes/me.py / app/services/onboarding_service.py). Turns a real,
 * signed-in-but-unprovisioned Supabase session into a usable, org-scoped
 * account: a brand-new Organization plus the `users` bridge row every
 * other route needs to resolve organization scope. `name` is optional —
 * the backend derives a reasonable default from the caller's own JWT
 * claims (first_name/last_name from signUp, or their email) when omitted,
 * so no new "organization name" form field was needed for this.
 *
 * Idempotent: safe to call unconditionally right after every real sign-in
 * (see LoginForm/RegisterForm/app/auth/callback/route.ts) — a caller who's
 * already provisioned just gets their existing identity back, never a
 * second organization.
 */
export function provisionMyOrganization(name?: string): Promise<ApiResult<CurrentUser>> {
  return apiRequest<CurrentUser>("/api/v1/me/organization", {
    method: "POST",
    body: name ? { name } : {},
  });
}
