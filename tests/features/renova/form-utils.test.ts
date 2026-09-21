import { describe, expect, it } from "vitest";
import {
  emptyRenovaFormValues,
  sumFormDebts,
  toRenovaPayload,
  validateRenovaForm,
  valuesFromRenovaCase,
} from "@/features/renova/form-utils";
import { formatRenovaDate, formatRenovaMoney, formatRenovaStatus } from "@/features/renova/types";
import type { RenovaCase } from "@/features/renova/types";
import { parseLeadsView } from "@/features/leads/views";

function validValues() {
  return { ...emptyRenovaFormValues("user-1"), owner_name: "María López", owner_phone: "+52 81 5555 0101" };
}

function makeCase(overrides: Partial<RenovaCase> = {}): RenovaCase {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-1",
    created_by_user_id: "user-1",
    entry_date: "2026-09-20",
    source: "whatsapp",
    status: "reviewing",
    owner_name: "María López",
    owner_phone: "+52 81 5555 0101",
    marital_status: "married_conjugal_partnership",
    spouse_name: "Juan Pérez",
    spouse_phone: null,
    dwelling_type: "duplex",
    floors: 2,
    bathrooms: "2.5",
    bedrooms: 3,
    conditions: "Requiere pintura",
    has_deeds: "yes",
    deeds_holder_name: "María López",
    currency: "MXN",
    final_offer: "950000.00",
    market_value: "1400000.00",
    property_tax_debt: "12000.00",
    other_debt: null,
    water_debt: "800.00",
    electricity_debt: null,
    gas_debt: null,
    debt_owed_to: "Infonavit",
    owner_expected_amount: "1100000.00",
    total_debt: "12800.00",
    sale_reason: "Se muda",
    key_questions: null,
    general_situation: null,
    notes: null,
    nss_masked: "••••4455",
    credit_number_masked: null,
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...overrides,
  };
}

describe("validateRenovaForm", () => {
  it("accepts a case with only the four mandatory fields", () => {
    const { errors, firstStep } = validateRenovaForm(validValues());
    expect(errors).toEqual({});
    expect(firstStep).toBeNull();
  });

  it("requires owner name, phone, entry date and advisor — with Spanish messages", () => {
    const { errors } = validateRenovaForm({
      ...emptyRenovaFormValues(""),
      entry_date: "",
    });
    expect(errors.owner_name).toBe("El nombre del titular es obligatorio.");
    expect(errors.owner_phone).toBe("El celular es obligatorio.");
    expect(errors.entry_date).toBe("La fecha de ingreso es obligatoria.");
    expect(errors.assigned_user_id).toBe("Selecciona un asesor.");
  });

  it("treats whitespace-only required text as missing", () => {
    const { errors } = validateRenovaForm({ ...validValues(), owner_name: "   " });
    expect(errors.owner_name).toBeDefined();
  });

  it("leaves proposal, market value, debts, spouse, NSS and credit number optional", () => {
    const { errors } = validateRenovaForm(validValues());
    for (const field of ["final_offer", "market_value", "property_tax_debt", "spouse_name", "nss", "credit_number"] as const) {
      expect(errors[field]).toBeUndefined();
    }
  });

  it.each(["final_offer", "market_value", "property_tax_debt", "other_debt", "water_debt", "electricity_debt", "gas_debt", "owner_expected_amount"] as const)(
    "rejects a negative %s",
    (field) => {
      const { errors } = validateRenovaForm({ ...validValues(), [field]: "-1" });
      expect(errors[field]).toBe("El monto no puede ser negativo.");
    }
  );

  it("rejects non-numeric money, more than two decimals and absurdly large amounts", () => {
    expect(validateRenovaForm({ ...validValues(), market_value: "abc" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "10.123" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "1000000000000" }).errors.market_value).toBeDefined();
    expect(validateRenovaForm({ ...validValues(), market_value: "1400000.50" }).errors.market_value).toBeUndefined();
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
  });

  it("validates NSS / credit-number format without ever echoing the typed value", () => {
    const bad = validateRenovaForm({ ...validValues(), nss: "no válido!!", credit_number: "ab" });
    expect(bad.errors.nss).toBeDefined();
    expect(bad.errors.credit_number).toBeDefined();
    expect(JSON.stringify(bad.errors)).not.toContain("no válido!!");
    expect(validateRenovaForm({ ...validValues(), nss: "TESTNSS4455667" }).errors.nss).toBeUndefined();
  });

  it("points at the earliest step that has an error", () => {
    // owner_name is on step 1 (Propietario), market_value on step 3 (Finanzas)
    const { firstStep } = validateRenovaForm({ ...validValues(), owner_name: "", market_value: "-5" });
    expect(firstStep).toBe(1);
    expect(validateRenovaForm({ ...validValues(), market_value: "-5" }).firstStep).toBe(3);
    expect(validateRenovaForm({ ...validValues(), entry_date: "" }).firstStep).toBe(0);
  });
});

