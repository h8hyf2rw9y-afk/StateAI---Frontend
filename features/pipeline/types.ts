/**
 * The sales pipeline stage is a single shared vocabulary used by both the
 * Leads page (as a lead's current status) and the Pipeline board (as a
 * deal's column). Defining it once here — instead of duplicating a near
 * identical union in features/leads — keeps the two views from drifting
 * apart as stages are added or renamed.
 */
export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "viewing_scheduled",
  "negotiation",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  viewing_scheduled: "Viewing Scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

/** A deal is a lead paired with an opportunity moving through the pipeline. */
export interface Deal {
  id: string;
  leadId: string;
  leadName: string;
  propertyId: string | null;
  propertyName: string | null;
  stage: PipelineStage;
  value: number;
  currency: string;
  probability: number; // 0-100
  expectedCloseDate: string; // ISO date
  agentId: string;
  agentName: string;
  updatedAt: string; // ISO date
}
