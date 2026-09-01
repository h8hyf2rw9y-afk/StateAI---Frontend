import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Deal, PipelineStage } from "@/features/pipeline/types";

/** Typed surface for the future `/pipeline` FastAPI routes. See leads.ts for the pattern this follows. */
export function getDeals(): Promise<ApiResult<Deal[]>> {
  return apiRequest<Deal[]>("/pipeline/deals");
}

export function moveDeal(
  id: string,
  stage: PipelineStage
): Promise<ApiResult<Deal>> {
  return apiRequest<Deal>(`/pipeline/deals/${id}/move`, {
    method: "PATCH",
    body: { stage },
  });
}
