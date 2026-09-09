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

// ---------------------------------------------------------------------------
// Real backend contact — mirrors app/schemas/contact.py's ContactRead
// field-for-field (see lib/api/contacts.ts). Deliberately a separate type
// from Lead above, not a consolidation of the two: Lead's score/status/
// budget/interestedPropertyIds/nextAction/followUpDate have no backend
// equivalent (Contact has none of them) and Lead is still used by the
// still-mocked Pipeline and Dashboard features — replacing it here would
// either fabricate fields the backend doesn't provide or break those other
// features, both explicitly out of scope for this task. The Leads list and
// detail page use Contact; everything else keeps using Lead until it's
// wired to the real backend too.
// ---------------------------------------------------------------------------

export interface ContactRole {
  role_key: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  source: string | null;
  notes: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  roles: ContactRole[];
}

/**
 * Labels for the backend's known contact sources (app/schemas/enums.py's
 * CONTACT_SOURCES) — `source` itself is typed as a plain string above
 * (matching the backend's own read schema, which doesn't re-validate it as
 * a strict enum), so anything not in this map still renders safely via
 * formatContactSource's fallback instead of crashing or showing "undefined".
 */
const CONTACT_SOURCE_LABELS: Record<string, string> = {
  inmuebles24: "Inmuebles24",
  lamudi: "Lamudi",
  facebook: "Facebook",
  marketplace: "Marketplace",
  instagram: "Instagram",
  website: "Website",
  referral: "Referral",
  phone: "Phone",
  walk_in: "Walk-in",
  other: "Other",
  unknown: "Unknown",
};

export function formatContactSource(source: string | null): string {
  if (!source) return "—";
  return CONTACT_SOURCE_LABELS[source] ?? source;
}

const CONTACT_ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  owner: "Owner",
  investor: "Investor",
  agent: "Agent",
  other: "Other",
};

export function formatContactRole(roleKey: string): string {
  return CONTACT_ROLE_LABELS[roleKey] ?? roleKey;
}
