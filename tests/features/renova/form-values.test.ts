import { describe, expect, it } from "vitest";
import {
  emptyRenovaFormValues,
  isRenovaFormDirty,
  toRenovaPayload,
  valuesFromRenovaCase,
} from "@/features/renova/lib/form-values";
import { validateRenovaForm } from "@/features/renova/lib/validation";
import { formatMoney, formatMoneyInputDisplay, normalizeMoneyInput, sumDebts } from "@/features/renova/lib/money";
import { renovaShortId } from "@/features/renova/lib/short-id";
import { formatRenovaDate, formatRenovaMoney, formatRenovaOccupancy, formatRenovaStatus } from "@/features/renova/types";
import { parseLeadsView } from "@/features/leads/views";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

function validValues() {
  return { ...emptyRenovaFormValues("user-1"), owner_name: "María López", owner_phone: "+52 81 5555 0101" };
}

describe("validateRenovaForm", () => {
  it("accepts a case with only the four mandatory fields", () => {
    const { errors, firstInvalidField } = validateRenovaForm(validValues());
    expect(errors).toEqual({});
    expect(firstInvalidField).toBeNull();
  });

  it("requires owner name, phone, entry date and advisor — with Spanish messages", () => {
    const { errors } = validateRenovaForm({ ...emptyRenovaFormValues(""), entry_date: "" });
    expect(errors.owner_name).toBe("El nombre del titular es obligatorio.");
    expect(errors.owner_phone).toBe("El celular es obligatorio.");
    expect(errors.entry_date).toBe("La fecha de ingreso es obligatoria.");
    expect(errors.assigned_user_id).toBe("Selecciona un asesor.");
  });

  it("treats whitespace-only required text as missing", () => {
    expect(validateRenovaForm({ ...validValues(), owner_name: "   " }).errors.owner_name).toBeDefined();
  });

  it("leaves address, occupancy, proposal, debts, spouse, NSS and credit number optional", () => {
    const { errors } = validateRenovaForm(validValues());
    for (const field of ["street_address", "postal_code", "occupancy_status", "final_offer", "market_value", "spouse_name", "nss", "credit_number"] as const) {
      expect(errors[field]).toBeUndefined();
    }
  });

  it.each(["final_offer", "market_value", "property_tax_debt", "other_debt", "water_debt", "electricity_debt", "gas_debt", "owner_expected_amount"] as const)(
    "rejects a negative %s",
    (field) => {
      expect(validateRenovaForm({ ...validValues(), [field]: "-1" }).errors[field]).toBe("El monto no puede ser negativo.");
    }
  );

  it("rejects non-numeric money, more than two decimals and absurdly large amounts", () => {
    expect(validateRenovaForm({ ...validValues(), market_value: "abc" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "10.123" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "1000000000000" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "1400000.50" }).errors.market_value).toBeUndefined();
  });

  it("requires a five-digit postal code when one is given", () => {
    for (const bad of ["6400", "640001", "6400A"]) {
      expect(validateRenovaForm({ ...validValues(), postal_code: bad }).errors.postal_code).toBe("El código postal debe tener 5 dígitos.");
    }
    expect(validateRenovaForm({ ...validValues(), postal_code: "64000" }).errors.postal_code).toBeUndefined();
  });

  it("rejects negative floors, bathrooms and bedrooms, and fractional floors/bedrooms", () => {
    const { errors } = validateRenovaForm({ ...validValues(), floors: "-1", bathrooms: "-2", bedrooms: "-3" });
    expect(errors.floors).toBeDefined();
    expect(errors.bathrooms).toBeDefined();
    expect(errors.bedrooms).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), floors: "1.5" }).errors.floors).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), bathrooms: "1.5" }).errors.bathrooms).toBeUndefined();
    expect(validateRenovaForm({ ...validValues(), bathrooms: "1.55" }).errors.bathrooms).toBeDefined();
  });

  it("caps long text", () => {
    expect(validateRenovaForm({ ...validValues(), notes: "x".repeat(5001) }).errors.notes).toBe("Máximo 5000 caracteres.");
    expect(validateRenovaForm({ ...validValues(), owner_name: "x".repeat(201) }).errors.owner_name).toBe("Máximo 200 caracteres.");
    expect(validateRenovaForm({ ...validValues(), street_address: "x".repeat(301) }).errors.street_address).toBe("Máximo 300 caracteres.");
  });

  it("validates NSS / credit-number format without ever echoing the typed value", () => {
    const bad = validateRenovaForm({ ...validValues(), nss: "no válido!!", credit_number: "ab" });
    expect(bad.errors.nss).toBe("El NSS debe tener 11 dígitos.");
    expect(bad.errors.credit_number).toBe("El número de crédito debe tener de 6 a 20 dígitos.");
    expect(JSON.stringify(bad.errors)).not.toContain("no válido!!");
    expect(validateRenovaForm({ ...validValues(), nss: "00123456789" }).errors.nss).toBeUndefined();
  });

  it("NSS is exactly 11 digits and credit number 6-20 digits; separators are allowed, letters and masks are not", () => {
    const nss = (value: string) => validateRenovaForm({ ...validValues(), nss: value }).errors.nss;
    const credit = (value: string) => validateRenovaForm({ ...validValues(), credit_number: value }).errors.credit_number;
    expect(nss("001 2345 6789")).toBeUndefined();
    expect(nss("001-23456-789")).toBeUndefined();
    for (const bad of ["1234567890", "123456789012", "0012345678A", "•••••••4821", "***********"]) expect(nss(bad)).toBeDefined();
    expect(credit("0908 1726 30")).toBeUndefined();
    expect(credit("123456")).toBeUndefined();
    for (const bad of ["12345", "1".repeat(21), "12345ABC90", "••••••7104", "**********"]) expect(credit(bad)).toBeDefined();
  });

  it("sends typed identifiers as bare digits, keeping leading zeros — and never a mask", () => {
    const payload = toRenovaPayload({ ...validValues(), nss: "001 2345 6789", credit_number: "0908-1726-30" }, "edit", "new");
    expect(payload.nss).toBe("00123456789");
    expect(payload.credit_number).toBe("0908172630");
    const untouched = toRenovaPayload(valuesFromRenovaCase(makeRenovaCase()), "edit", "new");
    expect(JSON.stringify(untouched)).not.toMatch(/nss|credit_number|•|\*/);
  });

  it("points at the first invalid field in on-screen order", () => {
    expect(validateRenovaForm({ ...validValues(), owner_name: "", market_value: "-5" }).firstInvalidField).toBe("market_value");
    expect(validateRenovaForm({ ...validValues(), owner_name: "" }).firstInvalidField).toBe("owner_name");
    expect(validateRenovaForm({ ...validValues(), entry_date: "", owner_name: "" }).firstInvalidField).toBe("entry_date");
    expect(validateRenovaForm({ ...validValues(), assigned_user_id: "", entry_date: "" }).firstInvalidField).toBe("assigned_user_id");
  });
});

