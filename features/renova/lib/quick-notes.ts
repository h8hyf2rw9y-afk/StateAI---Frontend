import type { RenovaFormValues } from "@/features/renova/lib/form-values";

export type QuickNotesField = keyof Pick<
  RenovaFormValues,
  | "owner_name"
  | "owner_phone"
  | "street_address"
  | "neighborhood"
  | "municipality"
  | "postal_code"
  | "dwelling_type"
  | "is_duplex"
  | "floors"
  | "bathrooms"
  | "bedrooms"
  | "property_tax_debt"
  | "property_tax_debt_unit"
  | "other_debt"
  | "water_debt"
  | "electricity_debt"
  | "gas_debt"
  | "owner_expected_amount"
  | "market_value"
  | "proposal_type"
  | "debt_coverage_amount"
  | "owner_cash_offer"
  | "nss"
  | "credit_number"
  | "sale_reason"
>;

export interface QuickNotesExtraction {
  values: Partial<Pick<RenovaFormValues, QuickNotesField>>;
  fields: QuickNotesField[];
}

/** Non-sensitive structured fields returned by the backend's LLM extractor. */
export type SmartQuickNotesExtraction = Partial<
  Record<Exclude<QuickNotesField, "owner_phone" | "nss" | "credit_number">, string | number | boolean | null>
>;

const LABELS: Partial<Record<QuickNotesField, string>> = {
  owner_name: "nombre",
  owner_phone: "celular",
  street_address: "dirección",
  neighborhood: "colonia",
  municipality: "municipio",
  postal_code: "código postal",
  dwelling_type: "tipo de vivienda",
  is_duplex: "dúplex",
  floors: "plantas",
  bathrooms: "baños",
  bedrooms: "recámaras",
  property_tax_debt: "predial",
  other_debt: "adeudo",
  water_debt: "agua",
  electricity_debt: "luz",
  gas_debt: "gas",
  owner_expected_amount: "monto esperado",
  market_value: "valor de mercado",
  proposal_type: "modalidad de propuesta",
  debt_coverage_amount: "cobertura de deuda",
  owner_cash_offer: "efectivo para el propietario",
  nss: "NSS",
  credit_number: "crédito",
  sale_reason: "motivo de venta",
};

export function quickNotesFieldLabel(field: QuickNotesField): string {
  return LABELS[field] ?? field;
}

/**
 * Removes protected numbers before the note leaves the browser. Labels stay
 * in place so the model understands the sentence, but it never receives the
 * actual NSS, credit number or phone. A final generic pass catches any other
 * long number that was not clearly labelled.
 */
export function redactQuickNotesForAI(note: string): string {
  return note
    .replace(
      /((?:nss|n[uú]mero\s+de\s+seguro\s+social)(?:\s+es|\s*:)?\s*)(?:\d[\d -]{9,20}\d)/gi,
      "$1[NSS_PROTEGIDO]"
    )
    .replace(
      /((?:n[uú]mero\s+de\s+cr[eé]dito|cr[eé]dito)(?:\s+es|\s*:)?\s*)(?:\d[\d -]{4,28}\d)/gi,
      "$1[CREDITO_PROTEGIDO]"
    )
    .replace(
      /((?:n[uú]mero\s+(?:de\s+)?(?:tel[eé]fono|telefon)|tel[eé]fono|celular|whatsapp|tel\.?)\s*(?:es|:)?\s*)(?:\+?\d[\d ()-]{6,20}\d)/gi,
      "$1[TELEFONO_PROTEGIDO]"
    )
    .replace(/(?<!\d)(?:\d[\s()-]?){6,20}(?!\d)/g, "[NUMERO_PROTEGIDO]");
}

function captured(text: string, pattern: RegExp): string | null {
  return text.match(pattern)?.[1]?.trim() || null;
}

function digits(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/\D/g, "");
  return normalized || null;
}

function money(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[$,\s]/g, "");
  const match = normalized.match(/^(\d+(?:\.\d{1,2})?)(mil|k)?$/);
  if (!match) return null;
  const amount = Number(match[1]) * (match[2] ? 1000 : 1);
  return Number.isFinite(amount) ? String(amount) : null;
}

function cleanPhrase(value: string | null): string | null {
  return value?.replace(/\s+/g, " ").replace(/[,:;.-]+$/, "").trim() || null;
}

