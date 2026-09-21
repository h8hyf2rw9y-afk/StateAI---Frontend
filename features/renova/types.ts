// ---------------------------------------------------------------------------
// Renova — the independent house-flipping evaluation module. Mirrors the
// backend's app/schemas/renova_case.py field-for-field (snake_case, the real
// JSON; no case conversion layer exists in this app).
//
// A Renova case is NOT a Contact/Lead: nothing here imports or extends
// features/leads/types.ts, and no Contacts API is ever called for it. Its
// owner's identity lives on the case itself.
//
// Sensitive data: the API never returns NSS or the credit number in full —
// only `nss_masked` / `credit_number_masked` ("••••1234") on the detail
// response, and nothing at all on list rows. `RenovaCaseInput.nss` /
// `.credit_number` are write-only. Labels are Spanish on purpose: these cases
// are captured from WhatsApp conversations in Mexico (the rest of PropPilot
// stays English). "Número de crédito" is spelled out — never the ambiguous
// "NC".
//
// Decimal fields arrive from the backend as strings ("1400000.50") to avoid
// float precision loss, same as Property.price.
// ---------------------------------------------------------------------------

export interface RenovaCaseListItem {
  id: string;
  organization_id: string;
  assigned_user_id: string | null;
  entry_date: string; // YYYY-MM-DD
  source: string;
  status: string;
  owner_name: string;
  owner_phone: string;
  dwelling_type: string | null;
  currency: string;
  final_offer: string | null;
  market_value: string | null;
  property_tax_debt: string | null;
  other_debt: string | null;
  water_debt: string | null;
  electricity_debt: string | null;
  gas_debt: string | null;
  owner_expected_amount: string | null;
  /** Derived server-side: property tax + other + water + electricity + gas. Null when no debt is captured at all. */
  total_debt: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovaCase extends RenovaCaseListItem {
  created_by_user_id: string | null;
  marital_status: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  floors: number | null;
  bathrooms: string | null;
  bedrooms: number | null;
  conditions: string | null;
  has_deeds: string;
  deeds_holder_name: string | null;
  debt_owed_to: string | null;
  sale_reason: string | null;
  key_questions: string | null;
  general_situation: string | null;
  notes: string | null;
  /** "••••1234" when a value is stored, null when not. The full value is never available. */
  nss_masked: string | null;
  credit_number_masked: string | null;
}

/** Outbound shape for POST/PATCH — see toRenovaPayload in form-utils.ts. On PATCH a `null` clears an optional field; an omitted key leaves it untouched. */
export interface RenovaCaseInput {
  assigned_user_id?: string;
  entry_date?: string;
  source?: string;
  status?: string;
  owner_name?: string;
  owner_phone?: string;
  marital_status?: string | null;
  spouse_name?: string | null;
  spouse_phone?: string | null;
  nss?: string | null;
  credit_number?: string | null;
  dwelling_type?: string | null;
  floors?: number | null;
  bathrooms?: string | null;
  bedrooms?: number | null;
  conditions?: string | null;
  has_deeds?: string;
  deeds_holder_name?: string | null;
  final_offer?: string | null;
  market_value?: string | null;
  property_tax_debt?: string | null;
  other_debt?: string | null;
  water_debt?: string | null;
  electricity_debt?: string | null;
  gas_debt?: string | null;
  debt_owed_to?: string | null;
  owner_expected_amount?: string | null;
  sale_reason?: string | null;
  key_questions?: string | null;
  general_situation?: string | null;
  notes?: string | null;
}

// --- value sets (app/schemas/enums.py's RENOVA_*) ---------------------------

export const RENOVA_STATUSES = [
  "new",
  "reviewing",
  "offer_preparation",
  "offer_sent",
  "negotiating",
  "accepted",
  "purchased",
  "rejected",
  "cancelled",
] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  reviewing: "En revisión",
  offer_preparation: "Preparando oferta",
  offer_sent: "Oferta enviada",
  negotiating: "Negociando",
  accepted: "Aceptado",
  purchased: "Comprado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

export function formatRenovaStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  reviewing: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  offer_preparation: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  offer_sent: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  negotiating: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  purchased: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

export function getRenovaStatusClassName(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;
}

export const RENOVA_SOURCES = ["whatsapp", "phone", "referral", "website", "other"] as const;
const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  referral: "Referido",
  website: "Sitio web",
  other: "Otro",
};
export function formatRenovaSource(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export const RENOVA_MARITAL_STATUSES = [
  "single",
  "married_conjugal_partnership",
  "married_separate_property",
  "divorced",
  "widowed",
  "common_law",
  "unknown",
] as const;
const MARITAL_LABELS: Record<string, string> = {
  single: "Soltero(a)",
  married_conjugal_partnership: "Casado(a) — sociedad conyugal",
  married_separate_property: "Casado(a) — separación de bienes",
  divorced: "Divorciado(a)",
  widowed: "Viudo(a)",
  common_law: "Unión libre",
  unknown: "No especificado",
};
export function formatRenovaMaritalStatus(value: string | null): string {
  if (!value) return "—";
  return MARITAL_LABELS[value] ?? value;
}

export const RENOVA_DWELLING_TYPES = ["house", "apartment", "duplex"] as const;
const DWELLING_LABELS: Record<string, string> = { house: "Casa", apartment: "Departamento", duplex: "Dúplex" };
export function formatRenovaDwelling(value: string | null): string {
  if (!value) return "—";
  return DWELLING_LABELS[value] ?? value;
}

export const RENOVA_DEEDS_STATUSES = ["yes", "no", "unknown"] as const;
const DEEDS_LABELS: Record<string, string> = { yes: "Sí", no: "No", unknown: "Desconocido" };
export function formatRenovaDeeds(value: string): string {
  return DEEDS_LABELS[value] ?? value;
}

// --- formatting ----------------------------------------------------------------

/** "$1,400,000" in es-MX for the given currency (MXN by default); "—" when not captured yet — never a fabricated $0. */
export function formatRenovaMoney(value: string | number | null | undefined, currency = "MXN"): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(number);
}

/** "20 sep 2026" from a bare "YYYY-MM-DD" — parsed as a LOCAL calendar date (new Date("2026-09-20") would be UTC midnight and shift a day west of UTC). */
export function formatRenovaDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}
