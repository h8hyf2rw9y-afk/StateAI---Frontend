import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { AgentExecution, AgentExecutionLatest, AgentName } from "@/features/ai/types";

/**
 * GET /ai/agent-executions/latest — the read path behind restoring a
 * client's previous AI analysis on switch (see the three panels in
 * features/ai/components/). A pure read: never runs an LLM, never creates
 * or modifies an AgentExecution row. Returns `{ ok: true, data: null }`
 * when this (contact, agent) pair has no successful execution yet — that's
 * the panels' empty state, not an error.
 *
 * `TOutput` lets each panel get back its own already-typed Result shape
 * (LeadIntelligenceResult/FollowUpResult/PipelineResult) instead of
 * `unknown`, without three near-identical copies of this function.
 */
export function getLatestAgentExecution<TOutput>(
  contactId: string,
  agentName: AgentName
): Promise<ApiResult<AgentExecutionLatest<TOutput> | null>> {
  return apiRequest<AgentExecutionLatest<TOutput> | null>("/api/v1/ai/agent-executions/latest", {
    params: { contact_id: contactId, agent_name: agentName },
  });
}

export function getAgentExecution<TOutput>(executionId: string): Promise<ApiResult<AgentExecution<TOutput>>> {
  return apiRequest<AgentExecution<TOutput>>(`/api/v1/ai/agent-executions/${executionId}`, {
    cache: "no-store",
  });
}

export async function waitForAgentExecution<TOutput>(
  executionId: string,
  retryAfterSeconds = 2,
  timeoutMs = 260_000
): Promise<ApiResult<TOutput>> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfterSeconds) * 1000));
    const response = await getAgentExecution<TOutput>(executionId);
    if (!response.ok) return response;
    if (response.data.status === "succeeded") return { ok: true, data: response.data.output };
    if (response.data.status === "failed") {
      return { ok: false, error: { status: 502, code: "AI_EXECUTION_FAILED", message: "The AI analysis failed." } };
    }
  }
  return { ok: false, error: { code: "timeout", message: "The AI analysis took too long." } };
}
