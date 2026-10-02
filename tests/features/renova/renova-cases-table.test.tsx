import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import type { RenovaCaseListItem } from "@/features/renova/types";

const getRenovaCasesMock = vi.fn();
const getRenovaCaseCountsMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const getContactsMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCaseCounts: (...args: unknown[]) => getRenovaCaseCountsMock(...args),
  getRenovaCase: vi.fn(),
  createRenovaCase: vi.fn(),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
}));
vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
  getContact: (...args: unknown[]) => getContactsMock(...args),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));

function makeCase(overrides: Partial<RenovaCaseListItem> = {}): RenovaCaseListItem {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-me",
    entry_date: "2026-09-20",
    source: "whatsapp",
    status: "reviewing",
    archived: false,
    owner_name: "María López",
    owner_phone: "+52 81 5555 0101",
    street_address: "Av. Constitución 123",
    neighborhood: "Centro",
    municipality: "Monterrey",
    postal_code: "64000",
    dwelling_type: "apartment",
    is_duplex: true,
    currency: "MXN",
    final_offer: "950000.00",
    market_value: "1400000.00",
    property_tax_debt: "12000.00",
    property_tax_debt_unit: "mxn",
    other_debt: null,
    water_debt: "800.00",
    electricity_debt: null,
    gas_debt: null,
    owner_expected_amount: "1100000.00",
    total_debt: "12800.00",
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-21T15:30:00Z",
    ...overrides,
  };
}

const DEFAULT_COUNTS = { active: 1, closed: 0, rejected: 0, cancelled: 0, archived: 0 };

function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: /^filtros/i }));
}

