import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Property, PropertyInput } from "@/features/properties/types";

/**
 * Typed surface for the backend's real, already-implemented Properties API
 * (app/api/routes/properties.py) — same shape and conventions as
 * lib/api/contacts.ts: mounted under /api/v1, a bare array for the list
 * endpoint (limit/offset, no `{items, total, page, pageSize}` envelope),
 * a bare object for a single property.
 *
 * `delete` is not implemented here — no "delete property" UI exists in
 * this app, unlike create/update below (the "Add property"/"Edit" flows —
 * see features/properties/components/property-form.tsx).
 */
export function getProperties(): Promise<ApiResult<Property[]>> {
  // The backend caps `limit` at 200 (app/api/routes/properties.py) — matches
  // lib/api/contacts.ts's same choice, good enough for the 14-property demo org.
  return apiRequest<Property[]>("/api/v1/properties", { params: { limit: 200 } });
}

export function getProperty(propertyId: string): Promise<ApiResult<Property>> {
  return apiRequest<Property>(`/api/v1/properties/${propertyId}`);
}

export function createProperty(input: PropertyInput): Promise<ApiResult<Property>> {
  return apiRequest<Property>("/api/v1/properties", { method: "POST", body: input });
}

export function updateProperty(propertyId: string, input: PropertyInput): Promise<ApiResult<Property>> {
  return apiRequest<Property>(`/api/v1/properties/${propertyId}`, { method: "PATCH", body: input });
}
