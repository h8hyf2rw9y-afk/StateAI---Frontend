import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Task, TaskInput } from "@/features/tasks/types";

/**
 * Typed surface for the backend's real, already-implemented Tasks API
 * (app/api/routes/tasks.py) — there was no prior speculative stub for this
 * one (unlike leads.ts/appointments.ts's old mock shapes): no lib/api/tasks.ts
 * existed at all before this task. Same conventions as every other real
 * module here: mounted under /api/v1, a bare array for the list endpoint
 * (limit/offset, no envelope).
 *
 * `DELETE /tasks/{id}` exists backend-side but isn't implemented here — no
 * "delete task" UI exists in this app, unlike create/update below (see
 * features/tasks/components/task-form.tsx).
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

export function createTask(input: TaskInput): Promise<ApiResult<Task>> {
  return apiRequest<Task>("/api/v1/tasks", { method: "POST", body: input });
}

export function updateTask(taskId: string, input: TaskInput): Promise<ApiResult<Task>> {
  return apiRequest<Task>(`/api/v1/tasks/${taskId}`, { method: "PATCH", body: input });
}
