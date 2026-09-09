/**
 * UI-facing model of the future AI agent system. None of this calls a real
 * model — see components/ for the placeholder surfaces that will eventually
 * be backed by the FastAPI backend's agent endpoints.
 */

export type AgentId = "lead-intelligence" | "follow-up" | "sales-copilot";

export interface AiAgent {
  id: AgentId;
  name: string;
  description: string;
  /** lucide-react icon name, resolved by the component that renders it. */
  icon: "BrainCircuit" | "MessageCircleMore" | "Sparkles";
  capabilities: string[];
  status: "available" | "coming_soon";
}

export type RecommendationPriority = "high" | "medium" | "low";

export interface AiRecommendation {
  id: string;
  agentId: AgentId;
  title: string;
  description: string;
  priority: RecommendationPriority;
  relatedEntity?: {
    type: "lead" | "property" | "deal" | "appointment";
    id: string;
    label: string;
  };
  createdAt: string; // ISO date
}

// ---------------------------------------------------------------------------
// Real backend AI agent responses.
//
// These mirror the FastAPI backend's own Pydantic schemas field-for-field
// (app/schemas/lead_intelligence.py, app/schemas/follow_up.py) — snake_case,
// not camelCased, because that's the actual JSON the backend sends; there is
// no case-conversion layer in this app. See lib/api/ai.ts for the functions
// that call POST /ai/lead-intelligence/{contact_id} and
// POST /ai/follow-up/{contact_id}. Unlike AiAgent/AiRecommendation above,
// nothing here is mocked — these are live model output, always requested
// explicitly by the user (see features/ai/components/).
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
