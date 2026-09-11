/**
 * The three real AI agents this app has — Lead Intelligence, Follow-up,
 * Pipeline (see app/ai/registry.py's AGENT_REGISTRY, the backend's own
 * source of truth for this same list). `AiAgent` here is a small, static,
 * frontend-only description of each one for the AI Assistant page's agent
 * cards (features/ai/components/agent-card.tsx) — there is no `GET
 * /ai/agents` endpoint to fetch this from (the backend's registry is a
 * fixed, three-entry Python dict, not a resource with its own API), so
 * hardcoding these three descriptions is the real, current shape of "the
 * available agents," not a placeholder standing in for a future endpoint.
 */

export type AgentId = "lead-intelligence" | "follow-up" | "pipeline";

export interface AiAgent {
  id: AgentId;
  name: string;
  description: string;
  /** lucide-react icon name, resolved by the component that renders it. */
  icon: "BrainCircuit" | "MessageCircleMore" | "Waypoints";
  capabilities: string[];
  status: "available";
}

// ---------------------------------------------------------------------------
// Real backend AI agent responses.
//
// These mirror the FastAPI backend's own Pydantic schemas field-for-field
// (app/schemas/lead_intelligence.py, app/schemas/follow_up.py,
// app/schemas/pipeline.py) — snake_case, not camelCased, because that's the
// actual JSON the backend sends; there is no case-conversion layer in this
// app. See lib/api/ai.ts for the functions that call
// POST /ai/lead-intelligence/{contact_id}, POST /ai/follow-up/{contact_id},
// and POST /ai/pipeline/{contact_id}. Nothing here is mocked — these are
// live model output, always requested explicitly by the user (see
// features/ai/components/).
// ---------------------------------------------------------------------------

export type LeadPriority = "high" | "medium" | "low";

export type RecommendedNextAction =
  | "call"
  | "whatsapp"
  | "email"
  | "schedule_viewing"
  | "send_properties"
  | "follow_up"
  | "meeting"
  | "re_engage"
  | "no_action_needed";

export interface LeadIntelligenceAnalysis {
  priority: LeadPriority;
  /** 0.0-1.0. Never a percentage on the wire — see recommended_next_action's sibling backend field for why. */
  confidence: number;
  reasoning: string;
  positive_signals: string[];
  risk_signals: string[];
  recommended_next_action: RecommendedNextAction;
  insufficient_data: boolean;
}

export interface LeadIntelligenceResult {
  contact_id: string;
  analysis: LeadIntelligenceAnalysis;
  /** Which model produced this (e.g. "llama3.2") — kept in the type for completeness; not surfaced in the UI (see the AI panels). */
  model: string;
  prompt_version: string;
  generated_at: string; // ISO datetime
}

export type FollowUpChannel = "whatsapp" | "email" | "call" | "none";

export type FollowUpAction =
  | "follow_up"
  | "send_properties"
  | "confirm_viewing"
  | "check_in"
  | "call_client"
  | "prepare_for_appointment"
  | "no_action";

export interface FollowUpRecommendation {
  should_follow_up: boolean;
  priority: LeadPriority;
  recommended_channel: FollowUpChannel;
  recommended_action: FollowUpAction;
  reason: string;
  /** Null when should_follow_up is false, or when the model didn't generate one — never fabricate a message client-side when this is null. */
  suggested_message: string | null;
  confidence: number;
}

export interface FollowUpResult {
  contact_id: string;
  recommendation: FollowUpRecommendation;
  model: string;
  prompt_version: string;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Pipeline Agent — mirrors app/schemas/pipeline.py field-for-field. Added in
// the CRM Integration Gaps task (the backend endpoint already existed and
// had already been tested against real Ollama; this is its first frontend
// consumer — see features/ai/components/pipeline-panel.tsx).
//
// `ImmediateAction.urgency` is the backend's TaskPriority — a 4-value scale
// ("low"|"medium"|"high"|"urgent") — genuinely different from the 3-value
// LeadPriority above (app/schemas/enums.py keeps them as two separate
// Literals server-side too), not a typo. Typed as plain `string` here, same
// as features/tasks/types.ts's own `Task.priority` — that file doesn't
// export a `TaskPriority` type either, matching the soft-enum convention
// every real-backend enum in this app follows (the read side never
// re-validates as a strict union, so an unmapped value can't crash it); its
// formatTaskPriority/getTaskPriorityBadgeClassName take `string` for the
// same reason and are reused directly below rather than redefined.
// ---------------------------------------------------------------------------

/**
 * The 14 concrete next actions the Pipeline Agent can recommend
 * (app/schemas/enums.py's PipelineAction) — a different, larger vocabulary
 * than RecommendedNextAction/FollowUpAction above because this agent reasons
 * about a whole Opportunity's sales process, not just "should someone talk
 * to this lead."
 */
export type PipelineAction =
  | "call"
  | "whatsapp"
  | "email"
  | "follow_up"
  | "send_properties"
  | "schedule_viewing"
  | "prepare_appointment"
  | "review_offer"
  | "negotiate"
  | "collect_documents"
  | "review_financing"
  | "coordinate_notary"
  | "create_task"
  | "monitor";

export interface OpportunityRecommendation {
  opportunity_id: string;
  priority: LeadPriority;
  status_assessment: string;
  reason: string;
  recommended_action: PipelineAction;
  confidence: number;
}

export interface ImmediateAction {
  opportunity_id: string;
  action: PipelineAction;
  reason: string;
  urgency: string;
}

export interface RiskFlag {
  opportunity_id: string;
  risk: string;
  reason: string;
  severity: LeadPriority;
}

export interface PipelineAnalysis {
  overall_priority: LeadPriority;
  summary: string;
  opportunities: OpportunityRecommendation[];
  immediate_actions: ImmediateAction[];
  risk_flags: RiskFlag[];
  confidence: number;
}

export interface PipelineResult {
  contact_id: string;
  analysis: PipelineAnalysis;
  model: string;
  prompt_version: string;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Persistent AI Agent Results — mirrors app/schemas/agent_execution.py's
// AgentExecutionLatestRead. `agent_name` here matches the backend's own
// registry ids (app/ai/registry.py's AGENT_REGISTRY keys) — "lead_intelligence"
// / "follow_up" / "pipeline" — which is a different spelling from this
// file's own `AgentId` above (hyphenated, UI-card-only); see
// lib/api/agent-executions.ts.
// ---------------------------------------------------------------------------

export type AgentName = "lead_intelligence" | "follow_up" | "pipeline";

/**
 * One stored AgentExecution row, as returned by
 * GET /ai/agent-executions/latest — the previous analysis to restore when a
 * client is (re)selected, plus whether the CRM data it was based on has
 * since changed (`is_stale`). `TOutput` is whichever of
 * LeadIntelligenceResult/FollowUpResult/PipelineResult this execution's
 * `agent_name` corresponds to.
 */
export interface AgentExecutionLatest<TOutput> {
  id: string;
  agent_name: AgentName;
  contact_id: string | null;
  output: TOutput;
  status: string;
  created_at: string;
  is_stale: boolean;
}
