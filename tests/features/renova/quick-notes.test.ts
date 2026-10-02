import { describe, expect, it } from "vitest";
import { applyQuickNotes, extractQuickNotes, redactQuickNotesForAI } from "@/features/renova/lib/quick-notes";
import { emptyRenovaFormValues } from "@/features/renova/lib/form-values";

describe("Renova Quick Notes", () => {
  it("extracts explicitly labelled call data without an external service", () => {
    const result = extractQuickNotes(
      "Cliente Ana López tiene su propiedad en Río Pánuco 120, colonia Del Valle, municipio San Pedro. " +
        "Celular 8112345678, NSS 12345678901, número de crédito 9988776655. " +
        "Casa dúplex de 2 plantas, 3 recámaras y 1.5 baños. Adeudo de agua $1,200 y predial 4 años."
    );

    expect(result.values).toMatchObject({
      owner_name: "Ana López",
      owner_phone: "8112345678",
      street_address: "Río Pánuco 120",
      neighborhood: "Del Valle",
      municipality: "San Pedro",
      nss: "12345678901",
      credit_number: "9988776655",
      dwelling_type: "house",
      is_duplex: true,
      floors: "2",
      bedrooms: "3",
      bathrooms: "1.5",
      water_debt: "1200",
      property_tax_debt: "4",
      property_tax_debt_unit: "years",
    });
  });

  it("keeps the original note and never overwrites structured data already entered", () => {
    const current = { ...emptyRenovaFormValues("user-1"), owner_name: "Nombre confirmado", neighborhood: "Centro" };
    const note = "Cliente Otro Nombre, celular 8111111111, colonia Del Valle.";
    const result = applyQuickNotes(current, note);

    expect(result.values.owner_name).toBe("Nombre confirmado");
    expect(result.values.neighborhood).toBe("Centro");
    expect(result.values.owner_phone).toBe("8111111111");
    expect(result.values.notes).toBe("Cliente Otro Nombre, celular [TELEFONO_PROTEGIDO], colonia Del Valle.");
    expect(result.applied).toContain("owner_phone");
    expect(result.applied).not.toContain("owner_name");
  });

  it("does not treat an unlabelled long number as NSS or credit", () => {
    const result = extractQuickNotes("Hablé con la persona y anoté 12345678901 para revisarlo después.");
    expect(result.values.nss).toBeUndefined();
    expect(result.values.credit_number).toBeUndefined();
  });

  it("redacts protected values before AI extraction while preserving their labels", () => {
    const result = redactQuickNotesForAI(
      "Pedro, NSS 12345678910, número de crédito 9988776655, número teléfono 8125455785 y referencia 77777777"
    );
    expect(result).toContain("NSS [NSS_PROTEGIDO]");
    expect(result).toContain("número de crédito [CREDITO_PROTEGIDO]");
    expect(result).toContain("número teléfono [TELEFONO_PROTEGIDO]");
    expect(result).toContain("referencia [NUMERO_PROTEGIDO]");
    expect(result).not.toMatch(/12345678910|9988776655|8125455785|77777777/);
  });

  it("lets smart context fill ambiguous name and location but keeps local protected values", () => {
    const note = "Pedro, direccion Cardo 2010, NSS 12345678910, Salinas Victoria, Privadas Reales, numero telefono 8125455785";
    const result = applyQuickNotes(emptyRenovaFormValues("user-1"), note, {
      owner_name: "Pedro",
      street_address: "Cardo 2010",
      municipality: "Salinas Victoria",
      neighborhood: "Privadas Reales",
    });
    expect(result.values).toMatchObject({
      owner_name: "Pedro",
      street_address: "Cardo 2010",
      municipality: "Salinas Victoria",
      neighborhood: "Privadas Reales",
      nss: "12345678910",
      owner_phone: "8125455785",
    });
    expect(result.values.notes).toContain("[NSS_PROTEGIDO]");
    expect(result.values.notes).toContain("[TELEFONO_PROTEGIDO]");
    expect(result.values.notes).not.toMatch(/12345678910|8125455785/);
  });
});
