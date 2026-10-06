import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import type { RenovaCaseListItem } from "@/features/renova/types";

const getRenovaCasesMock = vi.fn();
const getRenovaCaseCountsMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const getRenovaFollowUpMock = vi.fn();
const createRenovaFollowUpActivityMock = vi.fn();
const updateRenovaFollowUpActivityMock = vi.fn();
const getContactsMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCaseCounts: (...args: unknown[]) => getRenovaCaseCountsMock(...args),
  getRenovaCase: vi.fn(),
  createRenovaCase: vi.fn(),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
  getRenovaFollowUp: (...args: unknown[]) => getRenovaFollowUpMock(...args),
  createRenovaFollowUpActivity: (...args: unknown[]) => createRenovaFollowUpActivityMock(...args),
  updateRenovaFollowUpActivity: (...args: unknown[]) => updateRenovaFollowUpActivityMock(...args),
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
    proposal_type: null,
    debt_coverage_amount: null,
    owner_cash_offer: null,
    total_proposal_value: null,
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
    follow_up: {
      last_call_activity_id: null,
      last_call_at: null,
      last_result: null,
      contact_attempt_count: 0,
      next_follow_up_at: null,
      is_follow_up_overdue: false,
      contact_state: "never_contacted",
      note_preview: null,
    },
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
    getRenovaFollowUpMock.mockReset();
    createRenovaFollowUpActivityMock.mockReset();
    updateRenovaFollowUpActivityMock.mockReset();
    getContactsMock.mockReset();
    pushMock.mockReset();
    window.localStorage.clear();
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase()] });
    getRenovaCaseCountsMock.mockResolvedValue({ ok: true, data: DEFAULT_COUNTS });
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: {} });
    getRenovaFollowUpMock.mockResolvedValue({
      ok: true,
      data: { summary: makeCase().follow_up, activities: [] },
    });
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
      "Seguimiento",
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

  it("hides a column from the Columnas menu and brings it back", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /^columnas/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Valor de mercado" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Asesor" }));

    expect(screen.queryByRole("columnheader", { name: "Valor de mercado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Asesor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Yo" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Celular" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columnas (2 ocultas)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Asesor" }));
    expect(screen.getByRole("columnheader", { name: "Asesor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar todas" }));
    expect(screen.getByRole("columnheader", { name: "Valor de mercado" })).toBeInTheDocument();
  });

  it("never offers to hide Propietario or Acciones", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /^columnas/i }));

    expect(screen.queryByRole("checkbox", { name: "Propietario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Acciones" })).not.toBeInTheDocument();
  });

  it("remembers hidden columns across visits and ignores unknown stored ids", async () => {
    window.localStorage.setItem("renova-cases-table:hidden-columns", JSON.stringify(["market_value", "gone"]));
    const { unmount } = render(<RenovaCasesTable />);
    await screen.findByText("María López");
    expect(screen.queryByRole("columnheader", { name: "Valor de mercado" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columnas (1 oculta)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^columnas/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Asesor" }));
    unmount();

    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    expect(screen.queryByRole("columnheader", { name: "Asesor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Valor de mercado" })).not.toBeInTheDocument();
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

  it("opens the explicit follow-up preview without opening the full case", async () => {
    const onEdit = vi.fn();
    render(<RenovaCasesTable onEdit={onEdit} />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /seguimiento de maría lópez: nunca contactado/i }));

    await waitFor(() => expect(getRenovaFollowUpMock).toHaveBeenCalledWith("case-1"));
    expect(screen.getByText("Última llamada")).toBeInTheDocument();
    expect(screen.getByText(/no aparece en la ficha compartida/i)).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("registers a call with an editable result, date, attempt number and notes", async () => {
    const savedSummary = {
      ...makeCase().follow_up,
      last_call_activity_id: "activity-1",
      last_call_at: "2026-10-05T14:00:00Z",
      last_result: "no_answer" as const,
      contact_attempt_count: 3,
      contact_state: "attempted_no_answer" as const,
      note_preview: "No respondió; intentar por la tarde.",
    };
    createRenovaFollowUpActivityMock.mockResolvedValue({ ok: true, data: { summary: savedSummary, activities: [] } });
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /seguimiento de maría lópez/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Registrar llamada" }));
    fireEvent.change(await screen.findByLabelText("Resultado"), { target: { value: "no_answer" } });
    fireEvent.change(screen.getByLabelText("Número de intento"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "No respondió; intentar por la tarde." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(createRenovaFollowUpActivityMock).toHaveBeenCalledWith(
        "case-1",
        expect.objectContaining({
          activity_type: "call",
          result: "no_answer",
          attempt_number: 3,
          notes: "No respondió; intentar por la tarde.",
        })
      )
    );
    expect(await screen.findByRole("button", { name: /seguimiento de maría lópez: no contestó/i })).toBeInTheDocument();
  });

  it("lets the user correct the latest call instead of creating a duplicate", async () => {
    const summary = {
      ...makeCase().follow_up,
      last_call_activity_id: "activity-1",
      last_call_at: "2026-10-05T14:00:00Z",
      last_result: "no_answer" as const,
      contact_attempt_count: 2,
      contact_state: "attempted_no_answer" as const,
    };
    const activity = {
      id: "activity-1",
      renova_case_id: "case-1",
      actor_user_id: "user-me",
      activity_type: "call" as const,
      result: "no_answer" as const,
      occurred_at: "2026-10-05T14:00:00Z",
      next_follow_up_at: null,
      attempt_number: 2,
      notes: "No contestó.",
      created_at: "2026-10-05T14:01:00Z",
      updated_at: "2026-10-05T14:01:00Z",
    };
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase({ follow_up: summary })] });
    getRenovaFollowUpMock.mockResolvedValue({ ok: true, data: { summary, activities: [activity] } });
    updateRenovaFollowUpActivityMock.mockResolvedValue({
      ok: true,
      data: { summary: { ...summary, last_result: "interested", contact_state: "contacted_interested" }, activities: [{ ...activity, result: "interested" }] },
    });
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /seguimiento de maría lópez/i }));
    fireEvent.click(await screen.findByRole("button", { name: /editar última llamada/i }));
    fireEvent.change(await screen.findByLabelText("Resultado"), { target: { value: "interested" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(updateRenovaFollowUpActivityMock).toHaveBeenCalledWith(
        "case-1",
        "activity-1",
        expect.objectContaining({ result: "interested", attempt_number: 2 })
      )
    );
    expect(createRenovaFollowUpActivityMock).not.toHaveBeenCalled();
  });

  it("schedules a next call from the same compact preview", async () => {
    const scheduledSummary = {
      ...makeCase().follow_up,
      next_follow_up_at: "2026-10-08T16:30:00Z",
    };
    createRenovaFollowUpActivityMock.mockResolvedValue({
      ok: true,
      data: { summary: scheduledSummary, activities: [] },
    });
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: /seguimiento de maría lópez/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Agendar" }));
    fireEvent.change(screen.getByLabelText("Fecha de la próxima llamada"), { target: { value: "2026-10-08T16:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(createRenovaFollowUpActivityMock).toHaveBeenCalledWith(
        "case-1",
        expect.objectContaining({
          activity_type: "follow_up",
          next_follow_up_at: expect.any(String),
        })
      )
    );
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

function ownerNamesInOrder(): string[] {
  // Data rows carry role="button" (see RenovaCasesTable), not the implicit
  // "row" role, so they're read straight off the table body instead.
  return Array.from(document.querySelectorAll("tbody tr")).map((row) => row.querySelector("td")!.textContent);
}

describe("RenovaCasesTable — grouped by status (ordering now owned by the backend)", () => {
  beforeEach(() => {
    getRenovaCasesMock.mockReset();
    getRenovaCaseCountsMock.mockReset();
    updateRenovaCaseMock.mockReset();
    getContactsMock.mockReset();
    pushMock.mockReset();
    getRenovaCaseCountsMock.mockResolvedValue({ ok: true, data: { active: 0, closed: 0, rejected: 0, cancelled: 0, archived: 0 } });
  });

  it("renders rows in exactly the order the API returns them, with no client-side re-sort", async () => {
    // RenovaCaseRepository.list() already groups by status_rank, then
    // created_at DESC, then id ASC -- this is what a real response looks
    // like: "new" cases together, ahead of "negotiating", regardless of
    // entry_date. The table must render this as-is.
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "1", owner_name: "Carlos", status: "new", entry_date: "2026-09-23" }),
        makeCase({ id: "2", owner_name: "Beatriz", status: "new", entry_date: "2026-09-25" }),
        makeCase({ id: "3", owner_name: "Raúl", status: "negotiating", entry_date: "2026-09-24" }),
        makeCase({ id: "4", owner_name: "Martha", status: "negotiating", entry_date: "2026-09-22" }),
      ],
    });
    render(<RenovaCasesTable />);
    await screen.findByText("Carlos");

    expect(ownerNamesInOrder()).toEqual(["Carlos", "Beatriz", "Raúl", "Martha"]);
  });

  it("does not reorder a pipeline-order response into alphabetical order", async () => {
    // Alphabetically "Andrea" < "Raúl", but the backend (negotiating before
    // accepted in the real flow) sent Raúl first -- the table must not
    // second-guess that.
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "2", owner_name: "Raúl", status: "negotiating" }),
        makeCase({ id: "1", owner_name: "Andrea", status: "accepted" }),
      ],
    });
    render(<RenovaCasesTable />);
    await screen.findByText("Andrea");

    expect(ownerNamesInOrder()).toEqual(["Raúl", "Andrea"]);
  });

  it("moves a lead to its new status group immediately after a refetch — no manual reload needed", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "1", owner_name: "Raúl", status: "negotiating" }),
        makeCase({ id: "2", owner_name: "Martha", status: "negotiating" }),
        makeCase({ id: "3", owner_name: "Andrea", status: "accepted" }),
      ],
    });
    const { rerender } = render(<RenovaCasesTable refreshKey={0} />);
    await screen.findByText("Raúl");
    expect(ownerNamesInOrder()).toEqual(["Raúl", "Martha", "Andrea"]);

    // Martha: Negociando -> Aceptado (the same refetch-after-save mechanism
    // the dialog already triggers via `refreshKey`, reused here).
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "1", owner_name: "Raúl", status: "negotiating" }),
        makeCase({ id: "3", owner_name: "Andrea", status: "accepted" }),
        makeCase({ id: "2", owner_name: "Martha", status: "accepted" }),
      ],
    });
    rerender(<RenovaCasesTable refreshKey={1} />);

    await waitFor(() => expect(ownerNamesInOrder()).toEqual(["Raúl", "Andrea", "Martha"]));

    // And back the other way, to confirm this is genuinely dynamic.
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "2", owner_name: "Martha", status: "negotiating" }),
        makeCase({ id: "1", owner_name: "Raúl", status: "negotiating" }),
        makeCase({ id: "3", owner_name: "Andrea", status: "accepted" }),
      ],
    });
    rerender(<RenovaCasesTable refreshKey={2} />);

    await waitFor(() => expect(ownerNamesInOrder()).toEqual(["Martha", "Raúl", "Andrea"]));
  });

  it("status filter still narrows the grouped table to one status", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [makeCase({ id: "1", owner_name: "Raúl", status: "negotiating" })],
    });
    render(<RenovaCasesTable />);
    await screen.findByText("Raúl");

    openFilters();
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "negotiating" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "negotiating" }))
    );
    expect(screen.getByText("Raúl")).toBeInTheDocument();
  });

  it("search still works on the grouped table", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "1", owner_name: "Raúl", status: "negotiating" }),
        makeCase({ id: "2", owner_name: "Martha", status: "negotiating" }),
      ],
    });
    render(<RenovaCasesTable />);
    await screen.findByText("Raúl");
    getRenovaCasesMock.mockClear();

    fireEvent.change(screen.getByLabelText(/buscar expedientes renova/i), { target: { value: "martha" } });

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalledWith(expect.objectContaining({ q: "martha" })));
  });

  it("within 'Rechazados y cancelados', renders Rechazado before Cancelado exactly as the backend sent them", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "2", owner_name: "Rechazado Uno", status: "rejected" }),
        makeCase({ id: "1", owner_name: "Cancelado Uno", status: "cancelled" }),
      ],
    });
    render(<RenovaCasesTable />);
    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("radio", { name: "Rechazados y cancelados" }));
    await screen.findByText("Rechazado Uno");

    expect(ownerNamesInOrder()).toEqual(["Rechazado Uno", "Cancelado Uno"]);
  });

  it("editing, sharing and archiving still target the right row regardless of status order", async () => {
    getRenovaCasesMock.mockResolvedValue({
      ok: true,
      data: [
        makeCase({ id: "2", owner_name: "Raúl", status: "new" }),
        makeCase({ id: "1", owner_name: "Carlos", status: "accepted" }),
      ],
    });
    const onShare = vi.fn();
    const onEdit = vi.fn();
    render(<RenovaCasesTable onShare={onShare} onEdit={onEdit} />);
    await screen.findByText("Carlos");
    expect(ownerNamesInOrder()).toEqual(["Raúl", "Carlos"]);

    fireEvent.click(screen.getByRole("button", { name: /ver ficha y compartir de carlos/i }));
    expect(onShare).toHaveBeenCalledWith("1");

    fireEvent.click(screen.getByText("Raúl"));
    expect(onEdit).toHaveBeenCalledWith("2");
  });
});
