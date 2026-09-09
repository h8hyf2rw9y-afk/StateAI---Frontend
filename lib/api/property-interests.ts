import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { PropertyInterest } from "@/features/buyer-requirements/types";

/**
 * Typed surface for the backend's real Property Interests API — Case A
 * ("interested in this specific property"), as opposed to Buyer
 * Requirements' Case B. Only the one read function the current UI needs:
 * there's no top-level `GET /property-interests` (list-all) backend-side,
 * only the nested per-contact list and creation
 * (`GET/POST /contacts/{id}/property-interests`) and a per-id
 * get/patch/delete — this app doesn't create or edit a property interest
 * yet, only displays existing ones on the lead detail page.
 */
export function getPropertyInterestsForContact(contactId: string): Promise<ApiResult<PropertyInterest[]>> {
  return apiRequest<PropertyInterest[]>(`/api/v1/contacts/${contactId}/property-interests`);
}
