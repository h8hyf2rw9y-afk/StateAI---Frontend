import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { FollowUpResult, LeadIntelligenceResult, PipelineResult } from "@/features/ai/types";

/**
 * The three real, implemented agents — see app/api/routes/ai.py in the
 * backend, mounted under /api/v1 (app/main.py), which is why these build
 * their path with that prefix explicitly rather than through some shared
 * "backend resource path" helper — no such helper exists yet since every
 * other module in this directory targets routes implemented a different way.
 *
 * (The previous speculative `getAgents`/`getRecommendations` — typed against
 * `/ai/agents`/`/ai/recommendations`, which the backend never had — were
 * removed in the CRM Integration Gaps task along with the mock AI Assistant
 * page that was their only caller. The three functions below are the real
 * replacement.)
 *
 * All three are POSTs (they run an LLM call, not a lookup) and are
 * organization-scoped/authenticated by the backend itself from the bearer
 * token apiRequest attaches; the frontend only ever supplies `contactId`,
 * never an organization id (see this task's security objective — the
 * backend alone decides whether `contactId` belongs to the caller's org).
 *
 * A generous timeout: local Ollama inference on CPU-only hardware initially
 * measured at 93-125s per call, but a later live QA pass (CRM Integration &
 * QA phase) measured real calls up to ~185s on the same setup — enough to
 * trip the original 180s backend-side timeout (OLLAMA_TIMEOUT_SECONDS) on
 * roughly half of a small sample. The backend timeout was raised to 240s in
 * response; this stays comfortably above that so the backend's own clean 504
 * always arrives before this fetch would otherwise abort blindly.
 */
const AI_AGENT_TIMEOUT_MS = 260_000;

export function getLeadIntelligence(contactId: string): Promise<ApiResult<LeadIntelligenceResult>> {
  return apiRequest<LeadIntelligenceResult>(`/api/v1/ai/lead-intelligence/${contactId}`, {
    method: "POST",
    timeoutMs: AI_AGENT_TIMEOUT_MS,
  });
}

export function getFollowUpRecommendation(contactId: string): Promise<ApiResult<FollowUpResult>> {
  return apiRequest<FollowUpResult>(`/api/v1/ai/follow-up/${contactId}`, {
    method: "POST",
    timeoutMs: AI_AGENT_TIMEOUT_MS,
  });
}

/**
 * `POST /ai/pipeline/{contact_id}` — the Pipeline Agent: analyzes every
 * Opportunity this contact has and returns pipeline-level priority, risk
 * flags, and recommended next actions. Read-only, same as the two above —
 * see features/ai/components/pipeline-panel.tsx for the frontend surface
 * (added in the CRM Integration Gaps task; the backend endpoint itself
 * already existed and had already been tested against real Ollama before
 * this task gave it a UI).
 */
export function getPipelineAnalysis(contactId: string): Promise<ApiResult<PipelineResult>> {
  return apiRequest<PipelineResult>(`/api/v1/ai/pipeline/${contactId}`, {
    method: "POST",
    timeoutMs: AI_AGENT_TIMEOUT_MS,
  });
}