/**
 * Extracts only values that are explicitly labelled or unambiguous in the
 * note. It intentionally runs in the browser and never sends NSS, credit
 * number or the rest of the call notes to an LLM/service.
 */
export function extractQuickNotes(note: string): QuickNotesExtraction {
  const text = note.normalize("NFC");
  const values: QuickNotesExtraction["values"] = {};

  const assign = <K extends QuickNotesField>(field: K, value: RenovaFormValues[K] | null) => {
    if (value !== null && value !== "") values[field] = value;
  };

  assign(
    "owner_name",
    cleanPhrase(
      captured(
        text,
        /(?:cliente|titular|propietari[oa])(?:\s+se\s+llama|\s+es|\s*:)?\s+([a-záéíóúüñ][a-záéíóúüñ' -]{1,80}?)(?=\s+(?:tiene|vive|cuenta|propiedad|casa|tel[eé]fono|celular|nss|n[uú]mero)|[,;.\n]|$)/i
      )
    )
  );
  assign(
    "owner_phone",
    digits(
      captured(
        text,
        /(?:n[uú]mero\s+(?:de\s+)?(?:tel[eé]fono|telefon)|tel[eé]fono|celular|whatsapp|tel\.?)(?:\s+es|\s*:)?\s*(\+?\d[\d ()-]{7,20})/i
      )
    )
  );
  assign("nss", digits(captured(text, /(?:nss|n[uú]mero\s+de\s+seguro\s+social)(?:\s+es|\s*:)?\s*([\d -]{11,20})/i)));
  assign("credit_number", digits(captured(text, /(?:n[uú]mero\s+de\s+cr[eé]dito|cr[eé]dito)(?:\s+es|\s*:)?\s*([\d -]{6,30})/i)));

  const neighborhood = cleanPhrase(captured(text, /(?:colonia|col\.?)(?:\s*:)?\s*([^,;.\n]+)/i));
  const municipality = cleanPhrase(captured(text, /(?:municipio|alcald[ií]a)(?:\s*:)?\s*([^,;.\n]+)/i));
  assign("neighborhood", neighborhood);
  assign("municipality", municipality);
  assign("postal_code", digits(captured(text, /(?:c[oó]digo\s+postal|c\.?p\.?)(?:\s*:)?\s*(\d{5})/i)));

  const address = cleanPhrase(
    captured(text, /(?:direcci[oó]n|domicilio|propiedad\s+(?:est[aá]|queda)?\s*en|casa\s+(?:est[aá]|queda)?\s*en)(?:\s*:)?\s*([^,;.\n]+)/i)
  );
  if (address) {
    const withoutLabels = address.split(/,?\s+(?=colonia|col\.?|municipio|alcald[ií]a|c[oó]digo\s+postal|c\.?p\.?)/i)[0];
    assign("street_address", cleanPhrase(withoutLabels));
  }

  if (/\b(?:casa|vivienda)\b/i.test(text)) assign("dwelling_type", "house");
  else if (/\b(?:departamento|depa)\b/i.test(text)) assign("dwelling_type", "apartment");
  if (/\bd[uú]plex\b/i.test(text)) assign("is_duplex", true);

  assign("floors", captured(text, /(\d{1,2})\s*(?:plantas?|pisos?|niveles?)\b/i));
  assign("bathrooms", captured(text, /(\d+(?:\.5)?)\s*ba[ñn]os?\b/i));
  assign("bedrooms", captured(text, /(\d{1,2})\s*(?:rec[aá]maras?|habitaciones?|cuartos?)\b/i));

  const predialYears = captured(text, /(?:predial)(?:\s+de|\s*:)?\s*(\d{1,2})\s*a[ñn]os?/i);
  if (predialYears) {
    assign("property_tax_debt", predialYears);
    assign("property_tax_debt_unit", "years");
  } else {
    assign("property_tax_debt", money(captured(text, /(?:adeudo|deuda)?\s*(?:de\s+)?predial(?:\s+de|\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  }
  assign("water_debt", money(captured(text, /(?:adeudo|deuda)\s+(?:de\s+)?agua(?:\s+de|\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  assign("electricity_debt", money(captured(text, /(?:adeudo|deuda)\s+(?:de\s+)?luz(?:\s+de|\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  assign("gas_debt", money(captured(text, /(?:adeudo|deuda)\s+(?:de\s+)?gas(?:\s+de|\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  assign("other_debt", money(captured(text, /(?:adeudo|deuda)(?!\s+(?:de\s+)?(?:predial|agua|luz|gas))(?:\s+total)?(?:\s+de|\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  assign("owner_expected_amount", money(captured(text, /(?:espera\s+recibir|quiere\s+recibir|pide)(?:\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));
  assign("market_value", money(captured(text, /(?:valor\s+de\s+mercado|vale)(?:\s*:)?\s*\$?([\d,.]+(?:\s*(?:mil|k))?)/i)));

  // Renova's structured proposal — a flat "propuesta: $X" is deliberately NOT
  // extracted here; "solo cubrimos la deuda" must never collapse into a
  // peso figure. Only clearly-labelled debt-coverage / cash-to-owner
  // phrasing is captured; anything less explicit is left for the backend's
  // LLM extraction (which sees the whole sentence) or for manual entry —
  // never guessed into the wrong bucket.
  const debtCoverage = money(
    captured(text, /(?:cubrimos|cubre(?:remos)?|liquidar(?:emos)?|cubrir)\s+(?:los\s+|las\s+)?\$?([\d,.]+(?:\s*(?:mil|k))?)/i)
  );
  const cashOffer = money(
    captured(text, /(?:le\s+damos|le\s+ofrecemos|entregamos|entregarle)\s+\$?([\d,.]+(?:\s*(?:mil|k))?)/i)
  );
  // (?:^|\s) instead of a leading \b: JS's plain \w doesn't include accented
  // letters, so \b fails to anchor right before "único/única" -- it would
  // silently never match "únicamente" otherwise.
  const saysDebtOnly = /(?:^|\s)(?:solo|únicamente|unicamente)\b[^.]*(?:deuda|cr[eé]dito)|no\s+se\s+(?:le\s+)?entrega\s+efectivo/i.test(text);
  const saysCashOnly = /\bsolo\b[^.]*efectivo|efectivo\s+(?:únicamente|unicamente)/i.test(text);
  assign("debt_coverage_amount", debtCoverage);
  assign("owner_cash_offer", cashOffer);
  if (debtCoverage && cashOffer) assign("proposal_type", "debt_plus_cash");
  else if (saysDebtOnly) assign("proposal_type", "debt_only");
  else if (saysCashOnly && cashOffer) assign("proposal_type", "cash_only");

  assign("sale_reason", cleanPhrase(captured(text, /(?:quiere|necesita)\s+vender\s+porque\s+([^;.\n]+)/i)));

  return { values, fields: Object.keys(values) as QuickNotesField[] };
}

/** Applies detected values without replacing structured data already typed. */
export function applyQuickNotes(
  current: RenovaFormValues,
  note: string,
  smartValues: SmartQuickNotesExtraction = {}
): { values: RenovaFormValues; applied: QuickNotesField[] } {
  const local = extractQuickNotes(note);
  const smart = Object.fromEntries(
    Object.entries(smartValues)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([field, value]) => [field, typeof value === "string" || typeof value === "boolean" ? value : String(value)])
  ) as QuickNotesExtraction["values"];
  // Explicit/local labels win. The model fills context that deterministic
  // parsing cannot, such as an unlabelled name or Mexican location sequence.
  const extraction: QuickNotesExtraction = {
    values: { ...smart, ...local.values },
    fields: [...new Set([...Object.keys(smart), ...local.fields])] as QuickNotesField[],
  };
  const next = { ...current };
  const applied: QuickNotesField[] = [];

  for (const field of extraction.fields) {
    const existing = current[field];
    const replacingDefaultPredialUnit =
      field === "property_tax_debt_unit" && existing === "mxn" && extraction.values[field] === "years";
    if (!replacingDefaultPredialUnit && ((typeof existing === "string" && existing.trim() !== "") || (typeof existing === "boolean" && existing))) continue;
    Object.assign(next, { [field]: extraction.values[field] });
    applied.push(field);
  }

  const trimmed = note.trim();
  const protectedNote = redactQuickNotesForAI(trimmed);
  if (trimmed && !current.notes.includes(protectedNote)) {
    next.notes = current.notes.trim() ? `${current.notes.trim()}\n\nQuick Notes:\n${protectedNote}` : protectedNote;
  }
  return { values: next, applied };
}
