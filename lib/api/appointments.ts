import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { AppointmentRecord } from "@/features/appointments/types";

/**
 * Typed surface for the backend's real, already-implemented Appointments
 * API (app/api/routes/appointments.py) — replaces this file's previous
 * speculative `/appointments` shape (no `/api/v1` prefix, mock field names
 * like `date`/`time`/`leadName`). Same conventions as lib/api/properties.ts
 * / lib/api/pipeline.ts: mounted under /api/v1, a bare array for the list
 * endpoint (limit/offset, no envelope).
 *
 * Only the one read function the current UI needs — `POST`/`PATCH`/`DELETE
 * /appointments/{id}` all exist backend-side (app/api/routes/appointments.py)
 * but there's no create/edit/cancel flow in this frontend yet (the
 * "Schedule appointment" button on the Appointments page is still
 * disabled, same as "Add property"/"Add lead"), so implementing them here
 * now would be speculative, unused code — same restraint
 * lib/api/properties.ts already documents for itself.
 */
export function getAppointments(params?: {
  status?: string;
  contact_id?: string;
  property_id?: string;
  opportunity_id?: string;
  assigned_to_user_id?: string;
  start_from?: string;
  start_to?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<AppointmentRecord[]>> {
  // The backend caps `limit` at 200 (app/api/routes/appointments.py) and
  // always sorts by start_at ascending (app/repositories/appointment_repo.py
  // — there's no sort param to request anything else) — same ceiling as
  // every other list endpoint in this app.
  return apiRequest<AppointmentRecord[]>("/api/v1/appointments", {
    params: { limit: 200, ...params },
  });
}
