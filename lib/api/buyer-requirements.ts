import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  BuyerRequirement,
  BuyerRequirementInput,
  PropertyMatch,
  PropertyMatchAnalysis,
} from "@/features/buyer-requirements/types";

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

/**
 * Single-requirement fetch (`GET /buyer-requirements/{id}`) — added for the
 * Opportunity detail page (app/(dashboard)/pipeline/[id]/page.tsx), which
 * needs to show the one buyer requirement an opportunity references by id,
 * not a contact's full list. Not previously exposed here because nothing
 * needed it before this task — the lead detail page's Buyer search section
 * only ever needed the per-contact list above.
 */
export function getBuyerRequirement(requirementId: string): Promise<ApiResult<BuyerRequirement>> {
  return apiRequest<BuyerRequirement>(`/api/v1/buyer-requirements/${requirementId}`);
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
  // Superseded in the UI by getBuyerRequirementPropertyMatches below (see
  // that function's own comment) — kept as-is, not removed, since it's
  // still a real, tested backend capability and this file's job is to
  // mirror the backend exactly, not decide what the UI currently uses.
  return apiRequest<PropertyMatch[]>(`/api/v1/buyer-requirements/${requirementId}/matches`);
}

/**
 * `GET /buyer-requirements/{id}/property-matches` — the richer, explainable
 * Buyer Matching analysis (Every active property in the organization,
 * classified match/partial_match/no_match with plain-English reasons —
 * see app/services/matching_service.py's `analyze_matches`). This is what
 * features/buyer-requirements/components/property-match-list.tsx actually
 * renders now; the older getBuyerRequirementMatches above is still real
 * and tested, just no longer what the UI calls for this. Still
 * deterministic, still no AI, still fast — same no-extended-timeout
 * reasoning as getBuyerRequirementMatches.
 */
export function getBuyerRequirementPropertyMatches(requirementId: string): Promise<ApiResult<PropertyMatchAnalysis[]>> {
  return apiRequest<PropertyMatchAnalysis[]>(`/api/v1/buyer-requirements/${requirementId}/property-matches`);
}
