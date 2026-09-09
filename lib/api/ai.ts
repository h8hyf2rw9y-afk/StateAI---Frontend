import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type {
  AiAgent,
  AiRecommendation,
  FollowUpResult,
  LeadIntelligenceResult,
} from "@/features/ai/types";

/**
 * getAgents/getRecommendations below are typed against speculative endpoints
 * (`/ai/agents`, `/ai/recommendations`) that don't exist on the backend yet
 * and aren't called anywhere in the app — see features/ai/mock-data.ts,
 * which the AI Assistant dashboard still renders directly. Left in place
 * only because removing unused exports isn't this task's concern; don't
 * treat their presence as confirmation those routes are real.
 */
export function getAgents(): Promise<ApiResult<AiAgent[]>> {
  return apiRequest<AiAgent[]>("/ai/agents");
}

export function getRecommendations(): Promise<ApiResult<AiRecommendation[]>> {
  return apiRequest<AiRecommendation[]>("/ai/recommendations");
}

/**
 * The two real, implemented agents — see app/api/routes/ai.py in the
 * backend, mounted under /api/v1 (app/main.py) unlike the speculative paths
 * above, which is why these build their path with that prefix explicitly
 * rather than through some shared "backend resource path" helper — no such
 * helper exists yet since every other module in this directory targets
 * routes that were never actually implemented backend-side this way.
 *
 * Both are POSTs (they run an LLM call, not a lookup) and both are
 * organization-scoped/authenticated by the backend itself from the bearer
 * token apiRequest attaches; the frontend only ever supplies `contactId`,
 * never an organization id (see this task's security objective — the
 * backend alone decides whether `contactId` belongs to the caller's org).
 *
 * A generous timeout: local Ollama inference on CPU-only hardware measured
 * at 93-125s per call in practice, against a 180s backend-side timeout
 * (OLLAMA_TIMEOUT_SECONDS) — this leaves headroom above that without ever
 * cutting off a request the backend is still legitimately working on.
 */
const AI_AGENT_TIMEOUT_MS = 200_000;

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
