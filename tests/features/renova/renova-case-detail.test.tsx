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
    expect(screen.getByText(/RN-9F3A2C · Yo · Ingreso/)).toBeInTheDocument();
  });

  it("shows address, property, financial, motivation and owner data in Spanish", async () => {
    await renderDetail();
    const page = document.body;

    for (const text of [
      "Av. Constitución 123",
      "Centro",
      "Monterrey",
      "64000",
      "Dúplex",
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
    for (const heading of ["Propietario", "Ubicación e inmueble", "Información financiera", "Motivación y comentarios", "Historial"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it("formats every amount in MXN including the derived debt total", async () => {
    await renderDetail();

    for (const amount of ["$950,000", "$1,400,000", "$1,100,000", "$12,000", "$13,250"]) {
      expect(document.body).toHaveTextContent(amount);
    }
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
    expect(within(dialog).getByText("Editar prospecto Renova")).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText("Colonia")).toHaveValue("Centro"));

    fireEvent.change(within(dialog).getByLabelText("Colonia"), { target: { value: "Obispado" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", expect.objectContaining({ neighborhood: "Obispado" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Cambios guardados.")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("Obispado");
    expect(getRenovaHistoryMock).toHaveBeenCalledTimes(2);
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
});
