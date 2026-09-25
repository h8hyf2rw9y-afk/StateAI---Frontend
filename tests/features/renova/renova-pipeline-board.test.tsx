import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RenovaPipelineBoard } from "@/features/renova/components/renova-pipeline-board";
import { RENOVA_PIPELINE_STAGES, type RenovaPipelineCase, type RenovaPipelineStageStatus } from "@/features/renova/types";

const getRenovaPipelineMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaPipeline: (...args: unknown[]) => getRenovaPipelineMock(...args),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));
vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"));
vi.mock("@/components/ui/dropdown-menu", () => import("@/tests/test-utils/dropdown-menu-stub"));
// The board only needs to prove it opens the dialog with the right case id —
// the dialog's own fetching/rendering/NSS/INE logic is covered by
// tests/features/renova/renova-share-dialog's own suite (there is none to
// duplicate here; renova-case-detail's tests already exercise the real
// component), so it's stubbed to keep this suite about the board itself.
vi.mock("@/features/renova/components/renova-share-dialog", () => ({
  RenovaShareDialog: ({ caseId, onClose }: { caseId: string; onClose: () => void }) => (
    <div role="dialog" data-testid="share-dialog" aria-label={`Ficha de ${caseId}`}>
      {caseId}
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </div>
  ),
}));

function makeCard(overrides: Partial<RenovaPipelineCase> = {}): RenovaPipelineCase {
  return {
    id: "case-1",
    owner_name: "Cliente A",
    owner_phone: "+52 81 5555 0101",
    status: "new",
    assigned_user_id: "user-me",
    dwelling_type: "house",
    is_duplex: false,
    final_offer: null,
    market_value: "900000.00",
    other_debt: null,
    property_tax_debt: null,
    property_tax_debt_unit: "mxn",
    owner_expected_amount: "950000.00",
    updated_at: "2026-09-25T12:00:00Z",
    ...overrides,
  };
}

function makePipeline(byStage: Partial<Record<RenovaPipelineStageStatus, RenovaPipelineCase[]>> = {}) {
  return {
    ok: true as const,
    data: {
      stages: RENOVA_PIPELINE_STAGES.map((status) => ({ status, cases: byStage[status] ?? [] })),
    },
  };
}

async function renderBoard(byStage: Partial<Record<RenovaPipelineStageStatus, RenovaPipelineCase[]>> = {}) {
  getRenovaPipelineMock.mockResolvedValue(makePipeline(byStage));
  render(<RenovaPipelineBoard />);
  await screen.findByTestId("pipeline-column-new");
}

function columnFor(status: RenovaPipelineStageStatus) {
  return within(screen.getByTestId(`pipeline-column-${status}`));
}

function moveMenuItem(caseId: string, label: string) {
  const card = within(screen.getByTestId(`pipeline-card-${caseId}`));
  fireEvent.click(card.getByRole("button", { name: /mover expediente/i }));
  // The dropdown-menu stub renders every card's menu content unconditionally
  // (see tests/test-utils/dropdown-menu-stub.tsx), so the query must stay
  // scoped to THIS card — otherwise two cards both offering "Cancelado" (or
  // any shared stage) collide.
  return card.getByRole("menuitem", { name: label });
}

beforeEach(() => {
  getRenovaPipelineMock.mockReset();
  updateRenovaCaseMock.mockReset();
  pushMock.mockReset();
  updateRenovaCaseMock.mockResolvedValue({ ok: true, data: {} });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RenovaPipelineBoard — columns", () => {
  it("shows the six stages in order", async () => {
    await renderBoard({ new: [makeCard()] });

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(headings).toEqual(["Nuevo", "Preparación de oferta", "Oferta enviada", "Negociando", "Aceptado", "Comprado"]);
  });

  it("purchased is the final column", async () => {
    await renderBoard({ purchased: [makeCard({ id: "p1", status: "purchased" })] });

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(headings[headings.length - 1]).toBe("Comprado");
  });

  it("never renders a Rechazado or Cancelado column", async () => {
    await renderBoard({ new: [makeCard()] });

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    expect(headings).not.toContain("Rechazado");
    expect(headings).not.toContain("Cancelado");
  });

  it("each card renders inside its own stage's column", async () => {
    await renderBoard({
      new: [makeCard({ id: "a", owner_name: "Cliente A" })],
      offer_preparation: [makeCard({ id: "b", owner_name: "Cliente B", status: "offer_preparation" })],
      negotiating: [makeCard({ id: "c", owner_name: "Cliente C", status: "negotiating" })],
    });

    expect(columnFor("new").getByText("Cliente A")).toBeInTheDocument();
    expect(columnFor("offer_preparation").getByText("Cliente B")).toBeInTheDocument();
    expect(columnFor("negotiating").getByText("Cliente C")).toBeInTheDocument();
    expect(columnFor("new").queryByText("Cliente B")).not.toBeInTheDocument();
  });
});

