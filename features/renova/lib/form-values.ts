import type { RenovaCase, RenovaCaseInput } from "@/features/renova/types";
import { MONEY_FIELDS } from "@/features/renova/lib/money";
import { normalizeIdentifier } from "@/features/renova/lib/identifiers";

/**
 * The single source of truth for the Renova form's data (used by BOTH create
 * and edit): the values shape, how a saved case becomes form values, and how
 * form values become an API payload. Every value is a string (what an
 * <input> holds); conversion to the API's types happens once, in
 * toRenovaPayload.
 *
 * Not in the form on purpose: `source` (a new case takes the backend default,
 * an edited one keeps its own) and `key_questions` (kept in the database, no
 * longer captured; omitted from PATCH so editing never wipes it).
 */
export interface RenovaFormValues {
  // Registro y propuesta
  assigned_user_id: string;
  entry_date: string;
  status: string;
  final_offer: string;
  market_value: string;
  owner_expected_amount: string;
  // Ubicación e inmueble
  street_address: string;
  neighborhood: string;
  municipality: string;
  postal_code: string;
  dwelling_type: string; // "" = not specified — the mutually-exclusive BASE type only ("house"/"apartment"), never "duplex"
  is_duplex: boolean; // independent configuration; can be true with either base type, or with no base type yet
  floors: string;
  bathrooms: string;
  bedrooms: string;
  // Adeudos
  property_tax_debt: string;
  property_tax_debt_unit: string; // "mxn" or "years" — see RENOVA_PROPERTY_TAX_DEBT_UNITS
  other_debt: string;
  water_debt: string;
  electricity_debt: string;
  gas_debt: string;
  debt_owed_to: string;
  // Condición y situación
  conditions: string;
  occupancy_status: string; // "" = not specified
  has_deeds: string;
  deeds_holder_name: string;
  general_situation: string;
  // Titular y cónyuge
  owner_name: string;
  owner_phone: string;
  marital_status: string; // "" = not specified
  nss: string; // write-only; "" = leave as is
  credit_number: string; // write-only; "" = leave as is
  clear_nss: boolean;
  clear_credit_number: boolean;
  spouse_name: string;
  spouse_phone: string;
  // Preguntas clave
  sale_reason: string;
  notes: string;
}

/** Field order top-to-bottom as the form lays them out — used to focus the FIRST invalid field. */
export const RENOVA_FIELD_ORDER: (keyof RenovaFormValues)[] = [
  "assigned_user_id",
  "entry_date",
  "status",
  "final_offer",
  "market_value",
  "owner_expected_amount",
  "street_address",
  "neighborhood",
  "municipality",
  "postal_code",
  "dwelling_type",
  "is_duplex",
  "floors",
  "bathrooms",
  "bedrooms",
  "property_tax_debt",
  "property_tax_debt_unit",
  "other_debt",
  "water_debt",
  "electricity_debt",
  "gas_debt",
  "debt_owed_to",
  "conditions",
  "occupancy_status",
  "has_deeds",
  "deeds_holder_name",
  "general_situation",
  "owner_name",
  "owner_phone",
  "marital_status",
  "nss",
  "credit_number",
  "spouse_name",
  "spouse_phone",
  "sale_reason",
  "notes",
];

function todayLocalISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyRenovaFormValues(assignedUserId = ""): RenovaFormValues {
  return {
    assigned_user_id: assignedUserId,
    entry_date: todayLocalISO(),
    status: "new",
    final_offer: "",
    market_value: "",
    owner_expected_amount: "",
    street_address: "",
    neighborhood: "",
    municipality: "",
    postal_code: "",
    dwelling_type: "",
    is_duplex: false,
    floors: "",
    bathrooms: "",
    bedrooms: "",
    property_tax_debt: "",
    property_tax_debt_unit: "mxn",
    other_debt: "",
    water_debt: "",
    electricity_debt: "",
    gas_debt: "",
    debt_owed_to: "",
    conditions: "",
    occupancy_status: "",
    has_deeds: "unknown",
    deeds_holder_name: "",
    general_situation: "",
    owner_name: "",
    owner_phone: "",
    marital_status: "",
    nss: "",
    credit_number: "",
    clear_nss: false,
    clear_credit_number: false,
    spouse_name: "",
    spouse_phone: "",
    sale_reason: "",
    notes: "",
  };
}

