import type { RenovaCase, RenovaCaseInput } from "@/features/renova/types";

/**
 * Pure helpers behind the Renova form (components/renova-case-form.tsx),
 * kept out of the component so validation and payload building are unit-
 * testable without rendering a dialog. Every value in the form is a string
 * (what an <input> holds); conversion to the API's types happens once, in
 * toRenovaPayload.
 */

export interface RenovaFormValues {
  // Registro
  assigned_user_id: string;
  entry_date: string;
  source: string;
  status: string;
  // Propietario
  owner_name: string;
  owner_phone: string;
  marital_status: string; // "" = not specified
  spouse_name: string;
  spouse_phone: string;
  nss: string; // write-only; "" = leave as is
  credit_number: string; // write-only; "" = leave as is
  clear_nss: boolean;
  clear_credit_number: boolean;
  // Inmueble
  dwelling_type: string; // "" = not specified
  floors: string;
  bathrooms: string;
  bedrooms: string;
  conditions: string;
  has_deeds: string;
  deeds_holder_name: string;
  // Finanzas
  final_offer: string;
  market_value: string;
  property_tax_debt: string;
  other_debt: string;
  water_debt: string;
  electricity_debt: string;
  gas_debt: string;
  debt_owed_to: string;
  owner_expected_amount: string;
  // Motivación y evaluación
  sale_reason: string;
  key_questions: string;
  general_situation: string;
  notes: string;
}

export const RENOVA_FORM_STEPS = ["Registro", "Propietario", "Inmueble", "Finanzas", "Motivación y evaluación"] as const;

/** Which step each field lives on, so a validation error can send the user to the right section. */
export const FIELD_STEP: Record<keyof RenovaFormValues, number> = {
  assigned_user_id: 0,
  entry_date: 0,
  source: 0,
  status: 0,
  owner_name: 1,
  owner_phone: 1,
  marital_status: 1,
  spouse_name: 1,
  spouse_phone: 1,
  nss: 1,
  credit_number: 1,
  clear_nss: 1,
  clear_credit_number: 1,
  dwelling_type: 2,
  floors: 2,
  bathrooms: 2,
  bedrooms: 2,
  conditions: 2,
  has_deeds: 2,
  deeds_holder_name: 2,
  final_offer: 3,
  market_value: 3,
  property_tax_debt: 3,
  other_debt: 3,
  water_debt: 3,
  electricity_debt: 3,
  gas_debt: 3,
  debt_owed_to: 3,
  owner_expected_amount: 3,
  sale_reason: 4,
  key_questions: 4,
  general_situation: 4,
  notes: 4,
};

export const MONEY_FIELDS = [
  "final_offer",
  "market_value",
  "property_tax_debt",
  "other_debt",
  "water_debt",
  "electricity_debt",
  "gas_debt",
  "owner_expected_amount",
] as const;

export const DEBT_FIELDS = ["property_tax_debt", "other_debt", "water_debt", "electricity_debt", "gas_debt"] as const;

/** Mirrors the backend's caps (app/schemas/renova_case.py) so most errors are caught before a round trip. */
const MAX_LENGTH: Partial<Record<keyof RenovaFormValues, number>> = {
  owner_name: 200,
  spouse_name: 200,
  deeds_holder_name: 200,
  owner_phone: 40,
  spouse_phone: 40,
  debt_owed_to: 300,
  conditions: 5000,
  sale_reason: 5000,
  key_questions: 5000,
  general_situation: 5000,
  notes: 5000,
};

const MAX_MONEY = 999_999_999_999.99; // Numeric(14, 2)

function todayLocalISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyRenovaFormValues(assignedUserId = ""): RenovaFormValues {
  return {
    assigned_user_id: assignedUserId,
    entry_date: todayLocalISO(),
    source: "whatsapp",
    status: "new",
    owner_name: "",
    owner_phone: "",
    marital_status: "",
    spouse_name: "",
    spouse_phone: "",
    nss: "",
    credit_number: "",
    clear_nss: false,
    clear_credit_number: false,
    dwelling_type: "",
    floors: "",
    bathrooms: "",
    bedrooms: "",
    conditions: "",
    has_deeds: "unknown",
    deeds_holder_name: "",
    final_offer: "",
    market_value: "",
    property_tax_debt: "",
    other_debt: "",
    water_debt: "",
    electricity_debt: "",
    gas_debt: "",
    debt_owed_to: "",
    owner_expected_amount: "",
    sale_reason: "",
    key_questions: "",
    general_situation: "",
    notes: "",
  };
}

export function valuesFromRenovaCase(renovaCase: RenovaCase): RenovaFormValues {
  const s = (value: string | number | null) => (value === null || value === undefined ? "" : String(value));
  return {
    assigned_user_id: renovaCase.assigned_user_id ?? "",
    entry_date: renovaCase.entry_date,
    source: renovaCase.source,
    status: renovaCase.status,
    owner_name: renovaCase.owner_name,
    owner_phone: renovaCase.owner_phone,
    marital_status: s(renovaCase.marital_status),
    spouse_name: s(renovaCase.spouse_name),
    spouse_phone: s(renovaCase.spouse_phone),
    nss: "", // never pre-filled: the full value is unrecoverable by design
    credit_number: "",
    clear_nss: false,
    clear_credit_number: false,
    dwelling_type: s(renovaCase.dwelling_type),
    floors: s(renovaCase.floors),
    bathrooms: s(renovaCase.bathrooms),
    bedrooms: s(renovaCase.bedrooms),
    conditions: s(renovaCase.conditions),
    has_deeds: renovaCase.has_deeds,
    deeds_holder_name: s(renovaCase.deeds_holder_name),
    final_offer: s(renovaCase.final_offer),
    market_value: s(renovaCase.market_value),
    property_tax_debt: s(renovaCase.property_tax_debt),
    other_debt: s(renovaCase.other_debt),
    water_debt: s(renovaCase.water_debt),
    electricity_debt: s(renovaCase.electricity_debt),
    gas_debt: s(renovaCase.gas_debt),
    debt_owed_to: s(renovaCase.debt_owed_to),
    owner_expected_amount: s(renovaCase.owner_expected_amount),
    sale_reason: s(renovaCase.sale_reason),
    key_questions: s(renovaCase.key_questions),
    general_situation: s(renovaCase.general_situation),
    notes: s(renovaCase.notes),
  };
}

export type RenovaFormErrors = Partial<Record<keyof RenovaFormValues, string>>;

export interface RenovaValidation {
  errors: RenovaFormErrors;
  /** Index of the earliest step that has an error, or null when valid. */
  firstStep: number | null;
}

function isNegative(value: string): boolean {
  return Number(value) < 0;
}

/**
 * Only what the brief makes mandatory is required: owner name, phone, entry
 * date and advisor. Everything else — proposal, market value, debts, spouse,
 * NSS, credit number — may still be missing when a case is first logged.
 */
