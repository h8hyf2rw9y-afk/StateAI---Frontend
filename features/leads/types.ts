import type { PipelineStage } from "@/features/pipeline/types";

export const LEAD_SOURCES = [
  "website",
  "referral",
  "social_media",
  "portal",
  "walk_in",
  "advertising",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  social_media: "Social Media",
  portal: "Listing Portal",
  walk_in: "Walk-in",
  advertising: "Advertising",
  other: "Other",
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  /** A lead's status is a pipeline stage — see features/pipeline/types. */
  status: PipelineStage;
  /** AI-computed conversion likelihood, 0-100. Mocked for now. */
  score: number;
  source: LeadSource;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  interestedPropertyIds: string[];
  agentId: string;
  agentName: string;
  lastInteractionAt: string; // ISO date
  nextAction: string;
  followUpDate: string | null; // ISO date
  createdAt: string; // ISO date
}
