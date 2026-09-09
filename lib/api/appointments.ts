import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { AppointmentRecord, AppointmentInput } from "@/features/appointments/types";

/**
 * Typed surface for the backend's real, already-implemented Appointments
 * API (app/api/routes/appointments.py) — replaces this file's previous
 * speculative `/appointments` shape (no `/api/v1` prefix, mock field names
 * like `date`/`time`/`leadName`). Same conventions as lib/api/properties.ts
 * / lib/api/pipeline.ts: mounted under /api/v1, a bare array for the list
 * endpoint (limit/offset, no envelope).
 *
 * `DELETE /appointments/{id}` exists backend-side but isn't implemented
 * here — no "cancel/delete appointment" UI exists in this app, unlike
 * create/update below (see
 * features/appointments/components/appointment-form.tsx).
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

/** `POST /appointments` — the backend requires `start_at <= end_at` (app/schemas/appointment.py's model_validator, re-checked server-side on update too); see appointment-form.tsx for the client-side nudge. */
export function createAppointment(input: AppointmentInput): Promise<ApiResult<AppointmentRecord>> {
  return apiRequest<AppointmentRecord>("/api/v1/appointments", { method: "POST", body: input });
}

export function updateAppointment(
  appointmentId: string,
  input: AppointmentInput
): Promise<ApiResult<AppointmentRecord>> {
  return apiRequest<AppointmentRecord>(`/api/v1/appointments/${appointmentId}`, { method: "PATCH", body: input });
}
