import type { AiAgent, AiRecommendation } from "./types";

export const mockAgents: AiAgent[] = [
  {
    id: "lead-intelligence",
    name: "Lead Intelligence Agent",
    description:
      "Analyzes every lead's behavior, budget, and engagement to keep scores and priorities current.",
    icon: "BrainCircuit",
    capabilities: [
      "Score leads by conversion likelihood",
      "Summarize client information",
      "Identify high-value opportunities",
    ],
    status: "coming_soon",
  },
  {
    id: "follow-up",
    name: "Follow-up Agent",
    description:
      "Watches the pipeline for leads that are going cold and drafts timely, personalized outreach.",
    icon: "MessageCircleMore",
    capabilities: [
      "Draft follow-up messages",
      "Recommend reminders",
      "Flag overdue conversations",
    ],
    status: "coming_soon",
  },
  {
    id: "sales-copilot",
    name: "Sales Copilot Agent",
    description:
      "Acts as an on-demand advisor for pipeline strategy, appointment prep, and next-best actions.",
    icon: "Sparkles",
    capabilities: [
      "Recommend next actions",
      "Assist with appointment prep",
      "Analyze pipeline activity",
    ],
    status: "coming_soon",
  },
];

/**
 * Structured placeholders that show the *shape* of a future recommendation,
 * not simulated model output — see AI ASSISTANT section of the project
 * brief: no fake production AI responses.
 */
export const mockRecommendations: AiRecommendation[] = [
  {
    id: "rec_001",
    agentId: "lead-intelligence",
    title: "Jordan Kim is likely ready to close",
    description:
      "Score has climbed to 92 after three positive interactions this week. Consider prioritizing the counter-offer.",
    priority: "high",
    relatedEntity: { type: "lead", id: "lead_001", label: "Jordan Kim" },
    createdAt: "2026-08-31",
  },
  {
    id: "rec_002",
    agentId: "follow-up",
    title: "Sofia Ramirez hasn't heard back in 5 days",
    description:
      "Last contacted Aug 27 with no response. A short check-in message is recommended before the lead goes cold.",
    priority: "medium",
    relatedEntity: { type: "lead", id: "lead_004", label: "Sofia Ramirez" },
    createdAt: "2026-09-01",
  },
  {
    id: "rec_003",
    agentId: "sales-copilot",
    title: "Prepare financing talking points for Marcus Webb",
    description:
      "Viewing scheduled for tomorrow — his qualification notes mention financing concerns worth addressing early.",
    priority: "medium",
    relatedEntity: { type: "appointment", id: "appt_004", label: "Willowbrook Viewing" },
    createdAt: "2026-08-31",
  },
];
