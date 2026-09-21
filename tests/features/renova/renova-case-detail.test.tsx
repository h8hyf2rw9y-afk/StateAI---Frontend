import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RenovaCaseDetail } from "@/features/renova/components/renova-case-detail";
import type { RenovaCase } from "@/features/renova/types";

const getRenovaCaseMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({ getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args) }));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));

const FULL_NSS = "TESTNSS4455667";
const FULL_CREDIT = "TESTCRED9081726";

function makeCase(overrides: Partial<RenovaCase> = {}): RenovaCase {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-me",
    created_by_user_id: "user-me",
    entry_date: "2026-09-20",
    source: "whatsapp",
    status: "offer_sent",
    owner_name: "María López",
    owner_phone: "+52 81 5555 0101",
    marital_status: "married_conjugal_partnership",
    spouse_name: "Juan Pérez",
    spouse_phone: "+52 81 5555 0202",
    dwelling_type: "duplex",
    floors: 2,
    bathrooms: "2.5",
    bedrooms: 3,
    conditions: "Requiere pintura y cambio de cocina.",
    has_deeds: "yes",
    deeds_holder_name: "María López",
    currency: "MXN",
    final_offer: "950000.00",
    market_value: "1400000.00",
    property_tax_debt: "12000.00",
    other_debt: "3000.00",
    water_debt: "800.00",
    electricity_debt: "450.00",
    gas_debt: "100.00",
    debt_owed_to: "Infonavit",
    owner_expected_amount: "1100000.00",
    total_debt: "16350.00",
    sale_reason: "Se muda de ciudad.",
    key_questions: "¿Hay adeudos con el banco?",
    general_situation: "Dispuesta a negociar.",
    notes: "Contactar por la tarde.",
    nss_masked: "••••5667",
    credit_number_masked: "••••1726",
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...overrides,
  };
}

function open() {
  render(<RenovaCaseDetail caseId="case-1" trigger={<button>Abrir</button>} />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
}

describe("RenovaCaseDetail", () => {
  beforeEach(() => {
    getRenovaCaseMock.mockReset();
    getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase() });
  });

  it("does not load anything until it is opened", () => {
    render(<RenovaCaseDetail caseId="case-1" trigger={<button>Abrir</button>} />);
    expect(getRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("shows every section of the case in Spanish", async () => {
    open();

    const dialog = await screen.findByRole("dialog");
    expect(await screen.findByText("Requiere pintura y cambio de cocina.")).toBeInTheDocument();
    for (const heading of ["Registro", "Propietario", "Inmueble", "Finanzas", "Motivación y evaluación"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(dialog).toHaveTextContent("María López");
    expect(dialog).toHaveTextContent("Oferta enviada");
    expect(dialog).toHaveTextContent("Casado(a) — sociedad conyugal");
    expect(dialog).toHaveTextContent("Dúplex");
    expect(dialog).toHaveTextContent("Infonavit");
    expect(dialog).toHaveTextContent("Se muda de ciudad.");
    expect(dialog).toHaveTextContent("Yo");
  });

  it("formats every amount in MXN, including the derived debt total", async () => {
    open();
    const dialog = await screen.findByRole("dialog");
    await screen.findByText("Requiere pintura y cambio de cocina.");

    expect(dialog).toHaveTextContent("$1,400,000");
    expect(dialog).toHaveTextContent("$1,100,000");
    expect(dialog).toHaveTextContent("$950,000");
    expect(dialog).toHaveTextContent("$16,350");
  });

  it("shows NSS and número de crédito ONLY as masks — the full values never appear", async () => {
    open();
    const dialog = await screen.findByRole("dialog");
    await screen.findByText("Requiere pintura y cambio de cocina.");

    expect(dialog).toHaveTextContent("••••5667");
    expect(dialog).toHaveTextContent("••••1726");
    expect(dialog.textContent).not.toContain(FULL_NSS);
    expect(dialog.textContent).not.toContain(FULL_CREDIT);
    expect(dialog).toHaveTextContent("Número de crédito");
    expect(dialog.textContent).not.toMatch(/\bNC\b/);
  });

  it("says 'No registrado' when a sensitive value was never stored", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase({ nss_masked: null, credit_number_masked: null }) });

    open();
    const dialog = await screen.findByRole("dialog");
    await screen.findByText("Requiere pintura y cambio de cocina.");

    expect(dialog.textContent?.match(/No registrado/g)?.length).toBe(2);
  });

  it("uses dashes, not zeros, for amounts that were never captured", async () => {
    getRenovaCaseMock.mockResolvedValue({
      ok: true,
      data: makeCase({ final_offer: null, market_value: null, total_debt: null, property_tax_debt: null }),
    });

    open();
    const dialog = await screen.findByRole("dialog");
    await screen.findByText("Requiere pintura y cambio de cocina.");

    expect(dialog.textContent).not.toContain("$0");
  });

  it("shows a friendly error if the case can't be loaded", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 404 } });

    open();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró/i);
  });
});