describe("RenovaCasesTable", () => {
  beforeEach(() => {
    getRenovaCasesMock.mockReset();
    getRenovaCaseCountsMock.mockReset();
    updateRenovaCaseMock.mockReset();
    getContactsMock.mockReset();
    pushMock.mockReset();
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase()] });
    getRenovaCaseCountsMock.mockResolvedValue({ ok: true, data: DEFAULT_COUNTS });
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: {} });
  });

  it("shows a loading state before the cases arrive", () => {
    getRenovaCasesMock.mockReturnValue(new Promise(() => {}));

    render(<RenovaCasesTable />);

    expect(screen.getByText(/cargando expedientes renova/i)).toBeInTheDocument();
  });

  it("renders the real columns for each case, including Dirección and Última actualización", async () => {
    render(<RenovaCasesTable />);

    expect(await screen.findByText("María López")).toBeInTheDocument();
    for (const header of [
      "Propietario",
      "Celular",
      "Dirección",
      "Vivienda",
      "Asesor",
      "Valor de mercado",
      "Expectativa del propietario",
      "Propuesta final",
      "Adeudos totales",
      "Estado",
      "Fecha de ingreso",
      "Última actualización",
      "Acciones",
    ]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.getByText("+52 81 5555 0101")).toBeInTheDocument();
    expect(screen.getByText("Av. Constitución 123")).toBeInTheDocument();
    expect(screen.getByText("Departamento dúplex")).toBeInTheDocument();
    // selector: the status filter (a stubbed native select in tests) also has an "En revisión" <option>.
    expect(screen.getByText("En revisión", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Yo" })).toBeInTheDocument();
  });

  it("shows a dash for a case with no street address on file", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase({ street_address: null })] });
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    const row = screen.getByText("María López").closest("tr")!;
    expect(row).toHaveTextContent("—");
  });

  it("formats money in MXN and the debt total comes from the backend", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    const row = screen.getByText("María López").closest("tr")!;
    expect(row).toHaveTextContent("$1,400,000"); // market value
    expect(row).toHaveTextContent("$1,100,000"); // owner expectation
    expect(row).toHaveTextContent("$950,000"); // final offer
    expect(row).toHaveTextContent("$12,800"); // total debt
  });

  it("shows a dash — never a fabricated $0 — for amounts not captured yet", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ final_offer: null, market_value: null, owner_expected_amount: null, total_debt: null })],
    });

    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    const row = screen.getByText("María López").closest("tr")!;
    expect(row).not.toHaveTextContent("$0");
    expect(row.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("labels another advisor generically instead of inventing a name", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase({ assigned_user_id: "someone-else" })] });

    render(<RenovaCasesTable />);

    expect(await screen.findByText("Otro asesor")).toBeInTheDocument();
  });

  it("never shows NSS or número de crédito — they are not even in the list data", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    expect(screen.queryByText(/nss/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/número de crédito/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/••••/)).not.toBeInTheDocument();
    expect(Object.keys(makeCase())).not.toContain("nss_masked");
  });

  it("shows a specific empty state when there are no cases yet", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });

    render(<RenovaCasesTable />);

    expect(await screen.findByText("Aún no hay expedientes Renova")).toBeInTheDocument();
    expect(screen.getByText(/nuevo prospecto renova/i)).toBeInTheDocument();
  });

  it("shows a friendly Spanish error on failure", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });

    render(<RenovaCasesTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/algo salió mal/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<RenovaCasesTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/tu sesión expiró/i);
  });

  it("offers a share action with no separate Editar or Abrir action, and no archive action on an active case", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    expect(screen.queryByRole("link", { name: /abrir expediente de maría lópez/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver ficha y compartir de maría lópez/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar expediente de maría lópez/i })).not.toBeInTheDocument();
    // Archiving only makes sense once a case is closed (Rechazados y cancelados) — see the "buckets" describe below.
    expect(screen.queryByRole("button", { name: /archivar expediente de maría lópez/i })).not.toBeInTheDocument();
  });

  it("opens the editable popup through the parent when a row is clicked", async () => {
    const onEdit = vi.fn();
    render(<RenovaCasesTable onEdit={onEdit} />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByText("María López"));

    expect(onEdit).toHaveBeenCalledWith("case-1");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("opens and shares the selected client's case, even when it is not the first row", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase(), makeCase({ id: "case-2", owner_name: "Luis García" })] });
    const onShare = vi.fn();
    const onEdit = vi.fn();
    render(<RenovaCasesTable onShare={onShare} onEdit={onEdit} />);
    await screen.findByText("Luis García");

    fireEvent.click(screen.getByRole("button", { name: /ver ficha y compartir de luis garcía/i }));
    expect(onShare).toHaveBeenCalledWith("case-2");
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Luis García"));
    expect(onEdit).toHaveBeenCalledWith("case-2");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("supports opening the editable popup from the row with the keyboard", async () => {
    const onEdit = vi.fn();
    render(<RenovaCasesTable onEdit={onEdit} />);
    await screen.findByText("María López");

    fireEvent.keyDown(screen.getByText("María López").closest("tr")!, { key: "Enter" });

    expect(onEdit).toHaveBeenCalledWith("case-1");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("keeps search visible and puts the status / advisor filters behind a Filtros button", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    expect(screen.getByLabelText(/buscar expedientes renova/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/filtrar por estado/i)).not.toBeInTheDocument();
    openFilters();
    expect(screen.getByLabelText(/filtrar por estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por asesor/i)).toBeInTheDocument();
  });

  it("offers the new draft status as a filter and shows the count of active filters", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    openFilters();

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "draft" } });

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "draft" })));
    expect(screen.getByRole("button", { name: "Filtros (1 activos)" })).toBeInTheDocument();
  });

  it("searches on the server by owner name or phone (debounced), sending only the term", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockClear();

    fireEvent.change(screen.getByLabelText(/buscar expedientes renova/i), { target: { value: "lópez" } });

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalledWith(expect.objectContaining({ q: "lópez" })));
    expect(getRenovaCasesMock.mock.calls.at(-1)![0]).not.toHaveProperty("organization_id");
  });

  it("filters by status on the server, composed with the active bucket", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    openFilters();
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "offer_sent" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "offer_sent", bucket: "active" }))
    );
  });

  it("'Mis expedientes' filters by the signed-in user's id", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    openFilters();
    fireEvent.change(screen.getByLabelText(/filtrar por asesor/i), { target: { value: "mine" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ assigned_user_id: "user-me" }))
    );
  });

  it("does not show stale rows while a new filter is loading", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockReturnValue(new Promise(() => {}));

    openFilters();
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "cancelled" } });

    expect(await screen.findByText(/cargando expedientes renova/i)).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("explains an empty result caused by filters differently from having no cases at all", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });

    openFilters();
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "cancelled" } });

    expect(await screen.findByText("Ningún expediente coincide con los filtros")).toBeInTheDocument();
  });

  it("reloads when its refresh key changes (after a case is created)", async () => {
    const { rerender } = render(<RenovaCasesTable refreshKey={0} />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockClear();

    rerender(<RenovaCasesTable refreshKey={1} />);

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
  });

  it("never calls the Contacts API", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    fireEvent.change(screen.getByLabelText(/buscar expedientes renova/i), { target: { value: "x" } });
    await waitFor(() => expect(getRenovaCasesMock.mock.calls.length).toBeGreaterThan(1));

    expect(getContactsMock).not.toHaveBeenCalled();
  });
});

