import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RenovaCaseDetail } from "@/features/renova/components/renova-case-detail";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const getRenovaCaseMock = vi.fn();
const getRenovaHistoryMock = vi.fn();
const updateRenovaCaseMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args),
  getRenovaHistory: (...args: unknown[]) => getRenovaHistoryMock(...args),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
  createRenovaCase: vi.fn(),
}));
vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-1" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

// Editar / Editar propuesta mount the full Renova form (~35 fields); under the
// whole suite running in parallel the default 5s budget is occasionally too
// tight — same note and fix as leads-workspace.test.tsx.
vi.setConfig({ testTimeout: 15_000 });

const history = [
  { id: "h2", action: "RENOVA_CASE_STATUS_CHANGED", created_at: "2026-09-21T15:30:00Z" },
  { id: "h1", action: "RENOVA_CASE_CREATED", created_at: "2026-09-20T12:00:00Z" },
];

async function renderDetail(overrides = {}) {
  getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase(overrides) });
  render(<RenovaCaseDetail caseId="case-1" />);
  await screen.findByRole("heading", { level: 1, name: "María López" });
}

describe("RenovaCaseDetail", () => {
  beforeEach(() => {
    for (const mock of [getRenovaCaseMock, getRenovaHistoryMock, updateRenovaCaseMock]) mock.mockReset();
    getRenovaHistoryMock.mockResolvedValue({ ok: true, data: history });
  });

  it("shows a loading state and loads the real case by id", async () => {
    getRenovaCaseMock.mockReturnValue(new Promise(() => {}));
    render(<RenovaCaseDetail caseId="case-1" />);

    expect(screen.getByText(/cargando expediente/i)).toBeInTheDocument();
    expect(getRenovaCaseMock).toHaveBeenCalledWith("case-1");
  });

  it("shows owner, status, advisor, entry date and the short reference in the header", async () => {
    await renderDetail();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("María López");
    expect(screen.getByText("En revisión", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("RN-9F3A2C")).toBeInTheDocument();
    expect(screen.getByText("Yo")).toBeInTheDocument();
    expect(screen.getByText(/Ingreso/)).toBeInTheDocument();
  });

  it("shows address, property, financial, motivation and owner data in Spanish", async () => {
    await renderDetail();
    const page = document.body;

    for (const text of [
      "Av. Constitución 123",
      "Centro",
      "Monterrey",
      "64000",
      "Departamento dúplex",
      "Rentada",
      "Requiere pintura",
      "Casado(a) — sociedad conyugal",
      "Juan Pérez",
      "Infonavit",
      "Se muda de ciudad",
      "Dueña con prisa por vender",
      "Contacto por WhatsApp",
    ]) {
      expect(page).toHaveTextContent(text);
    }
    for (const heading of ["Contexto y comentarios", "Adeudos y propuesta", "Propiedad", "Personas y datos protegidos"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect((await screen.findAllByText("Historial")).length).toBeGreaterThanOrEqual(2);
  });

  it("presents the dossier in client-first order: comments, debts, property and people", async () => {
    await renderDetail();

    const headings = ["Contexto y comentarios", "Adeudos y propuesta", "Propiedad", "Personas y datos protegidos"].map(
      (name) => screen.getByRole("heading", { name })
    );
    for (let index = 1; index < headings.length; index += 1) {
      expect(headings[index - 1].compareDocumentPosition(headings[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("formats every amount in MXN including the derived debt total", async () => {
    await renderDetail();

    for (const amount of ["$950,000", "$1,400,000", "$1,100,000", "$12,000", "$13,250"]) {
      expect(document.body).toHaveTextContent(amount);
    }
  });

  it("shows 'Deuda predial' in years, not as a peso amount, when that's how it was captured", async () => {
    await renderDetail({ property_tax_debt: "3.00", property_tax_debt_unit: "years" });

    expect(document.body).toHaveTextContent("3 años");
    expect(document.body).not.toHaveTextContent("$3");
  });

  it("shows NSS and número de crédito ONLY as the server's masks", async () => {
    await renderDetail();

    expect(document.body).toHaveTextContent("•••••••4455");
    expect(document.body).toHaveTextContent("••••••9911");
    expect(document.body.textContent).not.toMatch(/\bNC\b/);
  });

  it("says 'No registrado' for protected values that were never stored, and uses dashes (never $0) for missing amounts", async () => {
    await renderDetail({ nss_masked: null, credit_number_masked: null, final_offer: null, market_value: null, total_debt: null });

    expect(document.body.textContent?.match(/No registrado/g)).toHaveLength(2);
    expect(document.body.textContent).not.toContain("$0");
    expect(document.body.textContent).not.toMatch(/undefined|NaN|null/);
  });

  it("lists the relevant history as what happened and when — never the audit data", async () => {
    await renderDetail();

    expect(await screen.findByText("Cambio de estado")).toBeInTheDocument();
    expect(screen.getByText("Expediente creado")).toBeInTheDocument();
    expect(getRenovaHistoryMock).toHaveBeenCalledWith("case-1");
  });

  it("shows an empty history message instead of an empty box", async () => {
    getRenovaHistoryMock.mockResolvedValue({ ok: true, data: [] });
    await renderDetail();

    expect(await screen.findByText("Sin movimientos registrados")).toBeInTheDocument();
  });

  it("shows a friendly error if the case can't be loaded", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 404 } });
    render(<RenovaCaseDetail caseId="case-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró el registro/i);
  });

  it("links back to the Renova list", async () => {
    await renderDetail();

    expect(screen.getByRole("link", { name: /volver a renova/i })).toHaveAttribute("href", "/leads?view=renova");
  });
});

describe("RenovaCaseDetail — structured proposal", () => {
  it("shows the full breakdown for a debt_plus_cash proposal, including a $0-safe cash figure", async () => {
    await renderDetail({
      proposal_type: "debt_plus_cash",
      debt_coverage_amount: "320000.00",
      owner_cash_offer: "140000.00",
      total_proposal_value: "460000.00",
    });

    expect(document.body).toHaveTextContent("Deuda más efectivo");
    expect(document.body).toHaveTextContent("$320,000");
    expect(document.body).toHaveTextContent("$140,000");
    expect(document.body).toHaveTextContent("$460,000");
  });

  it("shows an explicit $0 cash offer for a debt_only proposal instead of hiding the row", async () => {
    await renderDetail({
      proposal_type: "debt_only",
      debt_coverage_amount: "320000.00",
      owner_cash_offer: "0.00",
      total_proposal_value: "320000.00",
    });

    expect(document.body).toHaveTextContent("Solo liquidación de deuda");
    expect(document.body.textContent).toContain("$0");
  });

  it("flags a legacy unclassified case for manual classification instead of showing the new breakdown", async () => {
    await renderDetail({ proposal_type: null, debt_coverage_amount: null, owner_cash_offer: null, total_proposal_value: null, final_offer: "275000.00" });

    expect(document.body).toHaveTextContent(/sin clasificar/i);
    expect(document.body).toHaveTextContent("$275,000");
  });
});

describe("RenovaCaseDetail — actions", () => {
  beforeEach(() => {
    for (const mock of [getRenovaCaseMock, getRenovaHistoryMock, updateRenovaCaseMock]) mock.mockReset();
    getRenovaHistoryMock.mockResolvedValue({ ok: true, data: history });
  });

  it("offers Editar, Cambiar estado and Ver ficha para compartir", async () => {
    await renderDetail();

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cambiar estado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver ficha para compartir" })).toBeInTheDocument();
  });

  it("Editar opens the SAME popup in edit mode with the real case, and saving refreshes the page data", async () => {
    await renderDetail();
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase({ neighborhood: "Obispado" }) });

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Editando expediente")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { level: 2, name: "María López" })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText("Colonia")).toHaveValue("Centro"));

    fireEvent.change(within(dialog).getByLabelText("Colonia"), { target: { value: "Obispado" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", expect.objectContaining({ neighborhood: "Obispado" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Cambios guardados.")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("Obispado");
    // Once for the page itself, once for the edit popup's own Historial
    // section (also shown there now — see RenovaCaseHistory), once more
    // when the page refetches after the save.
    expect(getRenovaHistoryMock).toHaveBeenCalledTimes(3);
  });

  it("Ver ficha para compartir opens the share card for this case", async () => {
    await renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Ver ficha para compartir" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Ficha para compartir")).toBeInTheDocument();
    expect(await within(dialog).findByTestId("renova-share-card")).toHaveTextContent("RN-9F3A2C");
  });

  it("Cambiar estado updates only the status and confirms it", async () => {
    await renderDetail();
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase({ status: "offer_sent" }) });

    fireEvent.change(screen.getByLabelText("Cambiar estado"), { target: { value: "offer_sent" } });

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { status: "offer_sent" }));
    expect(await screen.findByText("Estado actualizado a “Oferta enviada”.")).toBeInTheDocument();
    expect(screen.getAllByText("Oferta enviada").length).toBeGreaterThan(0);
  });

  it("a failed status change keeps the old status and says why", async () => {
    await renderDetail();
    updateRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 500 } });

    fireEvent.change(screen.getByLabelText("Cambiar estado"), { target: { value: "cancelled" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/algo salió mal/i);
    expect(screen.getByText("En revisión", { selector: "span" })).toBeInTheDocument();
  });

  it("offers no document management (there is no documents backend yet)", async () => {
    await renderDetail();

    expect(screen.queryByRole("button", { name: /gestionar documentos/i })).not.toBeInTheDocument();
  });

  it("Editar propuesta opens the edit popup scrolled to the proposal fields", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Editar propuesta" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute("id", "renova-section-adeudos");
    expect(within(dialog).getByText("Modalidad de la propuesta")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Deuda que cubrirá Renova")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Efectivo para el propietario")).toBeInTheDocument();
  });
});
