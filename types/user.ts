/**
 * Cross-cutting identity types shared across the whole app.
 *
 * These model the future Organization -> Team -> User hierarchy so the
 * frontend is not architecturally blocked when multi-tenancy is implemented
 * on the backend. None of this is wired to real auth yet — see lib/auth/.
 */

/** "renova_agent" only ever uses the Renova module, and only sees their own cases there (see features/auth/access.ts). */
export type UserRole = "owner" | "admin" | "agent" | "renova_agent";

export interface Organization {
  id: string;
  name: string;
  /** e.g. "individual" | "team" | "agency" — informs future plan/billing logic. */
  plan: "individual" | "team" | "agency";
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
}

export interface User {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}