describe("RenovaCasesTable — the three buckets (Activos / Rechazados y cancelados / Archivados)", () => {
  beforeEach(() => {
    getRenovaCasesMock.mockReset();
    getRenovaCaseCountsMock.mockReset();
    updateRenovaCaseMock.mockReset();
    getContactsMock.mockReset();
    pushMock.mockReset();
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: {} });
    getRenovaCaseCountsMock.mockResolvedValue({
      ok: true,
      data: { active: 1, closed: 2, rejected: 1, cancelled: 1, archived: 1 },
    });
  });

  it("defaults to 'Activos' and requests bucket=active, then switches to the other two on click", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase()] });
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: "active" }));

    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: "closed" })));

    fireEvent.click(screen.getByRole("radio", { name: "Archivados" }));
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ bucket: "archived" })));
  });

  it("shows the closed/rejected/cancelled counters only in 'Rechazados y cancelados'", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    expect(screen.queryByText(/total de cerrados/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));

    const counters = await screen.findByText(/total de cerrados/i);
    expect(counters).toHaveTextContent("Total de cerrados: 2");
    expect(counters).toHaveTextContent("Rechazados: 1");
    expect(counters).toHaveTextContent("Cancelados: 1");
  });

  it("in 'Rechazados y cancelados', a row offers Compartir, Archivar and Reactivar", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ owner_name: "Rechazado Uno", status: "rejected" })],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await screen.findByText("Rechazado Uno");

    expect(screen.getByRole("button", { name: /ver ficha y compartir de rechazado uno/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivar expediente de Rechazado Uno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivar expediente de Rechazado Uno" })).toBeInTheDocument();
  });

  it("archiving from 'Rechazados y cancelados' only sends archived=true (no status change bundled in) and refreshes", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "case-1", owner_name: "Rechazado Uno", status: "rejected" })],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await screen.findByText("Rechazado Uno");
    const callsBefore = getRenovaCasesMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Archivar expediente de Rechazado Uno" }));
    expect(await screen.findByText(/se moverá a Archivados/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^archivar$/i }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { archived: true }));
    await waitFor(() => expect(getRenovaCasesMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("reactivating asks for confirmation naming the target stage, then PATCHes status only", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "case-1", owner_name: "Rechazado Uno", status: "cancelled" })],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await screen.findByText("Rechazado Uno");

    fireEvent.click(screen.getByRole("button", { name: "Reactivar expediente de Rechazado Uno" }));
    expect(await screen.findByText(/regresará a la etapa “Nuevo”/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reactivar" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { status: "new" }));
  });

  it("in 'Archivados', a row offers only Restaurar (no Compartir, no Archivar)", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "case-1", owner_name: "Archivado Uno", status: "rejected", archived: true })],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Archivados" }));
    await screen.findByText("Archivado Uno");

    expect(screen.queryByRole("button", { name: /ver ficha y compartir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archivar expediente de Archivado Uno" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restaurar expediente de Archivado Uno" })).toBeInTheDocument();
  });

  it("restoring asks for confirmation naming the preserved status, then PATCHes only archived=false", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "case-1", owner_name: "Archivado Uno", status: "rejected", archived: true })],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Archivados" }));
    await screen.findByText("Archivado Uno");

    fireEvent.click(screen.getByRole("button", { name: "Restaurar expediente de Archivado Uno" }));
    expect(await screen.findByText(/conservando su estado actual \(“Rechazado”\)/i)).toBeInTheDocument();
    expect(screen.getByText(/no se activará automáticamente/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { archived: false }));
  });

  it("shows a dedicated empty state for 'Rechazados y cancelados' and for 'Archivados'", async () => {
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    expect(await screen.findByText("No hay expedientes rechazados o cancelados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Archivados" }));
    expect(await screen.findByText("No hay expedientes archivados")).toBeInTheDocument();
  });

  it("shows an error and does not crash when archiving fails", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "case-1", owner_name: "Rechazado Uno", status: "rejected" })],
    });
    updateRenovaCaseMock.mockResolvedValue({ ok: false, error: { status: 500 } });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await screen.findByText("Rechazado Uno");

    fireEvent.click(screen.getByRole("button", { name: "Archivar expediente de Rechazado Uno" }));
    fireEvent.click(await screen.findByRole("button", { name: /^archivar$/i }));

    expect(await screen.findByText(/algo salió mal|no se pudo conectar/i)).toBeInTheDocument();
    expect(screen.getByText("Rechazado Uno")).toBeInTheDocument();
  });
});
