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

/** app/schemas/enums.py's CONTACT_ROLE_KEYS — the real, complete set (not just whichever roles happen to be assigned somewhere already), for populating the create/edit form's role picker. */
export const CONTACT_ROLE_KEYS = ["buyer", "seller", "owner", "investor", "agent", "other"] as const;

/** app/schemas/enums.py's ContactSource — for the create/edit form's source picker. formatContactSource above already renders any of these (or an unmapped one) safely. */
export const CONTACT_SOURCES = [
  "inmuebles24",
  "lamudi",
  "facebook",
  "marketplace",
  "instagram",
  "website",
  "referral",
  "phone",
  "walk_in",
  "other",
  "unknown",
] as const;

/** app/schemas/enums.py's PreferredContactMethod. */
export const PREFERRED_CONTACT_METHODS = ["phone", "email", "whatsapp", "sms"] as const;

const PREFERRED_CONTACT_METHOD_LABELS: Record<string, string> = {
  phone: "Phone",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

export function formatPreferredContactMethod(method: string): string {
  return PREFERRED_CONTACT_METHOD_LABELS[method] ?? method;
}

/**
 * Outbound shape for `POST /contacts` / `PATCH /contacts/{id}` — mirrors
 * app/schemas/contact.py's ContactCreate/ContactUpdate (both accept the
 * same field set; Create additionally requires at least one of email/phone,
 * enforced server-side, not duplicated here beyond a client-side nudge —
 * see features/leads/components/contact-form.tsx). All-optional, same
 * convention as features/buyer-requirements/types.ts's
 * BuyerRequirementInput: only the fields the user actually filled in are
 * sent. Roles are NOT part of this — they're assigned via the separate
 * `POST/DELETE /contacts/{id}/roles` endpoints (see addContactRole/
 * removeContactRole in lib/api/contacts.ts), matching the backend's own
 * schema (ContactCreate has no `roles` field at all).
 */
export interface ContactInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  preferred_contact_method?: string;
  source?: string;
  notes?: string;
}