describe("money helpers", () => {
  it("sumDebts adds the five debt fields and ignores the rest", () => {
    expect(
      sumDebts({ property_tax_debt: "12000", other_debt: "3000.50", water_debt: "800", electricity_debt: "450", gas_debt: "100" })
    ).toBe(16350.5);
  });

  it("sumDebts is null when nothing is captured and treats blanks as zero otherwise", () => {
    expect(sumDebts({})).toBeNull();
    expect(sumDebts({ water_debt: "500" })).toBe(500);
  });

  it("sumDebts never lets a negative or malformed entry change the total, and has no float drift", () => {
    expect(sumDebts({ property_tax_debt: "-500", water_debt: "abc" })).toBeNull();
    expect(sumDebts({ property_tax_debt: "1000", other_debt: "-500" })).toBe(1000);
    expect(sumDebts({ property_tax_debt: "0.1", other_debt: "0.2" })).toBe(0.3);
  });

  it("formats an MXN amount with cents only when there are some, and never invents $0", () => {
    expect(formatMoney("1400000")).toBe("$1,400,000");
    expect(formatMoney("1400000.50")).toBe("$1,400,000.50");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("")).toBe("—");
    expect(formatMoney("not a number")).toBe("—");
    expect(formatRenovaMoney("0")).toBe("$0");
  });

  it("normalizes what a person pastes and keeps a minus sign so it can be rejected", () => {
    expect(normalizeMoneyInput("$ 1,400,000.50 MXN")).toBe("1400000.50");
    expect(normalizeMoneyInput("-500")).toBe("-500");
  });

  it("groups thousands for display only when the value is a clean non-negative number", () => {
    expect(formatMoneyInputDisplay("1400000")).toBe("1,400,000");
    expect(formatMoneyInputDisplay("1400000.5")).toBe("1,400,000.5");
    expect(formatMoneyInputDisplay("")).toBe("");
    expect(formatMoneyInputDisplay("-500")).toBe("-500");
    expect(formatMoneyInputDisplay("12abc")).toBe("12abc");
  });
});

