import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { RenovaCase, RenovaCaseInput, RenovaCaseListItem } from "@/features/renova/types";

/**
 * Typed surface for the backend's Renova API (app/api/routes/renova.py) — the
 * independent house-flipping module. Deliberately its own file: Renova
 * records are not Contacts, and nothing here touches lib/api/contacts.ts.
 *
 * No `organization_id` is ever sent — the backend derives it from the bearer
 * token — and there is no delete: a case that is no longer pursued is moved
 * to status "cancelled" with an ordinary update.
 *
 * The list is lean (no NSS / credit number, not even masked); only the
 * single-case GET/POST/PATCH responses carry the masked values.
 */
export interface RenovaCaseFilters {
  /** Matches the owner's name or phone. */
  q?: string;
  status?: string;
  assigned_user_id?: string;
}

export function getRenovaCases(filters: RenovaCaseFilters = {}): Promise<ApiResult<RenovaCaseListItem[]>> {
  return apiRequest<RenovaCaseListItem[]>("/api/v1/renova/cases", {
    params: {
      limit: 200,
      q: filters.q?.trim() || undefined,
      status: filters.status || undefined,
      assigned_user_id: filters.assigned_user_id || undefined,
    },
  });
}

export function getRenovaCase(caseId: string): Promise<ApiResult<RenovaCase>> {
  return apiRequest<RenovaCase>(`/api/v1/renova/cases/${caseId}`);
}

export function createRenovaCase(input: RenovaCaseInput): Promise<ApiResult<RenovaCase>> {
  return apiRequest<RenovaCase>("/api/v1/renova/cases", { method: "POST", body: input });
}

export function updateRenovaCase(caseId: string, input: RenovaCaseInput): Promise<ApiResult<RenovaCase>> {
  return apiRequest<RenovaCase>(`/api/v1/renova/cases/${caseId}`, { method: "PATCH", body: input });
}
