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
