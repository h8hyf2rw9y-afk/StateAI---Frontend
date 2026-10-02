import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { CurrentUser } from "@/lib/api/me";

/**
 * Bringing a specific person into YOUR organization (app/api/routes/
 * organization.py, app/services/organization_invitation_service.py) — as
 * opposed to lib/api/me.ts's `provisionMyOrganization`, which always
 * creates a brand-new one. No outbound email: the org has no email
 * integration, so the owner shares the generated link themselves.
 */
export interface Organization {
  id: string;
  name: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked";

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

/** Only the create response ever carries the token — see the backend schema's own doc comment for why. */
export interface OrganizationInvitationCreated extends OrganizationInvitation {
  token: string;
}

export interface OrganizationInvitationPreview {
  valid: boolean;
  organization_name: string | null;
}

export function getMyOrganization(): Promise<ApiResult<Organization>> {
  return apiRequest<Organization>("/api/v1/organization");
}

export function createOrganizationInvitation(
  email: string,
  role: "admin" | "agent" = "agent"
): Promise<ApiResult<OrganizationInvitationCreated>> {
  return apiRequest<OrganizationInvitationCreated>("/api/v1/organization/invitations", {
    method: "POST",
    body: { email, role },
  });
}

export function getOrganizationInvitations(): Promise<ApiResult<OrganizationInvitation[]>> {
  return apiRequest<OrganizationInvitation[]>("/api/v1/organization/invitations", { cache: "no-store" });
}

export function revokeOrganizationInvitation(invitationId: string): Promise<ApiResult<void>> {
  return apiRequest<void>(`/api/v1/organization/invitations/${invitationId}`, { method: "DELETE" });
}

/** Public — no session required. The register page calls this before anyone signs in, to show which organization a link joins. */
export function previewOrganizationInvitation(token: string): Promise<ApiResult<OrganizationInvitationPreview>> {
  return apiRequest<OrganizationInvitationPreview>(`/api/v1/organization/invitations/preview/${token}`, {
    cache: "no-store",
  });
}

/** The invited-teammate counterpart to provisionMyOrganization — joins the inviter's EXISTING organization instead of creating a new one. */
export function joinOrganization(token: string): Promise<ApiResult<CurrentUser>> {
  return apiRequest<CurrentUser>("/api/v1/me/organization/join", {
    method: "POST",
    body: { token },
  });
}
