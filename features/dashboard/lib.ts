import type { Lead } from "@/features/leads/types";
import { isHotLead } from "@/features/leads/components/lead-score-badge";
import type { Appointment } from "@/features/appointments/types";
import type { Deal, PipelineStage } from "@/features/pipeline/types";
import { PIPELINE_STAGES } from "@/features/pipeline/types";

/**
 * Selectors that derive the dashboard's "prioritize, don't just display"
 * widgets from the same mock data the Leads/Properties/Pipeline/
 * Appointments pages use. Once a real backend exists, these are the
 * functions to replace with server-side queries (or move server-side) —
 * the components that call them don't need to change.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getHotLeads(leads: Lead[], limit = 4): Lead[] {
  return [...leads]
    .filter((lead) => isHotLead(lead.score) && !["won", "lost"].includes(lead.status))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getDueFollowUps(leads: Lead[]): Lead[] {
  const today = todayIso();
  return leads.filter((lead) => lead.followUpDate !== null && lead.followUpDate <= today);
}

export function getUpcomingAppointments(appointments: Appointment[], limit = 4): Appointment[] {
  const today = todayIso();
  return [...appointments]
    .filter((appt) => appt.date >= today && appt.status !== "cancelled")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, limit);
}

export interface PipelineStageSummary {
  stage: PipelineStage;
  count: number;
  value: number;
}

export function getPipelineSummary(deals: Deal[]): PipelineStageSummary[] {
  return PIPELINE_STAGES.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
    };
  });
}

export function getOpenPipelineValue(deals: Deal[]): number {
  return deals
    .filter((deal) => deal.stage !== "won" && deal.stage !== "lost")
    .reduce((sum, deal) => sum + deal.value, 0);
}
