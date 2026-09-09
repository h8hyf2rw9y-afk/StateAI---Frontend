import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Task } from "@/features/tasks/types";

/**
 * Typed surface for the backend's real, already-implemented Tasks API
 * (app/api/routes/tasks.py) — there was no prior speculative stub for this
 * one (unlike leads.ts/appointments.ts's old mock shapes): no lib/api/tasks.ts
 * existed at all before this task. Same conventions as every other real
 * module here: mounted under /api/v1, a bare array for the list endpoint
 * (limit/offset, no envelope).
 *
 * Only the one read function the current UI needs — `POST`/`PATCH`/`DELETE
 * /tasks/{id}` all exist backend-side but there's no create/edit/complete
 * flow in this frontend yet, matching the same restraint
 * lib/api/{properties,appointments}.ts already document for themselves.
 */
export function getTasks(params?: {
  status?: string;
  priority?: string;
  assigned_to_user_id?: string;
  contact_id?: string;
  property_id?: string;
  opportunity_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<Task[]>> {
  // The backend caps `limit` at 200 (app/api/routes/tasks.py) and always
  // sorts by due_at ascending (app/repositories/task_repo.py — there's no
  // sort param to request anything else) — same ceiling as every other
  // list endpoint in this app.
  return apiRequest<Task[]>("/api/v1/tasks", { params: { limit: 200, ...params } });
}
