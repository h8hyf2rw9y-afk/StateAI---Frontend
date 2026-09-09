import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Contact } from "@/features/leads/types";

/**
 * Typed surface for the backend's real, already-implemented Contacts API
 * (app/api/routes/contacts.py) — the actual CRM source of truth, unlike
 * lib/api/leads.ts's speculative `/leads` resource (which the backend
 * doesn't have; see that file's own comment). Mounted under /api/v1, same
 * as lib/api/ai.ts's real endpoints, which is why the path is built with
 * that prefix explicitly here too.
 *
 * The backend returns a bare array for the list endpoint (limit/offset
 * query params, no `{items, total, page, pageSize}` envelope) and a bare
 * object for a single contact — there's no PaginatedResponse<T> wrapper to
 * reuse here, unlike lib/api/leads.ts's (never-implemented-backend-side)
 * assumption of one.
 */
export function getContacts(): Promise<ApiResult<Contact[]>> {
  // The backend caps `limit` at 200 (app/api/routes/contacts.py) — good
  // enough for now given the demo org has 20 contacts; real pagination UI
  // is future work once an organization's contact count could exceed this.
  return apiRequest<Contact[]>("/api/v1/contacts", { params: { limit: 200 } });
}

export function getContact(contactId: string): Promise<ApiResult<Contact>> {
  return apiRequest<Contact>(`/api/v1/contacts/${contactId}`);
}