describe("RenovaPipelineBoard — moving a card (via the accessible 'Mover a…' menu)", () => {
  it("PATCHes the correct case with the correct new status", async () => {
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Preparación de oferta"));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { status: "offer_preparation" }));
    expect(columnFor("offer_preparation").getByText("Cliente A")).toBeInTheDocument();
    expect(columnFor("new").queryByText("Cliente A")).not.toBeInTheDocument();
  });

  it("works with no drag and drop involved — a plain click on a menu item moves the card", async () => {
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Negociando"));

    await waitFor(() => expect(columnFor("negotiating").getByText("Cliente A")).toBeInTheDocument());
    expect(updateRenovaCaseMock).toHaveBeenCalledTimes(1);
  });

  it("reverts the card to its previous column and shows an error when the PATCH fails", async () => {
    updateRenovaCaseMock.mockResolvedValue({ ok: false, error: { status: 500 } });
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Preparación de oferta"));

    // Optimistic move happens immediately…
    await waitFor(() => expect(columnFor("offer_preparation").getByText("Cliente A")).toBeInTheDocument());
    // …then reverts once the failed response comes back.
    await waitFor(() => expect(columnFor("new").getByText("Cliente A")).toBeInTheDocument());
    expect(columnFor("offer_preparation").queryByText("Cliente A")).not.toBeInTheDocument();
    expect(screen.getByText(/algo salió mal|no se pudo conectar/i)).toBeInTheDocument();
  });

  it("a normal stage move never asks for confirmation", async () => {
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Oferta enviada"));

    expect(screen.queryByText(/saldrá del pipeline de renova/i)).not.toBeInTheDocument();
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
  });
});

