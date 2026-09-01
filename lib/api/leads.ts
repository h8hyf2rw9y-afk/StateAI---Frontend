import { apiRequest } from "./client";
import type { ApiResult, PaginatedResponse } from "@/types/api";
import type { Lead } from "@/features/leads/types";

/**
 * Typed surface for the future `/leads` FastAPI routes.
 *
 * Nothing here is called yet — pages render features/leads/mock-data.ts
 * directly. Swapping a page from mock data to this module is meant to be a
 * one-line change once the backend exists, because the return shape
 * (Lead / Lead[]) already matches what the UI components expect.
 */
export function getLeads(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<PaginatedResponse<Lead>>> {
  return apiRequest<PaginatedResponse<Lead>>("/leads", { params });
}

export function getLead(id: string): Promise<ApiResult<Lead>> {
  return apiRequest<Lead>(`/leads/${id}`);
}

export function createLead(
  input: Omit<Lead, "id" | "createdAt">
): Promise<ApiResult<Lead>> {
  return apiRequest<Lead>("/leads", { method: "POST", body: input });
}

export function updateLead(
  id: string,
  input: Partial<Lead>
): Promise<ApiResult<Lead>> {
  return apiRequest<Lead>(`/leads/${id}`, { method: "PATCH", body: input });
}

export function deleteLead(id: string): Promise<ApiResult<void>> {
  return apiRequest<void>(`/leads/${id}`, { method: "DELETE" });
}