export function validateRenovaForm(values: RenovaFormValues): RenovaValidation {
  const errors: RenovaFormErrors = {};

  if (!values.owner_name.trim()) errors.owner_name = "El nombre del titular es obligatorio.";
  if (!values.owner_phone.trim()) errors.owner_phone = "El celular es obligatorio.";
  if (!values.entry_date) errors.entry_date = "La fecha de ingreso es obligatoria.";
  if (!values.assigned_user_id) errors.assigned_user_id = "Selecciona un asesor.";

  for (const [field, max] of Object.entries(MAX_LENGTH) as [keyof RenovaFormValues, number][]) {
    const value = values[field];
    if (typeof value === "string" && value.trim().length > max && !errors[field]) {
      errors[field] = `Máximo ${max} caracteres.`;
    }
  }

  for (const field of MONEY_FIELDS) {
    const value = values[field].trim();
    if (!value) continue;
    if (Number.isNaN(Number(value))) errors[field] = "Ingresa un monto válido.";
    else if (isNegative(value)) errors[field] = "El monto no puede ser negativo.";
    else if (Number(value) > MAX_MONEY) errors[field] = "El monto es demasiado grande.";
    else if (!/^\d+(\.\d{1,2})?$/.test(value)) errors[field] = "Usa máximo dos decimales.";
  }

  for (const field of ["floors", "bedrooms"] as const) {
    const value = values[field].trim();
    if (!value) continue;
    if (Number.isNaN(Number(value)) || !Number.isInteger(Number(value))) errors[field] = "Ingresa un número entero.";
    else if (isNegative(value)) errors[field] = "No puede ser negativo.";
    else if (Number(value) > 100) errors[field] = "El valor es demasiado grande.";
  }
  const bathrooms = values.bathrooms.trim();
  if (bathrooms) {
    if (Number.isNaN(Number(bathrooms))) errors.bathrooms = "Ingresa un número válido.";
    else if (isNegative(bathrooms)) errors.bathrooms = "No puede ser negativo.";
    else if (Number(bathrooms) > 99) errors.bathrooms = "El valor es demasiado grande.";
    else if (!/^\d+(\.\d)?$/.test(bathrooms)) errors.bathrooms = "Usa máximo un decimal (por ejemplo 1.5).";
  }

  // The backend accepts only letters, digits and hyphens for these; caught here
  // WITHOUT ever echoing what was typed.
  for (const field of ["nss", "credit_number"] as const) {
    const value = values[field].trim();
    if (!value) continue;
    if (value.length < 4 || value.length > 30 || !/^[A-Za-z0-9-]+$/.test(value)) {
      errors[field] = "Debe tener entre 4 y 30 caracteres: solo letras, números y guiones.";
    }
  }

  const stepIndexes = Object.keys(errors).map((f) => FIELD_STEP[f as keyof RenovaFormValues]);
  return { errors, firstStep: stepIndexes.length > 0 ? Math.min(...stepIndexes) : null };
}

/** Sum of the five debt fields as the form currently holds them — display only; the server derives the authoritative `total_debt`. Null when none is filled. */
export function sumFormDebts(values: Pick<RenovaFormValues, (typeof DEBT_FIELDS)[number]>): number | null {
  const filled = DEBT_FIELDS.map((f) => values[f].trim()).filter((v) => v !== "" && !Number.isNaN(Number(v)));
  if (filled.length === 0) return null;
  // Work in cents so 0.1 + 0.2 style float drift never shows up in a money total.
  const cents = filled.reduce((sum, v) => sum + Math.round(Number(v) * 100), 0);
  return cents / 100;
}

const trimOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Builds the request body.
 *  - create: blank optional fields are simply omitted.
 *  - edit (PATCH): blank optional fields are sent as null so clearing a value
 *    in the form really clears it; NSS / credit number are only sent when the
 *    user typed a replacement (or explicitly chose to remove the stored one).
 * Money goes as decimal strings (no float rounding); counts as integers.
 */
export function toRenovaPayload(values: RenovaFormValues, mode: "create" | "edit"): RenovaCaseInput {
  const payload: RenovaCaseInput = {
    assigned_user_id: values.assigned_user_id,
    entry_date: values.entry_date,
    source: values.source,
    status: values.status,
    owner_name: values.owner_name.trim(),
    owner_phone: values.owner_phone.trim(),
    has_deeds: values.has_deeds,
  };

  const optionalText: (keyof RenovaCaseInput & keyof RenovaFormValues)[] = [
    "marital_status",
    "spouse_name",
    "spouse_phone",
    "dwelling_type",
    "conditions",
    "deeds_holder_name",
    "debt_owed_to",
    "sale_reason",
    "key_questions",
    "general_situation",
    "notes",
    "bathrooms",
    ...MONEY_FIELDS,
  ];
  const out = payload as Record<string, unknown>;
  for (const field of optionalText) {
    const value = trimOrNull(values[field] as string);
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
    const typed = values[field].trim();
    if (typed) out[field] = typed;
    else if (mode === "edit" && values[clearFlag]) out[field] = null;
  }

  return payload;
}
