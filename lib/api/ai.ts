import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { AiAgent, AiRecommendation } from "@/features/ai/types";

/**
 * Typed surface for the future AI agent endpoints. No real model calls are
 * made from the frontend — the backend owns all AI provider integration
 * (OpenAI/Anthropic keys, prompts, orchestration). This module only ever
 * talks to the FastAPI backend, matching every other module in lib/api/.
 */
export function getAgents(): Promise<ApiResult<AiAgent[]>> {
  return apiRequest<AiAgent[]>("/ai/agents");
}

export function getRecommendations(): Promise<ApiResult<AiRecommendation[]>> {
  return apiRequest<AiRecommendation[]>("/ai/recommendations");
}