describe("RenovaPipelineBoard — rejecting/cancelling", () => {
  it("asks for confirmation with the exact required text before exiting the pipeline", async () => {
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Rechazado"));

    expect(screen.getByText("Este expediente saldrá del pipeline de Renova, pero conservará su historial.")).toBeInTheDocument();
    // Not applied until confirmed.
    expect(updateRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("removes the card from the board (never deletes it) once confirmed", async () => {
    // A second, untouched card stays on the board so the assertion is about
    // this ONE card leaving — not just the whole board happening to empty out.
    await renderBoard({
      negotiating: [makeCard({ id: "case-1", owner_name: "Cliente A", status: "negotiating" })],
      new: [makeCard({ id: "case-2", owner_name: "Cliente B" })],
    });

    fireEvent.click(moveMenuItem("case-1", "Cancelado"));
    fireEvent.click(screen.getByRole("button", { name: /sí, marcar como cancelado/i }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { status: "cancelled" }));
    for (const stage of RENOVA_PIPELINE_STAGES) {
      expect(columnFor(stage).queryByText("Cliente A")).not.toBeInTheDocument();
    }
    // Never deleted — still a real, findable case, just off this board (see the backend suite for the persisted-status assertion).
    expect(columnFor("new").getByText("Cliente B")).toBeInTheDocument();
  });

  it("keeps the card on the board if the confirmation is dismissed", async () => {
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    fireEvent.click(moveMenuItem("case-1", "Rechazado"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(updateRenovaCaseMock).not.toHaveBeenCalled();
    expect(columnFor("new").getByText("Cliente A")).toBeInTheDocument();
  });
});

describe("RenovaPipelineBoard — opening / sharing the right case", () => {
  it("clicking a card opens the correct case's detail page, not the first one", async () => {
    await renderBoard({
      new: [makeCard({ id: "case-1", owner_name: "Cliente A" }), makeCard({ id: "case-2", owner_name: "Cliente B" })],
    });

    fireEvent.click(screen.getByRole("button", { name: "Abrir expediente de Cliente B" }));

    expect(pushMock).toHaveBeenCalledWith("/leads/renova/case-2");
    expect(pushMock).not.toHaveBeenCalledWith("/leads/renova/case-1");
  });

  it("'Ver ficha' opens the share dialog for the selected case", async () => {
    await renderBoard({
      new: [makeCard({ id: "case-1", owner_name: "Cliente A" }), makeCard({ id: "case-2", owner_name: "Cliente B" })],
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver ficha y compartir de Cliente B" }));

    expect(screen.getByTestId("share-dialog")).toHaveTextContent("case-2");
  });

  it("'Compartir ficha' (the same dialog) uses the selected case's id, not another one on the board", async () => {
    await renderBoard({
      new: [makeCard({ id: "case-1", owner_name: "Cliente A" })],
      negotiating: [makeCard({ id: "case-2", owner_name: "Cliente B", status: "negotiating" })],
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver ficha y compartir de Cliente A" }));

    expect(screen.getByTestId("share-dialog")).toHaveTextContent("case-1");
    expect(screen.getByTestId("share-dialog")).not.toHaveTextContent("case-2");
  });
});

describe("RenovaPipelineBoard — filters view only, never the data", () => {
  it("filtering by advisor hides cards without re-fetching or changing any stored status", async () => {
    await renderBoard({
      new: [makeCard({ id: "case-1", owner_name: "Mío", assigned_user_id: "user-me" }), makeCard({ id: "case-2", owner_name: "De otro", assigned_user_id: "user-other" })],
    });
    expect(getRenovaPipelineMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /^filtros/i }));
    fireEvent.change(screen.getByLabelText("Filtrar por asesor"), { target: { value: "mine" } });

    expect(columnFor("new").getByText("Mío")).toBeInTheDocument();
    expect(columnFor("new").queryByText("De otro")).not.toBeInTheDocument();
    // Purely a view filter: no new request, no status change.
    expect(getRenovaPipelineMock).toHaveBeenCalledTimes(1);
    expect(updateRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("the search box narrows cards by name/phone without touching the API", async () => {
    await renderBoard({
      new: [makeCard({ id: "case-1", owner_name: "Ana Buscada" }), makeCard({ id: "case-2", owner_name: "Beto Distinto" })],
    });

    fireEvent.change(screen.getByLabelText("Buscar en el pipeline Renova"), { target: { value: "Buscada" } });

    expect(columnFor("new").getByText("Ana Buscada")).toBeInTheDocument();
    expect(columnFor("new").queryByText("Beto Distinto")).not.toBeInTheDocument();
    expect(getRenovaPipelineMock).toHaveBeenCalledTimes(1);
  });
});

describe("RenovaPipelineBoard — never exposes protected data", () => {
  it("renders only the whitelisted card fields even if the API response carried extra ones", async () => {
    const contaminated = {
      ...makeCard({ id: "case-1", owner_name: "Cliente A" }),
      nss_masked: "•••••••4455",
      credit_number_masked: "••••••9911",
      has_nss: true,
    } as unknown as RenovaPipelineCase;
    await renderBoard({ new: [contaminated] });

    expect(document.body.innerHTML).not.toContain("4455");
    expect(document.body.innerHTML).not.toContain("9911");
  });
});

describe("RenovaPipelineBoard — narrow viewport", () => {
  it("still renders every column and the non-drag 'Mover a…' control works at a mobile width", async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    await renderBoard({ new: [makeCard({ id: "case-1" })] });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
    fireEvent.click(moveMenuItem("case-1", "Aceptado"));
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledWith("case-1", { status: "accepted" }));

    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: original });
  });
});

describe("RenovaPipelineBoard — empty states", () => {
  it("shows an empty state when the whole pipeline has no cases", async () => {
    getRenovaPipelineMock.mockResolvedValue(makePipeline({}));
    render(<RenovaPipelineBoard />);

    expect(await screen.findByText("Sin expedientes en el pipeline")).toBeInTheDocument();
  });
});
