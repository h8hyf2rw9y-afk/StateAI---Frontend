import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { AgentExecutionLatest, AgentName } from "@/features/ai/types";

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
