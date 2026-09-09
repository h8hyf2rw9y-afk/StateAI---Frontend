import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { BuyerRequirement, BuyerRequirementInput, PropertyMatch } from "@/features/buyer-requirements/types";

/**
 * Typed surface for the backend's real, already-implemented Buyer
 * Requirements API (app/api/routes/buyer_requirements.py +
 * app/api/routes/contacts.py's nested routes) — same conventions as
 * lib/api/contacts.ts / lib/api/properties.ts.
 *
 * Creation and listing-for-a-contact are nested under /contacts (there is
 * no top-level POST /buyer-requirements or GET /contacts/{id}/... shortcut
 * the other way around) — matching the backend exactly rather than
 * inventing a flatter shape. Deleting/removing a location isn't
 * implemented backend-side (only adding one is), so there's no function
 * for it here — see features/buyer-requirements/components/buyer-requirement-form.tsx
 * for what that means for editing.
 */
export function getBuyerRequirementsForContact(contactId: string): Promise<ApiResult<BuyerRequirement[]>> {
  return apiRequest<BuyerRequirement[]>(`/api/v1/contacts/${contactId}/buyer-requirements`);
}

export function createBuyerRequirement(
  contactId: string,
  input: BuyerRequirementInput
): Promise<ApiResult<BuyerRequirement>> {
  return apiRequest<BuyerRequirement>(`/api/v1/contacts/${contactId}/buyer-requirements`, {
    method: "POST",
    body: input,
  });
}

export function updateBuyerRequirement(
  requirementId: string,
  input: BuyerRequirementInput
): Promise<ApiResult<BuyerRequirement>> {
  return apiRequest<BuyerRequirement>(`/api/v1/buyer-requirements/${requirementId}`, {
    method: "PATCH",
    body: input,
  });
}

export function addBuyerRequirementLocation(
  requirementId: string,
  location: { city?: string; state?: string; neighborhood?: string; priority?: number }
): Promise<ApiResult<BuyerRequirement>> {
  return apiRequest<BuyerRequirement>(`/api/v1/buyer-requirements/${requirementId}/locations`, {
    method: "POST",
    body: location,
  });
}

export function getBuyerRequirementMatches(requirementId: string): Promise<ApiResult<PropertyMatch[]>> {
  // Deterministic, backend-computed (app/services/matching_service.py) —
  // no AI, no score. This call is fast (plain SQL filtering), unlike the
  // AI endpoints in lib/api/ai.ts, so no extended timeout is needed here.
  return apiRequest<PropertyMatch[]>(`/api/v1/buyer-requirements/${requirementId}/matches`);
}
