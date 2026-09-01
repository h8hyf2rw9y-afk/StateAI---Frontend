import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Appointment } from "@/features/appointments/types";

/** Typed surface for the future `/appointments` FastAPI routes. See leads.ts for the pattern this follows. */
export function getAppointments(params?: {
  from?: string;
  to?: string;
}): Promise<ApiResult<Appointment[]>> {
  return apiRequest<Appointment[]>("/appointments", { params });
}

export function createAppointment(
  input: Omit<Appointment, "id">
): Promise<ApiResult<Appointment>> {
  return apiRequest<Appointment>("/appointments", {
    method: "POST",
    body: input,
  });
}

export function updateAppointment(
  id: string,
  input: Partial<Appointment>
): Promise<ApiResult<Appointment>> {
  return apiRequest<Appointment>(`/appointments/${id}`, {
    method: "PATCH",
    body: input,
  });
}
