import { apiRequest } from "./client";
import type { ApiResult, PaginatedResponse } from "@/types/api";
import type { Property } from "@/features/properties/types";

/** Typed surface for the future `/properties` FastAPI routes. See leads.ts for the pattern this follows. */
export function getProperties(params?: {
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<PaginatedResponse<Property>>> {
  return apiRequest<PaginatedResponse<Property>>("/properties", { params });
}

export function getProperty(id: string): Promise<ApiResult<Property>> {
  return apiRequest<Property>(`/properties/${id}`);
}

export function createProperty(
  input: Omit<Property, "id" | "createdAt">
): Promise<ApiResult<Property>> {
  return apiRequest<Property>("/properties", { method: "POST", body: input });
}

export function updateProperty(
  id: string,
  input: Partial<Property>
): Promise<ApiResult<Property>> {
  return apiRequest<Property>(`/properties/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteProperty(id: string): Promise<ApiResult<void>> {
  return apiRequest<void>(`/properties/${id}`, { method: "DELETE" });
}