describe("sumFormDebts", () => {
  it("adds the five debt fields and ignores the rest", () => {
    const values = {
      ...validValues(),
      property_tax_debt: "12000",
      other_debt: "3000.50",
      water_debt: "800",
      electricity_debt: "450",
      gas_debt: "100",
      market_value: "9999999", // not a debt
      final_offer: "5",
    };
    expect(sumFormDebts(values)).toBe(16350.5);
  });

  it("is null when no debt is filled and treats blanks as zero otherwise", () => {
    expect(sumFormDebts(validValues())).toBeNull();
    expect(sumFormDebts({ ...validValues(), water_debt: "500" })).toBe(500);
  });

  it("does not show float drift on cents", () => {
    expect(sumFormDebts({ ...validValues(), property_tax_debt: "0.1", other_debt: "0.2" })).toBe(0.3);
  });
});

describe("toRenovaPayload", () => {
  it("create: sends only the filled fields plus the defaults, no organization_id", () => {
    const payload = toRenovaPayload(validValues(), "create");

    expect(payload).toEqual({
      assigned_user_id: "user-1",
      entry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      source: "whatsapp",
      status: "new",
      owner_name: "María López",
      owner_phone: "+52 81 5555 0101",
      has_deeds: "unknown",
    });
    expect(payload).not.toHaveProperty("organization_id");
    expect(payload).not.toHaveProperty("nss");
  });

  it("sends money as decimal strings (no float rounding) and counts as integers", () => {
    const payload = toRenovaPayload(
      { ...validValues(), market_value: "1400000.50", floors: "2", bedrooms: "3", bathrooms: "2.5" },
      "create"
    );
    expect(payload.market_value).toBe("1400000.50");
    expect(payload.floors).toBe(2);
    expect(payload.bedrooms).toBe(3);
    expect(payload.bathrooms).toBe("2.5");
  });

  it("edit: clearing an optional field sends null so it really is cleared", () => {
    const values = { ...valuesFromRenovaCase(makeCase()), final_offer: "", spouse_name: "", floors: "" };
    const payload = toRenovaPayload(values, "edit");

    expect(payload.final_offer).toBeNull();
    expect(payload.spouse_name).toBeNull();
    expect(payload.floors).toBeNull();
    expect(payload.market_value).toBe("1400000.00");
  });

  it("edit: leaves NSS / credit number out unless the user typed a replacement or chose to remove it", () => {
    const base = valuesFromRenovaCase(makeCase());
    expect(toRenovaPayload(base, "edit")).not.toHaveProperty("nss");
    expect(toRenovaPayload(base, "edit")).not.toHaveProperty("credit_number");

    expect(toRenovaPayload({ ...base, nss: "NEWNSS0099887" }, "edit").nss).toBe("NEWNSS0099887");
    expect(toRenovaPayload({ ...base, clear_nss: true }, "edit").nss).toBeNull();
    // Removing only NSS never touches the credit number.
    expect(toRenovaPayload({ ...base, clear_nss: true }, "edit")).not.toHaveProperty("credit_number");
  });

  it("never pre-fills NSS or credit number from a loaded case", () => {
    const values = valuesFromRenovaCase(makeCase());
    expect(values.nss).toBe("");
    expect(values.credit_number).toBe("");
  });

  it("a stray clear flag is ignored on create", () => {
    expect(toRenovaPayload({ ...validValues(), clear_nss: true }, "create")).not.toHaveProperty("nss");
  });
});

describe("formatting", () => {
  it("formats money in es-MX and never invents $0 for a missing amount", () => {
    expect(formatRenovaMoney("1400000.50")).toMatch(/1,400,001|1,400,000/);
    expect(formatRenovaMoney("1400000")).toContain("1,400,000");
    expect(formatRenovaMoney(null)).toBe("—");
    expect(formatRenovaMoney(undefined)).toBe("—");
    expect(formatRenovaMoney("")).toBe("—");
    expect(formatRenovaMoney("0")).toContain("0");
  });

  it("parses a bare date as a LOCAL calendar day (no off-by-one west of UTC)", () => {
    expect(formatRenovaDate("2026-09-20")).toContain("20");
    expect(formatRenovaDate("2026-09-20")).toContain("2026");
    expect(formatRenovaDate("garbage")).toBe("garbage");
  });

  it("labels statuses in Spanish and tolerates unknown ones", () => {
    expect(formatRenovaStatus("offer_sent")).toBe("Oferta enviada");
    expect(formatRenovaStatus("cancelled")).toBe("Cancelado");
    expect(formatRenovaStatus("something_new")).toBe("something_new");
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
