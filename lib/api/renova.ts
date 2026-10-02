import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  RenovaCase,
  RenovaCaseBucket,
  RenovaCaseBucketCounts,
  RenovaCaseInput,
  RenovaCaseListItem,
  RenovaHistoryEntry,
  RenovaPipelineResponse,
  RenovaSensitiveData,
} from "@/features/renova/types";
import type { SmartQuickNotesExtraction } from "@/features/renova/lib/quick-notes";

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
  /** Omitted -> only non-archived cases (the default "Activos" view). true -> only archived ("Archivados"). Superseded by `bucket` when both are given. */
  archived?: boolean;
  /** Additive Leads → Renova tab filter — see RenovaCaseBucket. Takes precedence over `archived` when both are given. */
  bucket?: RenovaCaseBucket;
}

export function getRenovaCases(filters: RenovaCaseFilters = {}): Promise<ApiResult<RenovaCaseListItem[]>> {
  return apiRequest<RenovaCaseListItem[]>("/api/v1/renova/cases", {
    params: {
      limit: 200,
      q: filters.q?.trim() || undefined,
      status: filters.status || undefined,
      assigned_user_id: filters.assigned_user_id || undefined,
      archived: filters.archived,
      bucket: filters.bucket,
    },
  });
}

/** Counters for the three Leads → Renova tabs, from one grouped backend query — never the case rows themselves. */
export function getRenovaCaseCounts(): Promise<ApiResult<RenovaCaseBucketCounts>> {
  return apiRequest<RenovaCaseBucketCounts>("/api/v1/renova/cases/counts");
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

/** Sends only the browser-redacted note; protected numeric values must never be passed here. */
export function extractRenovaQuickNotes(content: string): Promise<ApiResult<SmartQuickNotesExtraction>> {
  return apiRequest<SmartQuickNotesExtraction>("/api/v1/renova/quick-notes/extract", {
    method: "POST",
    body: { content },
    cache: "no-store",
  });
}

/** The Renova Kanban board: every active-flow case, already grouped by stage — see GET /renova/pipeline. */
export function getRenovaPipeline(): Promise<ApiResult<RenovaPipelineResponse>> {
  return apiRequest<RenovaPipelineResponse>("/api/v1/renova/pipeline");
}

interface AuditLogRow {
  id: string;
  action: string;
  created_at: string;
}

/**
 * A case's movement history — read from the generic audit-log endpoint but
 * trimmed to what the UI may show: WHAT happened and WHEN. The rows' before/
 * after snapshots are dropped right here so they can never reach a component.
 */
export async function getRenovaHistory(caseId: string): Promise<ApiResult<RenovaHistoryEntry[]>> {
  const response = await apiRequest<AuditLogRow[]>("/api/v1/audit-logs", {
    params: { entity_type: "renova_case", entity_id: caseId, limit: 50 },
  });
  if (!response.ok) return response;
  return {
    ...response,
    data: response.data.map(({ id, action, created_at }) => ({ id, action, created_at })),
  };
}

/**
 * The full NSS and número de crédito of one case — the ONLY call that returns
 * them. The backend authorizes it (owner/admin or assigned advisor), audits it
 * without the values and marks it no-store; `cache: "no-store"` keeps the
 * browser from holding on to it too. Callers must keep the result in memory
 * only (see features/renova/lib/use-protected-data.ts): never storage, URLs,
 * logs or analytics.
 */
export function getRenovaSensitiveData(caseId: string): Promise<ApiResult<RenovaSensitiveData>> {
  return apiRequest<RenovaSensitiveData>(`/api/v1/renova/cases/${caseId}/sensitive-data`, { cache: "no-store" });
}

export type IneSide = "front" | "back";

export function getRenovaIne(caseId: string, side: IneSide): Promise<ApiResult<{ image: string }>> {
  return apiRequest<{ image: string }>(`/api/v1/renova/cases/${caseId}/ine/${side}`, { cache: "no-store" });
}

export function saveRenovaIne(caseId: string, side: IneSide, image: string): Promise<ApiResult<void>> {
  return apiRequest<void>(`/api/v1/renova/cases/${caseId}/ine/${side}`, { method: "PUT", body: { image }, cache: "no-store" });
}
