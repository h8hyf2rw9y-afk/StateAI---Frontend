import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_SHARE_OPTIONS, RenovaShareCard, type RenovaShareOptions } from "@/features/renova/components/renova-share-card";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";
import type { RenovaCase } from "@/features/renova/types";

const apiMock = vi.fn();
vi.mock("@/lib/api/renova", () => ({
  getRenovaCase: (...args: unknown[]) => apiMock(...args),
  getRenovaCases: (...args: unknown[]) => apiMock(...args),
  getRenovaHistory: (...args: unknown[]) => apiMock(...args),
  createRenovaCase: (...args: unknown[]) => apiMock(...args),
  updateRenovaCase: (...args: unknown[]) => apiMock(...args),
}));

function card(overrides: Partial<RenovaCase> = {}, options: Partial<RenovaShareOptions> = {}, advisorName: string | null = "Ana Ruiz") {
  render(<RenovaShareCard renovaCase={makeRenovaCase(overrides)} options={{ ...DEFAULT_SHARE_OPTIONS, ...options }} advisorName={advisorName} />);
  return screen.getByTestId("renova-share-card");
}

describe("RenovaShareCard — content from a real case", () => {
  it("shows the header, the short reference and the requested composition", () => {
    const c = card();

    expect(c).toHaveTextContent("COMPRA DE CASAS");
    expect(c).toHaveTextContent("RENOVA · PROPPILOT");
    expect(c).toHaveTextContent("RN-9F3A2C");
    for (const label of [
      "Asesor",
      "Fecha",
      "Propuesta final",
      "Valor de mercado",
      "Deuda predial",
      "Deudas de servicios",
      "Total de adeudos",
      "Calle y número",
      "Colonia",
      "Municipio",
      "Código postal",
      "Resumen del inmueble",
      "Tipo",
      "Plantas",
      "Baños",
      "Recámaras",
      "Escrituras",
      "Condiciones de la casa",
      "Situación actual",
      "A quién se debe",
      "Comentarios relevantes",
      "Datos de contacto",
      "Nombre del titular",
      "Celular",
      "Preguntas clave",
      "¿Por qué la quiere vender?",
      "¿Cuánto espera recibir?",
    ]) {
      expect(c).toHaveTextContent(label);
    }
    expect(c).toHaveTextContent("Información de evaluación interna");
    expect(c).toHaveTextContent(/última actualización/i);
  });

  it("uses the values of the saved case, formatted in MXN", () => {
    const c = card();

    expect(c).toHaveTextContent("Ana Ruiz");
    expect(c).toHaveTextContent("$950,000");
    expect(c).toHaveTextContent("$1,400,000");
    expect(c).toHaveTextContent("$12,000"); // predial
    expect(c).toHaveTextContent("$1,250"); // water 800 + electricity 450 = services
    expect(c).toHaveTextContent("$13,250"); // backend total
    expect(c).toHaveTextContent("$1,100,000"); // what the owner expects
    expect(c).toHaveTextContent("Av. Constitución 123");
    expect(c).toHaveTextContent("Centro");
    expect(c).toHaveTextContent("Monterrey");
    expect(c).toHaveTextContent("64000");
    expect(c).toHaveTextContent("Dúplex");
    expect(c).toHaveTextContent("Rentada");
    expect(c).toHaveTextContent("Infonavit");
    expect(c).toHaveTextContent("Requiere pintura");
    expect(c).toHaveTextContent("Dueña con prisa por vender");
    expect(c).toHaveTextContent("Se muda de ciudad");
    expect(c).toHaveTextContent("María López");
    expect(c).toHaveTextContent("+52 81 5555 0101");
  });

  it("mentions other debts only when there are some, so the total is always explained", () => {
    expect(card({ other_debt: null })).not.toHaveTextContent(/otros adeudos/i);
    document.body.innerHTML = "";
    expect(card({ other_debt: "3000.00", total_debt: "16250.00" })).toHaveTextContent("El total incluye otros adeudos por $3,000.");
  });

  it("has fixed 1080px base width and a real white, dark-text surface independent of the app theme", () => {
    const c = card();

    expect(c.style.width).toBe("1080px");
    expect(c.style.backgroundColor).toMatch(/^(#fff(fff)?|rgb\(255, 255, 255\))$/);
    expect(c.className).toContain("bg-white");
    expect(c.className).toContain("text-slate-900");
    expect(c.className).not.toMatch(/\bdark:|text-foreground|bg-background/);
  });

  it("contains no controls — everything inside is part of the exported image", () => {
    const c = card();

    expect(c.querySelectorAll("button, input, select, textarea, a, [role='button']")).toHaveLength(0);
  });

  it("is presentational: it fetches nothing", () => {
    apiMock.mockClear();
    card();

    expect(apiMock).not.toHaveBeenCalled();
  });
});

describe("RenovaShareCard — incomplete cases", () => {
  it("shows Pendiente for anything missing and never undefined / null / NaN", () => {
    const c = card(
      {
        final_offer: null,
        market_value: null,
        property_tax_debt: null,
        water_debt: null,
        electricity_debt: null,
        gas_debt: null,
        other_debt: null,
        total_debt: null,
        owner_expected_amount: null,
        street_address: null,
        neighborhood: null,
        municipality: null,
        postal_code: null,
        dwelling_type: null,
        floors: null,
        bathrooms: null,
        bedrooms: null,
        has_deeds: "unknown",
        conditions: null,
        occupancy_status: null,
        debt_owed_to: null,
        general_situation: null,
        sale_reason: null,
      },
      {},
      null
    );

    expect(c.textContent?.match(/Pendiente/g)?.length).toBeGreaterThanOrEqual(15);
    expect(c.textContent).not.toMatch(/undefined|null|NaN/);
    expect(c.textContent).not.toContain("$0");
    expect(c.textContent).not.toContain("—");
  });

  it("formats bathrooms without a trailing .0 and half baths with one decimal", () => {
    expect(card({ bathrooms: "2.0" })).toHaveTextContent(/Baños\s*2(?!\.)/);
    document.body.innerHTML = "";
    expect(card({ bathrooms: "2.5" })).toHaveTextContent("2.5");
  });
});

describe("RenovaShareCard — what can never appear", () => {
  const ALWAYS_ON = { includePhone: true, includeAmounts: true, includeSpouse: true };

  it("never shows NSS, número de crédito or their masks — not even with every option on", () => {
    const c = card({}, ALWAYS_ON);

    expect(c.textContent).not.toMatch(/nss/i);
    expect(c.textContent).not.toMatch(/crédito|credito/i);
    expect(c.textContent).not.toContain("••••");
    expect(c.textContent).not.toContain("4455");
    expect(c.textContent).not.toContain("9911");
  });

  it("never shows INE, the full UUID, storage paths, signed URLs, tokens or audit data", () => {
    const c = card({}, ALWAYS_ON);

    expect(c.textContent).not.toContain("9f3a2c41-7b1d-4e0a-8c55-0d6e1f2a3b4c");
    expect(c.textContent).not.toMatch(/\bINE\b|storage|signed|token|audit|http|organization|org-1|user-1/i);
    expect(c.innerHTML).not.toContain("<img");
    expect(c.innerHTML).not.toContain("href");
  });

  it("does not show the spouse by default", () => {
    const c = card();

    expect(c.textContent).not.toContain("Juan Pérez");
    expect(c.textContent).not.toContain("+52 81 5555 0202");
    expect(c.textContent).not.toMatch(/cónyuge/i);
  });
});

describe("RenovaShareCard — options", () => {
  it("includePhone off removes the owner's phone (and the spouse's)", () => {
    const c = card({}, { includePhone: false, includeSpouse: true });

    expect(c.textContent).not.toContain("+52 81 5555 0101");
    expect(c.textContent).not.toContain("+52 81 5555 0202");
    expect(c).not.toHaveTextContent("Celular");
    expect(c).toHaveTextContent("María López");
  });

  it("includeAmounts off removes every amount, debt, creditor and expectation", () => {
    const c = card({}, { includeAmounts: false });

    expect(c.textContent).not.toMatch(/\$/);
    for (const label of ["Propuesta final", "Valor de mercado", "Deuda predial", "Deudas de servicios", "Total de adeudos", "A quién se debe", "¿Cuánto espera recibir?"]) {
      expect(c).not.toHaveTextContent(label);
    }
    expect(c.textContent).not.toContain("Infonavit");
    // The rest of the card is intact.
    expect(c).toHaveTextContent("Av. Constitución 123");
    expect(c).toHaveTextContent("¿Por qué la quiere vender?");
  });

  it("includeSpouse on shows the spouse's name and (when the phone is on) phone", () => {
    const c = card({}, { includeSpouse: true });

    expect(c).toHaveTextContent("Nombre del cónyuge");
    expect(c).toHaveTextContent("Juan Pérez");
    expect(c).toHaveTextContent("+52 81 5555 0202");
  });

  it("defaults: phone on, amounts on, spouse off", () => {
    expect(DEFAULT_SHARE_OPTIONS).toEqual({ includePhone: true, includeAmounts: true, includeSpouse: false });
  });
});
