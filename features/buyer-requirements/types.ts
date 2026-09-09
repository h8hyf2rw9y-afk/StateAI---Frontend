// ---------------------------------------------------------------------------
// Real backend types for the "what is this client looking for?" workflow —
// Case A (PropertyInterest: interested in one specific property) and Case B
// (BuyerRequirement: searching by criteria), plus the deterministic
// PropertyMatch the backend already computes for a requirement. Mirrors
// app/schemas/buyer_requirement.py's BuyerRequirementRead, LocationRead,
// FeatureAssignRead, app/schemas/property_interest.py's PropertyInterestRead,
// and app/schemas/matching.py's PropertyMatchRead field-for-field.
//
// Colocated in one feature folder (not split into a separate
// features/property-interests/) because both exist to answer the same
// question on the lead detail page and there's no dedicated UI for
// PropertyInterest beyond display — see
// features/buyer-requirements/components/buyer-search-section.tsx.
// ---------------------------------------------------------------------------

import type { Property } from "@/features/properties/types";

export interface BuyerRequirementLocation {
  id: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  priority: number;
}

export interface BuyerRequirementFeature {
  feature_key: string;
  classification: string; // must_have | preferred | deal_breaker
}

export interface BuyerRequirement {
  id: string;
  organization_id: string;
  contact_id: string;
  purpose: string | null; // buy | rent | invest
  status: string; // active | paused | fulfilled | cancelled
  budget_min: string | null; // Decimal-as-string, same as Property's price — see features/properties/types.ts
  budget_max: string | null;
  currency: string;
  property_type: string | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: string | null;
  bathrooms_max: string | null;
  construction_m2_min: string | null;
  construction_m2_max: string | null;
  land_m2_min: string | null;
  land_m2_max: string | null;
  parking_spaces_min: number | null;
  timeline: string | null;
  financing_type: string | null;
  preapproval_status: string | null;
  motivation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  locations: BuyerRequirementLocation[];
  features: BuyerRequirementFeature[];
}

/** The exact fields POST /contacts/{id}/buyer-requirements and PATCH /buyer-requirements/{id} accept — see app/schemas/buyer_requirement.py's BuyerRequirementCreate/Update. */
export interface BuyerRequirementInput {
  purpose?: string;
  status?: string;
  budget_min?: number;
  budget_max?: number;
  property_type?: string;
  bedrooms_min?: number;
  bathrooms_min?: number;
  construction_m2_min?: number;
  parking_spaces_min?: number;
  notes?: string;
}

export interface PropertyInterest {
  id: string;
  organization_id: string;
  contact_id: string;
  property_id: string;
  status: string;
  source: string | null;
  notes: string | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /buyer-requirements/{id}/matches — deterministic, backend-computed. No score/percentage field exists; never fabricate one. */
export interface PropertyMatch {
  property: Property;
  matched_preferred_features: number;
  total_preferred_features: number;
}

// ---------------------------------------------------------------------------
// Soft-enum labels — same pattern as features/leads/types.ts and
// features/properties/types.ts: plain strings with a safe fallback,
// matching the backend's own read schemas (which don't re-validate these
// as strict enums), never a hardcoded union that could crash on a real
// but unmapped value.
// ---------------------------------------------------------------------------

const PURPOSE_LABELS: Record<string, string> = {
  buy: "Buy",
  rent: "Rent",
  invest: "Invest",
};

/** For building a Select — see buyer-requirement-form.tsx's "operation" field. */
export const PURPOSES: string[] = Object.keys(PURPOSE_LABELS);

export function formatPurpose(purpose: string | null): string {
  if (!purpose) return "Not specified";
  return PURPOSE_LABELS[purpose] ?? purpose;
}

const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export function formatRequirementStatus(status: string): string {
  return REQUIREMENT_STATUS_LABELS[status] ?? status;
}

const REQUIREMENT_STATUS_BADGE_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  fulfilled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

export function getRequirementStatusBadgeClassName(status: string): string {
  return REQUIREMENT_STATUS_BADGE_STYLES[status] ?? REQUIREMENT_STATUS_BADGE_STYLES.cancelled;
}

const PROPERTY_INTEREST_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  viewing_scheduled: "Viewing scheduled",
  viewed: "Viewed",
  not_interested: "Not interested",
  offer: "Offer",
  negotiation: "Negotiation",
  lost: "Lost",
  won: "Won",
};

export function formatPropertyInterestStatus(status: string): string {
  return PROPERTY_INTEREST_STATUS_LABELS[status] ?? status;
}

/** "$4,000,000 – $5,000,000" / "$4,000,000+" / "Up to $5,000,000" / "Budget not specified" — never fabricates a bound that isn't set. */
export function formatBudgetRange(min: string | null, max: string | null, currency: string): string {
  const fmt = (value: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `${fmt(min)}+`;
  if (max !== null) return `Up to ${fmt(max)}`;
  return "Budget not specified";
}

/** Generic min/max formatter for bedrooms/bathrooms/areas — "3+", "up to 5", "3–5", or null when neither bound is set. */
export function formatMinMax(min: number | string | null, max: number | string | null, suffix = ""): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min}${suffix}–${max}${suffix}`;
  if (min !== null) return `${min}${suffix}+`;
  return `Up to ${max}${suffix}`;
}

/** "Valle Alto, Carretera Nacional" from the requirement's real, normalized location rows — never a single invented free-text field. */
export function formatLocations(locations: BuyerRequirementLocation[]): string | null {
  if (locations.length === 0) return null;
  return locations
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((l) => l.neighborhood ?? l.city ?? l.state)
    .filter(Boolean)
    .join(", ");
}
