/**
 * Money helpers for the Renova form and card. Amounts are handled as plain
 * decimal strings ("1400000.50") everywhere — never floats — and only turned
 * into a display string ("$1,400,000.50") at the edge.
 */

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

export type MoneyField = (typeof MONEY_FIELDS)[number];

export const MAX_MONEY = 999_999_999_999.99; // Numeric(14, 2)

/** What a person may paste into a money box ("$ 1,400,000.50 MXN") reduced to the bare number ("1400000.50"). A leading minus is KEPT so validation can reject it instead of silently turning it positive. */
export function normalizeMoneyInput(raw: string): string {
  return raw.replace(/[\s$,]|mxn/gi, "");
}

const WELL_FORMED = /^\d+(\.\d{0,2})?$/;

/** "1400000.5" → "1,400,000.5" for display while the box is not being edited; anything that is not a clean non-negative number is returned untouched so the person can see (and fix) what they typed. */
export function formatMoneyInputDisplay(value: string): string {
  if (!WELL_FORMED.test(value)) return value;
  const [integer, decimals] = value.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

/** "$1,400,000" or "$1,400,000.50" — cents only when there are some. Null/empty/invalid → "—" (never a fabricated $0). */
export function formatMoney(value: string | number | null | undefined, currency = "MXN"): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  const hasCents = Math.round(number * 100) % 100 !== 0;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(number);
}

/**
 * Sum of the debt fields as the form currently holds them — display only; the
 * server derives the authoritative `total_debt`. Null when none is filled. Negative or malformed entries are ignored (they are flagged by validation, and a negative can never reduce the total).
 */
export function sumDebts(values: Partial<Record<(typeof DEBT_FIELDS)[number], string>>): number | null {
  const valid = DEBT_FIELDS.map((f) => (values[f] ?? "").trim()).filter((v) => WELL_FORMED.test(v));
  if (valid.length === 0) return null;
  // Work in cents so 0.1 + 0.2 style float drift never shows up in a money total.
  const cents = valid.reduce((sum, v) => sum + Math.round(Number(v) * 100), 0);
  return cents / 100;
}