export function valuesFromRenovaCase(renovaCase: RenovaCase): RenovaFormValues {
  const s = (value: string | number | null) => (value === null || value === undefined ? "" : String(value));
  // The API returns money as "1400000.00"; show it as a person would type it.
  const money = (value: string | null) => (value === null ? "" : value.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1"));
  return {
    assigned_user_id: renovaCase.assigned_user_id ?? "",
    entry_date: renovaCase.entry_date,
    status: renovaCase.status,
    final_offer: money(renovaCase.final_offer),
    market_value: money(renovaCase.market_value),
    owner_expected_amount: money(renovaCase.owner_expected_amount),
    street_address: s(renovaCase.street_address),
    neighborhood: s(renovaCase.neighborhood),
    municipality: s(renovaCase.municipality),
    postal_code: s(renovaCase.postal_code),
    dwelling_type: s(renovaCase.dwelling_type),
    is_duplex: renovaCase.is_duplex,
    floors: s(renovaCase.floors),
    bathrooms: s(renovaCase.bathrooms),
    bedrooms: s(renovaCase.bedrooms),
    property_tax_debt: money(renovaCase.property_tax_debt),
    property_tax_debt_unit: renovaCase.property_tax_debt_unit,
    other_debt: money(renovaCase.other_debt),
    water_debt: money(renovaCase.water_debt),
    electricity_debt: money(renovaCase.electricity_debt),
    gas_debt: money(renovaCase.gas_debt),
    debt_owed_to: s(renovaCase.debt_owed_to),
    conditions: s(renovaCase.conditions),
    occupancy_status: s(renovaCase.occupancy_status),
    has_deeds: renovaCase.has_deeds,
    deeds_holder_name: s(renovaCase.deeds_holder_name),
    general_situation: s(renovaCase.general_situation),
    owner_name: renovaCase.owner_name,
    owner_phone: renovaCase.owner_phone,
    marital_status: s(renovaCase.marital_status),
    nss: "", // never pre-filled: the full value is unrecoverable by design
    credit_number: "",
    clear_nss: false,
    clear_credit_number: false,
    spouse_name: s(renovaCase.spouse_name),
    spouse_phone: s(renovaCase.spouse_phone),
    sale_reason: s(renovaCase.sale_reason),
    notes: s(renovaCase.notes),
  };
}

/** True when the person has changed anything since the form was opened (or since the saved case loaded). */
export function isRenovaFormDirty(current: RenovaFormValues, initial: RenovaFormValues): boolean {
  return (Object.keys(current) as (keyof RenovaFormValues)[]).some((key) => current[key] !== initial[key]);
}

const trimOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const OPTIONAL_TEXT_FIELDS = [
  "street_address",
  "neighborhood",
  "municipality",
  "postal_code",
  "dwelling_type",
  "occupancy_status",
  "marital_status",
  "spouse_name",
  "spouse_phone",
  "conditions",
  "deeds_holder_name",
  "debt_owed_to",
  "sale_reason",
  "general_situation",
  "notes",
  "bathrooms",
] as const satisfies readonly (keyof RenovaFormValues & keyof RenovaCaseInput)[];

/**
 * Builds the request body.
 *  - create: blank optional fields are simply omitted.
 *  - edit (PATCH): blank optional fields are sent as null so clearing a value
 *    in the form really clears it; NSS / credit number are only sent when the
 *    user typed a replacement (or explicitly chose to remove the stored one).
 * Money goes as decimal strings (no float rounding); counts as integers.
 * `status` is decided by the caller (draft vs prospect), not read from the form.
 */
export function toRenovaPayload(values: RenovaFormValues, mode: "create" | "edit", status: string): RenovaCaseInput {
  const payload: RenovaCaseInput = {
    assigned_user_id: values.assigned_user_id,
    entry_date: values.entry_date,
    status,
    owner_name: values.owner_name.trim(),
    owner_phone: values.owner_phone.trim(),
    has_deeds: values.has_deeds,
    is_duplex: values.is_duplex,
    property_tax_debt_unit: values.property_tax_debt_unit,
  };

  const out = payload as Record<string, unknown>;
  for (const field of [...OPTIONAL_TEXT_FIELDS, ...MONEY_FIELDS]) {
    const value = trimOrNull(values[field]);
    if (value !== null) out[field] = value;
    else if (mode === "edit") out[field] = null;
  }

  for (const field of ["floors", "bedrooms"] as const) {
    const value = trimOrNull(values[field]);
    if (value !== null) out[field] = Number(value);
    else if (mode === "edit") out[field] = null;
  }

  for (const [field, clearFlag] of [
    ["nss", "clear_nss"],
    ["credit_number", "clear_credit_number"],
  ] as const) {
    // Only a value the person actually typed is ever sent (as bare digits).
    // The mask shown for a stored value is display text and is not in the form
    // values, so it can never be sent as if it were a new number.
    const typed = normalizeIdentifier(values[field]);
    if (typed) out[field] = typed;
    else if (mode === "edit" && values[clearFlag]) out[field] = null;
  }

  return payload;
}
