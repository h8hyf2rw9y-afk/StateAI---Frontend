// ---------------------------------------------------------------------------
// Real backend contact — mirrors app/schemas/contact.py's ContactRead
// field-for-field (see lib/api/contacts.ts).
//
// This file used to also define a mock `Lead` type (its own score/status/
// budget/interestedPropertyIds/nextAction/followUpDate fields, none of which
// the real Contact model has) plus LEAD_SOURCES/LeadSource/
// LEAD_SOURCE_LABELS for it — kept around only because the mock Dashboard
// was its last real consumer. Removed in the CRM Integration Gaps task once
// the Dashboard was rewired to real data (see features/dashboard/); nothing
// else in this app ever imported them (the real Leads list/detail pages
// always used Contact, and Contact has its own, separate source vocabulary —
// CONTACT_SOURCES/formatContactSource below).
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
