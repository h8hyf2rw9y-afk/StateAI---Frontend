import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { PropertyInterest } from "@/features/buyer-requirements/types";

/**
 * Typed surface for the backend's real Property Interests API — Case A
 * ("interested in this specific property"), as opposed to Buyer
 * Requirements' Case B. There's no top-level `GET /property-interests`
 * (list-all) backend-side, only the nested per-contact list/creation
 * (`GET/POST /contacts/{id}/property-interests`) and a per-id get/patch/delete.
 */
export function getPropertyInterestsForContact(contactId: string): Promise<ApiResult<PropertyInterest[]>> {
  return apiRequest<PropertyInterest[]>(`/api/v1/contacts/${contactId}/property-interests`);
}

/**
 * "This client is interested in this property" — used for manually
 * assigning a matched or browsed property to a buyer (see
 * features/buyer-requirements/components/property-match-list.tsx's
 * "Assign to client" button). No `organization_id` here or anywhere in
 * this file — the backend derives it from the bearer token.
 */
export function createPropertyInterest(
  contactId: string,
  data: { property_id: string; status?: string; notes?: string }
): Promise<ApiResult<PropertyInterest>> {
  return apiRequest<PropertyInterest>(`/api/v1/contacts/${contactId}/property-interests`, {
    method: "POST",
    body: data,
  });
}
