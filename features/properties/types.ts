// ---------------------------------------------------------------------------
// Real backend property — mirrors app/schemas/property.py's PropertyRead
// field-for-field (see lib/api/properties.ts). Every `Decimal` field
// (price, construction_m2, land_m2, bathrooms, latitude, longitude) is
// typed `string | null`, not `number`: confirmed against a real response —
// FastAPI/Pydantic serializes Decimal as a JSON *string* (e.g. `"3400000.00"`)
// to avoid float precision loss, not as a bare number. Parse with `Number(...)`
// at the point of use (see formatPrice below) rather than assuming a number
// here — getting this wrong would either fail to compile or silently render
// "NaN" throughout the UI.
// ---------------------------------------------------------------------------

export interface PropertyFeature {
  feature_key: string;
}

export interface Property {
  id: string;
  organization_id: string;
  title: string;
  property_type: string;
  status: string;
  price: string | null;
  currency: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  neighborhood: string | null;
  latitude: string | null;
  longitude: string | null;
  construction_m2: string | null;
  land_m2: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  parking_spaces: number | null;
  description: string | null;
  // "own" (the advisor's real inventory) vs "external" (found through
  // another advisor/portal, being pursued for one specific client — see
  // app/models/property.py's own docstring for the full reasoning). The
  // four fields after it are only ever populated when ownership_type is
  // "external".
  ownership_type: string;
  external_source: string | null;
  external_advisor_name: string | null;
  external_advisor_contact: string | null;
  collaboration_status: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  features: PropertyFeature[];
}

/**
 * Labels for the backend's known property types (app/schemas/enums.py's
 * PROPERTY_TYPES) — deliberately a different set from MOCK_PROPERTY_TYPES
 * above (no "condo"; adds "office"/"industrial"/"other"). `property_type`
 * is typed as a plain string above (matching the backend's own read schema,
 * which doesn't re-validate it as a strict enum), so anything unmapped
 * still renders via the fallback instead of crashing.
 */
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "House",
  apartment: "Apartment",
  land: "Land",
  commercial: "Commercial",
  office: "Office",
  industrial: "Industrial",
  other: "Other",
};

/** The backend's real property_type values, for building a Select — e.g. features/buyer-requirements/components/buyer-requirement-form.tsx's "property type" field. Derived from the same label map as formatPropertyType so the two can't drift apart. */
export const PROPERTY_TYPES: string[] = Object.keys(PROPERTY_TYPE_LABELS);

export function formatPropertyType(propertyType: string): string {
  return PROPERTY_TYPE_LABELS[propertyType] ?? propertyType;
}

/** The backend's real property statuses (app/schemas/enums.py's PROPERTY_STATUSES) — a different set from MOCK_PROPERTY_STATUSES above. */
const PROPERTY_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  under_offer: "Under Offer",
  reserved: "Reserved",
  sold: "Sold",
  rented: "Rented",
  inactive: "Inactive",
};

export function formatPropertyStatus(status: string): string {
  return PROPERTY_STATUS_LABELS[status] ?? status;
}

/** For populating the create/edit form's status picker — derived from the same label map as formatPropertyStatus, so the two can't drift apart, same pattern as PROPERTY_TYPES above. */
export const PROPERTY_STATUSES: string[] = Object.keys(PROPERTY_STATUS_LABELS);

const PROPERTY_STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  under_offer: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  reserved: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  sold: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  rented: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  inactive: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

/** Falls back to the "draft" (neutral) styling for any status not in the map above, so an unmapped value never crashes the badge. */
export function getPropertyStatusBadgeClassName(status: string): string {
  return PROPERTY_STATUS_BADGE_STYLES[status] ?? PROPERTY_STATUS_BADGE_STYLES.draft;
}

/** "$3,400,000" from the Decimal-as-string `price` field, or a clear fallback when it's null — never a fabricated price. */
export function formatPropertyPrice(price: string | null, currency: string): string {
  if (price === null) return "Price on request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(price));
}

/** "220 m²" from a Decimal-as-string area field, or null if not provided — callers decide how to render a missing area. */
export function formatArea(areaM2: string | null): string | null {
  if (areaM2 === null) return null;
  return `${Number(areaM2)} m²`;
}

/** A single-line location string built from whichever address parts are actually present — never a fabricated address. */
export function formatPropertyLocation(property: Pick<Property, "neighborhood" | "city" | "state">): string {
  const parts = [property.neighborhood, property.city, property.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location not specified";
}

export const PROPERTY_OWNERSHIP_TYPES: string[] = ["own", "external"];

const PROPERTY_OWNERSHIP_LABELS: Record<string, string> = {
  own: "My inventory",
  external: "External / Collaboration",
};

export function formatPropertyOwnership(ownershipType: string): string {
  return PROPERTY_OWNERSHIP_LABELS[ownershipType] ?? ownershipType;
}

export const PROPERTY_COLLABORATION_STATUSES: string[] = [
  "contacted",
  "info_requested",
  "info_received",
  "shared_with_client",
];

const PROPERTY_COLLABORATION_STATUS_LABELS: Record<string, string> = {
  contacted: "Advisor contacted",
  info_requested: "Info requested",
  info_received: "Info received",
  shared_with_client: "Shared with client",
};

export function formatCollaborationStatus(status: string): string {
  return PROPERTY_COLLABORATION_STATUS_LABELS[status] ?? status;
}

/**
 * Outbound shape for `POST /properties` / `PATCH /properties/{id}` —
 * mirrors app/schemas/property.py's PropertyCreate/PropertyUpdate. Decimal
 * fields are sent as plain numbers (not the Decimal-as-string shape
 * `Property` above uses for *inbound* data) — Pydantic parses a JSON
 * number into a Decimal on the way in just fine; the string encoding is
 * specifically how the backend serializes a Decimal back *out*, to avoid
 * float precision loss in the response, not a requirement on what this
 * client sends. `latitude`/`longitude` are real PropertyCreate/Update
 * fields but aren't surfaced by the create/edit form (see
 * features/properties/components/property-form.tsx) — no map picker
 * exists in this app, and typing raw coordinates isn't a prioritized
 * field, same restraint features/buyer-requirements/components/
 * buyer-requirement-form.tsx already documents for its own field subset.
 */
export interface PropertyInput {
  title?: string;
  property_type?: string;
  status?: string;
  price?: number;
  currency?: string;
  address_line?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  neighborhood?: string;
  construction_m2?: number;
  land_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  description?: string;
  ownership_type?: string;
  external_source?: string;
  external_advisor_name?: string;
  external_advisor_contact?: string;
  collaboration_status?: string;
}