describe("toRenovaPayload", () => {
  it("create: sends only the filled fields plus the required ones, no organization_id, source or key_questions", () => {
    const payload = toRenovaPayload(validValues(), "create", "new");

    expect(payload).toEqual({
      assigned_user_id: "user-1",
      entry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      status: "new",
      owner_name: "María López",
      owner_phone: "+52 81 5555 0101",
      has_deeds: "unknown",
    });
    for (const key of ["organization_id", "nss", "source", "key_questions"]) expect(payload).not.toHaveProperty(key);
  });

  it("the caller decides the status (draft vs prospect)", () => {
    expect(toRenovaPayload(validValues(), "create", "draft").status).toBe("draft");
  });

  it("sends money as decimal strings (no float rounding), counts as integers and the new address fields", () => {
    const payload = toRenovaPayload(
      {
        ...validValues(),
        market_value: "1400000.50",
        floors: "2",
        bedrooms: "3",
        bathrooms: "2.5",
        street_address: " Av. Constitución 123 ",
        postal_code: "64000",
        occupancy_status: "vacant",
      },
      "create",
      "new"
    );
    expect(payload.market_value).toBe("1400000.50");
    expect(payload.floors).toBe(2);
    expect(payload.bedrooms).toBe(3);
    expect(payload.bathrooms).toBe("2.5");
    expect(payload.street_address).toBe("Av. Constitución 123");
    expect(payload.postal_code).toBe("64000");
    expect(payload.occupancy_status).toBe("vacant");
  });

  it("edit: clearing an optional field sends null so it really is cleared — but never touches key_questions", () => {
    const values = { ...valuesFromRenovaCase(makeRenovaCase()), final_offer: "", spouse_name: "", floors: "" };
    const payload = toRenovaPayload(values, "edit", "reviewing");

    expect(payload.final_offer).toBeNull();
    expect(payload.spouse_name).toBeNull();
    expect(payload.floors).toBeNull();
    expect(payload.market_value).toBe("1400000");
    expect(payload).not.toHaveProperty("key_questions");
  });

  it("edit: leaves NSS / credit number out unless the user typed a replacement or chose to remove it", () => {
    const base = valuesFromRenovaCase(makeRenovaCase());
    expect(toRenovaPayload(base, "edit", "new")).not.toHaveProperty("nss");
    expect(toRenovaPayload(base, "edit", "new")).not.toHaveProperty("credit_number");

    expect(toRenovaPayload({ ...base, nss: "NEWNSS0099887" }, "edit", "new").nss).toBe("NEWNSS0099887");
    expect(toRenovaPayload({ ...base, clear_nss: true }, "edit", "new").nss).toBeNull();
    expect(toRenovaPayload({ ...base, clear_nss: true }, "edit", "new")).not.toHaveProperty("credit_number");
  });

  it("never pre-fills NSS or credit number from a loaded case", () => {
    const values = valuesFromRenovaCase(makeRenovaCase());
    expect(values.nss).toBe("");
    expect(values.credit_number).toBe("");
    expect(JSON.stringify(values)).not.toContain("4455");
  });

  it("a stray clear flag is ignored on create", () => {
    expect(toRenovaPayload({ ...validValues(), clear_nss: true }, "create", "new")).not.toHaveProperty("nss");
  });
});

describe("form values", () => {
  it("shows saved money the way a person types it", () => {
    const values = valuesFromRenovaCase(makeRenovaCase({ market_value: "1400000.00", water_debt: "800.50", final_offer: null }));
    expect(values.market_value).toBe("1400000");
    expect(values.water_debt).toBe("800.5");
    expect(values.final_offer).toBe("");
  });

  it("detects unsaved changes", () => {
    const initial = valuesFromRenovaCase(makeRenovaCase());
    expect(isRenovaFormDirty(initial, initial)).toBe(false);
    expect(isRenovaFormDirty({ ...initial }, initial)).toBe(false);
    expect(isRenovaFormDirty({ ...initial, notes: "x" }, initial)).toBe(true);
    expect(isRenovaFormDirty({ ...initial, nss: "1234" }, initial)).toBe(true);
    expect(isRenovaFormDirty({ ...initial, clear_credit_number: true }, initial)).toBe(true);
  });
});

describe("formatting", () => {
  it("parses a bare date as a LOCAL calendar day (no off-by-one west of UTC)", () => {
    expect(formatRenovaDate("2026-09-20")).toContain("20");
    expect(formatRenovaDate("2026-09-20")).toContain("2026");
    expect(formatRenovaDate("garbage")).toBe("garbage");
  });

  it("labels statuses and occupancy in Spanish and tolerates unknown ones", () => {
    expect(formatRenovaStatus("draft")).toBe("Borrador");
    expect(formatRenovaStatus("offer_sent")).toBe("Oferta enviada");
    expect(formatRenovaStatus("something_new")).toBe("something_new");
    expect(formatRenovaOccupancy("lives_there")).toBe("Vive ahí");
    expect(formatRenovaOccupancy(null)).toBe("—");
  });

  it("derives a short reference from the case id that is never the UUID", () => {
    const id = "9f3a2c41-7b1d-4e0a-8c55-0d6e1f2a3b4c";
    expect(renovaShortId(id)).toBe("RN-9F3A2C");
    expect(renovaShortId(id)).not.toContain(id);
    expect(renovaShortId("")).toBe("RN-000000");
  });
});

describe("parseLeadsView", () => {
  it("accepts the three views and defaults everything else to all", () => {
    expect(parseLeadsView("all")).toBe("all");
    expect(parseLeadsView("active")).toBe("active");
    expect(parseLeadsView("renova")).toBe("renova");
    expect(parseLeadsView(null)).toBe("all");
    expect(parseLeadsView(undefined)).toBe("all");
    expect(parseLeadsView("")).toBe("all");
    expect(parseLeadsView("ACTIVE")).toBe("all");
    expect(parseLeadsView("renova;drop")).toBe("all");
  });
});
