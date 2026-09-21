import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import type { RenovaCaseListItem } from "@/features/renova/types";

const getRenovaCasesMock = vi.fn();
const getContactsMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCases: (...args: unknown[]) => getRenovaCasesMock(...args),
  getRenovaCase: vi.fn(),
  createRenovaCase: vi.fn(),
  updateRenovaCase: vi.fn(),
}));
vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
  getContact: (...args: unknown[]) => getContactsMock(...args),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function makeCase(overrides: Partial<RenovaCaseListItem> = {}): RenovaCaseListItem {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-me",
    entry_date: "2026-09-20",
    source: "whatsapp",
    status: "reviewing",
    owner_name: "María López",
    owner_phone: "+52 81 5555 0101",
    dwelling_type: "duplex",
    currency: "MXN",
    final_offer: "950000.00",
    market_value: "1400000.00",
    property_tax_debt: "12000.00",
    other_debt: null,
    water_debt: "800.00",
    electricity_debt: null,
    gas_debt: null,
    owner_expected_amount: "1100000.00",
    total_debt: "12800.00",
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...overrides,
  };
}

describe("RenovaCasesTable", () => {
  beforeEach(() => {
    getRenovaCasesMock.mockReset();
    getContactsMock.mockReset();
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [makeCase()] });
  });

  it("shows a loading state before the cases arrive", () => {
    getRenovaCasesMock.mockReturnValue(new Promise(() => {}));

    render(<RenovaCasesTable />);

    expect(screen.getByText(/cargando expedientes renova/i)).toBeInTheDocument();
  });

  it("renders the real columns for each case", async () => {
    render(<RenovaCasesTable />);

    expect(await screen.findByText("María López")).toBeInTheDocument();
    for (const header of [
      "Propietario",
      "Celular",
      "Vivienda",
      "Asesor",
      "Valor de mercado",
      "Expectativa del propietario",
      "Propuesta final",
      "Adeudos totales",
      "Estado",
      "Fecha",
      "Acciones",
    ]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.getByText("+52 81 5555 0101")).toBeInTheDocument();
    expect(screen.getByText("Dúplex")).toBeInTheDocument();
    // selector: the status filter (a stubbed native select in tests) also has an "En revisión" <option>.
    expect(screen.getByText("En revisión", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Yo" })).toBeInTheDocument();
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

  it("offers Abrir and Editar for each row", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    expect(screen.getByRole("button", { name: /abrir expediente de maría lópez/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar expediente de maría lópez/i })).toBeInTheDocument();
  });

  it("searches on the server by owner name or phone (debounced), sending only the term", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockClear();

    fireEvent.change(screen.getByLabelText(/buscar expedientes renova/i), { target: { value: "lópez" } });

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenCalledWith(expect.objectContaining({ q: "lópez" })));
    expect(getRenovaCasesMock.mock.calls.at(-1)![0]).not.toHaveProperty("organization_id");
  });

  it("filters by status on the server", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "offer_sent" } });

    await waitFor(() => expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "offer_sent" })));
  });

  it("'Mis expedientes' filters by the signed-in user's id", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");

    fireEvent.change(screen.getByLabelText(/filtrar por asesor/i), { target: { value: "mine" } });

    await waitFor(() =>
      expect(getRenovaCasesMock).toHaveBeenLastCalledWith(expect.objectContaining({ assigned_user_id: "user-me" }))
    );
  });

  it("does not show stale rows while a new filter is loading", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockReturnValue(new Promise(() => {}));

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "cancelled" } });

    expect(await screen.findByText(/cargando expedientes renova/i)).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("explains an empty result caused by filters differently from having no cases at all", async () => {
    render(<RenovaCasesTable />);
    await screen.findByText("María López");
    getRenovaCasesMock.mockResolvedValue({ ok: true, data: [] });

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
