import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Property } from "@/features/properties/types";

/**
 * Typed surface for the backend's real, already-implemented Properties API
 * (app/api/routes/properties.py) — same shape and conventions as
 * lib/api/contacts.ts: mounted under /api/v1, a bare array for the list
 * endpoint (limit/offset, no `{items, total, page, pageSize}` envelope),
 * a bare object for a single property.
 *
 * Only the two read functions the current UI needs — create/update/delete
 * exist backend-side (see app/api/routes/properties.py) but there's no
 * "Add property" flow in this frontend yet (the button on the Properties
 * page is still disabled), so implementing them here now would be
 * speculative, unused code, same mistake lib/api/leads.ts made.
 */
export function getProperties(): Promise<ApiResult<Property[]>> {
  // The backend caps `limit` at 200 (app/api/routes/properties.py) — matches
  // lib/api/contacts.ts's same choice, good enough for the 14-property demo org.
  return apiRequest<Property[]>("/api/v1/properties", { params: { limit: 200 } });
}

export function getProperty(propertyId: string): Promise<ApiResult<Property>> {
  return apiRequest<Property>(`/api/v1/properties/${propertyId}`);
}
