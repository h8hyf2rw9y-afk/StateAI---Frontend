import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Activity } from "@/features/pipeline/types";

/**
 * `GET /activities` — the org-wide "recent activity" feed (added in the CRM
 * Integration Gaps task, app/api/routes/activities.py), newest first. Every
 * other activity route is scoped to one contact/property/opportunity (see
 * lib/api/pipeline.ts's getOpportunityActivities) — this is the one
 * top-level list, used only by the Dashboard's recent-activity widget.
 * Reuses the real `Activity` type from features/pipeline/types.ts rather
 * than redefining it — same type the opportunity detail page's activity
 * list already renders, just not scoped to one opportunity here.
 */
export function getRecentActivities(limit = 10): Promise<ApiResult<Activity[]>> {
  return apiRequest<Activity[]>("/api/v1/activities", { params: { limit } });
}
