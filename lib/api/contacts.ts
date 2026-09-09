import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Contact, ContactInput } from "@/features/leads/types";

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

/** `POST /contacts` — the backend requires at least one of email/phone (app/schemas/contact.py's ContactCreate, enforced server-side); see features/leads/components/contact-form.tsx for the client-side nudge. */
export function createContact(input: ContactInput): Promise<ApiResult<Contact>> {
  return apiRequest<Contact>("/api/v1/contacts", { method: "POST", body: input });
}

export function updateContact(contactId: string, input: ContactInput): Promise<ApiResult<Contact>> {
  return apiRequest<Contact>(`/api/v1/contacts/${contactId}`, { method: "PATCH", body: input });
}

/** `POST /contacts/{id}/roles` — assigns one role; roles have no separate update, only add/remove (app/api/routes/contacts.py). */
export function addContactRole(contactId: string, roleKey: string): Promise<ApiResult<Contact>> {
  return apiRequest<Contact>(`/api/v1/contacts/${contactId}/roles`, { method: "POST", body: { role_key: roleKey } });
}

export function removeContactRole(contactId: string, roleKey: string): Promise<ApiResult<Contact>> {
  return apiRequest<Contact>(`/api/v1/contacts/${contactId}/roles/${roleKey}`, { method: "DELETE" });
}
