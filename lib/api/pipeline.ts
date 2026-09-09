import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  Activity,
  Opportunity,
  OpportunityAppointment,
  OpportunityTask,
} from "@/features/pipeline/types";

/**
 * Typed surface for the backend's real, already-implemented Opportunities
 * API (app/api/routes/opportunities.py) — the actual CRM pipeline source of
 * truth, replacing this file's previous speculative `/pipeline/deals`
 * shape (which the backend never had). Same conventions as
 * lib/api/contacts.ts / lib/api/properties.ts: mounted under /api/v1, a
 * bare array for list endpoints (limit/offset, no envelope), a bare object
 * for a single opportunity.
 *
 * There is no top-level `POST /opportunities` (an Opportunity is always
 * created *for* a contact, `POST /contacts/{id}/opportunities` — same
 * pattern as Buyer Requirements/Property Interests) and no DELETE (an
 * Opportunity is business history — "removing" one means PATCHing
 * `stage: "lost"`, not deleting the row) — so, matching
 * lib/api/properties.ts's own restraint, only the functions the current UI
 * actually calls are implemented here: list, get, and the one supported
 * mutation (stage changes via PATCH).
 */
export function getOpportunities(params?: {
  opportunity_type?: string;
  stage?: string;
  owner_user_id?: string;
  contact_id?: string;
  property_id?: string;
  buyer_requirement_id?: string;
  is_closed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<Opportunity[]>> {
  // The backend caps `limit` at 200 (app/api/routes/opportunities.py) —
  // same ceiling as every other list endpoint in this app, good enough for
  // the demo org's 10 seeded opportunities.
  return apiRequest<Opportunity[]>("/api/v1/opportunities", {
    params: { limit: 200, ...params },
  });
}

export function getOpportunity(opportunityId: string): Promise<ApiResult<Opportunity>> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${opportunityId}`);
}

/**
 * The one write path this UI needs: changing an opportunity's stage
 * (including marking it won, marking it lost with a `lost_reason`, or
 * reopening a closed one back to a working stage) — all the same
 * `PATCH /opportunities/{id}` the backend exposes for every other field,
 * see OpportunityService.update. `lost_reason` is required by the backend
 * (422 without it) whenever the *resulting* stage is "lost" — the caller
 * (features/pipeline/components/stage-selector.tsx) is responsible for
 * collecting it before calling this.
 */
export function updateOpportunityStage(
  opportunityId: string,
  data: { stage: string; lost_reason?: string | null }
): Promise<ApiResult<Opportunity>> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${opportunityId}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * The opportunity's own timeline — includes the `stage_change` entries
 * OpportunityService writes automatically on every stage-changing PATCH
 * (see features/pipeline/types.ts's Activity section for why this is used
 * as the "stage history" view instead of GET /audit-logs).
 */
export function getOpportunityActivities(opportunityId: string): Promise<ApiResult<Activity[]>> {
  return apiRequest<Activity[]>(`/api/v1/opportunities/${opportunityId}/activities`);
}

/**
 * Tasks/appointments scoped to one opportunity, via the real backend's
 * `opportunity_id` query filter on the top-level list endpoints
 * (app/api/routes/tasks.py, app/api/routes/appointments.py) — there is no
 * nested `/opportunities/{id}/tasks` route, so this filters the same list
 * endpoint a future full Tasks/Appointments feature would also use.
 * Read-only: this task doesn't add create/edit/complete flows for either
 * (see features/pipeline/types.ts's OpportunityTask/OpportunityAppointment
 * doc comment).
 */
export function getTasksForOpportunity(opportunityId: string): Promise<ApiResult<OpportunityTask[]>> {
  return apiRequest<OpportunityTask[]>("/api/v1/tasks", { params: { opportunity_id: opportunityId, limit: 200 } });
}

export function getAppointmentsForOpportunity(
  opportunityId: string
): Promise<ApiResult<OpportunityAppointment[]>> {
  return apiRequest<OpportunityAppointment[]>("/api/v1/appointments", {
    params: { opportunity_id: opportunityId, limit: 200 },
  });
}
