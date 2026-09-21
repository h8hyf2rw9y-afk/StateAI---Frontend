import { RENOVA_FIELD_ORDER, type RenovaFormValues } from "@/features/renova/lib/form-values";
import { MAX_MONEY, MONEY_FIELDS } from "@/features/renova/lib/money";

export type RenovaFormErrors = Partial<Record<keyof RenovaFormValues, string>>;

export interface RenovaValidation {
  errors: RenovaFormErrors;
  /** The earliest field (in on-screen order) that has an error, or null when valid — where focus should go. */
  firstInvalidField: keyof RenovaFormValues | null;
}

/** Mirrors the backend's caps (app/schemas/renova_case.py) so most errors are caught before a round trip. */
const MAX_LENGTH: Partial<Record<keyof RenovaFormValues, number>> = {
  owner_name: 200,
  spouse_name: 200,
  deeds_holder_name: 200,
  owner_phone: 40,
  spouse_phone: 40,
  street_address: 300,
  neighborhood: 300,
  municipality: 300,
  debt_owed_to: 300,
  conditions: 5000,
  sale_reason: 5000,
  general_situation: 5000,
  notes: 5000,
};

function isNegative(value: string): boolean {
  return Number(value) < 0;
}

/**
 * Only what the brief makes mandatory is required — owner name, phone, entry
 * date and advisor (the `*` fields). Everything else, including proposal,
 * market value, debts, spouse, NSS and credit number, may still be missing
 * when a case is first logged, so it is valid to save without them. The same
 * rules apply to "Guardar borrador" and "Guardar prospecto" (the backend needs
 * those four to store a row at all); a draft simply keeps status "draft".
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

  const postalCode = values.postal_code.trim();
  if (postalCode && !/^\d{5}$/.test(postalCode)) errors.postal_code = "El código postal debe tener 5 dígitos.";

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

  const firstInvalidField = RENOVA_FIELD_ORDER.find((field) => errors[field]) ?? null;
  return { errors, firstInvalidField };
}
