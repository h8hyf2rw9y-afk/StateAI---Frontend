import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  Activity,
  Opportunity,
  OpportunityAppointment,
  OpportunityInput,
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
 * pattern as Buyer Requirements/Property Interests, see createOpportunity
 * below) and no DELETE (an Opportunity is business history — "removing"
 * one means PATCHing `stage: "lost"`, not deleting the row).
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
 * `POST /contacts/{contact_id}/opportunities` — `contact_id` is a path
 * segment, never part of the body (matching the backend's own
 * OpportunityCreate, which has no `contact_id` field to send), and
 * `opportunity_type` is a required, separate argument from the rest of
 * `OpportunityInput` since it's immutable after creation — see that type's
 * own doc comment in features/pipeline/types.ts.
 */
export function createOpportunity(
  contactId: string,
  opportunityType: string,
  input: OpportunityInput
): Promise<ApiResult<Opportunity>> {
  return apiRequest<Opportunity>(`/api/v1/contacts/${contactId}/opportunities`, {
    method: "POST",
    body: { ...input, opportunity_type: opportunityType },
  });
}

/**
 * The general-purpose `PATCH /opportunities/{id}` for every field besides
 * stage (title/description/property/buyer requirement/expected value/
 * probability/expected close date) — deliberately separate from
 * updateOpportunityStage above, which owns stage/lost_reason changes and
 * the UI that collects a reason before calling it
 * (features/pipeline/components/stage-selector.tsx). Both call the exact
 * same backend endpoint; splitting them is a frontend-only convenience so
 * neither caller has to know about fields it doesn't own — the backend
 * itself doesn't distinguish "a stage PATCH" from "any other PATCH," and
 * still writes the same stage_change Activity/audit record whenever
 * `stage` is actually present in the body, regardless of which of these
 * two functions sent it.
 */
export function updateOpportunity(opportunityId: string, input: OpportunityInput): Promise<ApiResult<Opportunity>> {
  return apiRequest<Opportunity>(`/api/v1/opportunities/${opportunityId}`, {
    method: "PATCH",
    body: input,
  });
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
