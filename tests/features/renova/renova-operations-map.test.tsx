import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaOperationsMap } from "@/features/renova/components/renova-operations-map";
import type { RenovaOperationCase, RenovaOperationsResponse } from "@/features/renova/types";
import { RENOVA_OPERATION_STAGES } from "@/features/renova/types";

const getRenovaOperationsMock = vi.fn();
const updateRenovaOperationMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaOperations: (...args: unknown[]) => getRenovaOperationsMock(...args),
  updateRenovaOperation: (...args: unknown[]) => updateRenovaOperationMock(...args),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function operation(overrides: Partial<RenovaOperationCase> = {}): RenovaOperationCase {
  return {
    id: "operation-1",
    owner_name: "Ana Salazar",
    owner_phone: "+52 81 5555 0101",
    status: "accepted",
    assigned_user_id: "user-me",
    street_address: "Cardo 2010",
    neighborhood: "Privadas Reales",
    municipality: "Salinas Victoria",
    currency: "MXN",
    proposal_type: "debt_plus_cash",
    debt_coverage_amount: "320000.00",
    owner_cash_offer: "120000.00",
    final_offer: "440000.00",
    operation_stage: "notary_contract",
    operation_next_action: "Firmar carta poder",
    operation_due_at: "2026-10-09T22:00:00Z",
    operation_stage_updated_at: "2026-10-06T12:00:00Z",
    updated_at: "2026-10-06T12:00:00Z",
    ...overrides,
  };
}

function responseWith(...cases: RenovaOperationCase[]): RenovaOperationsResponse {
  return {
    stages: RENOVA_OPERATION_STAGES.map((stage) => ({
      stage,
      cases: cases.filter((item) => item.operation_stage === stage),
    })),
  };
}

describe("RenovaOperationsMap", () => {
  beforeEach(() => {
    getRenovaOperationsMock.mockReset();
    updateRenovaOperationMock.mockReset();
    getRenovaOperationsMock.mockResolvedValue({ ok: true, data: responseWith(operation()) });
  });

  it("shows the full post-acceptance route and groups each property in its current stage", async () => {
    render(<RenovaOperationsMap />);

    expect(await screen.findByText("Ana Salazar")).toBeInTheDocument();
    for (const label of [
      "Propuesta aceptada",
      "Levantamiento",
      "Notaría y contrato",
      "Remodelación",
      "En venta",
      "Firma comprador",
      "Liquidar propietario",
      "Cerrada",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/firmar carta poder/i)).toBeInTheDocument();
    expect(screen.getByText("$440,000")).toBeInTheDocument();
  });

  it("opens the route drawer and saves an editable stage, next action and date", async () => {
    const updated = operation({
      status: "purchased",
      operation_stage: "renovation",
      operation_next_action: "Aprobar presupuesto de cocina",
      operation_due_at: "2026-10-12T18:00:00Z",
    });
    updateRenovaOperationMock.mockResolvedValue({ ok: true, data: updated });
    render(<RenovaOperationsMap />);
    await screen.findByText("Ana Salazar");

    fireEvent.click(screen.getByRole("button", { name: /ver ruta/i }));
    const stage = screen.getByLabelText("Etapa de la operación");
    fireEvent.change(stage, { target: { value: "renovation" } });
    fireEvent.change(screen.getByLabelText("Siguiente paso"), { target: { value: "Aprobar presupuesto de cocina" } });
    fireEvent.change(screen.getByLabelText("Fecha y hora"), { target: { value: "2026-10-12T12:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar avance" }));

    await waitFor(() => expect(updateRenovaOperationMock).toHaveBeenCalledTimes(1));
    expect(updateRenovaOperationMock).toHaveBeenCalledWith(
      "operation-1",
      expect.objectContaining({
        operation_stage: "renovation",
        operation_next_action: "Aprobar presupuesto de cocina",
      })
    );
    expect((await screen.findAllByText("Remodelación")).length).toBeGreaterThan(0);
  });

  it("opens the selected expediente and share card through explicit actions", async () => {
    const onOpen = vi.fn();
    const onShare = vi.fn();
    render(<RenovaOperationsMap onOpen={onOpen} onShare={onShare} />);
    await screen.findByText("Ana Salazar");

    fireEvent.click(screen.getByRole("button", { name: "Abrir expediente de Ana Salazar" }));
    fireEvent.click(screen.getByRole("button", { name: "Compartir ficha de Ana Salazar" }));

    expect(onOpen).toHaveBeenCalledWith("operation-1");
    expect(onShare).toHaveBeenCalledWith("operation-1");
  });

  it("does not mix rejected, cancelled or archived records into operations", async () => {
    getRenovaOperationsMock.mockResolvedValue({ ok: true, data: responseWith() });
    render(<RenovaOperationsMap />);

    expect(await screen.findByText(/aún no hay propiedades en operación/i)).toBeInTheDocument();
    expect(screen.getByText(/cuando una propuesta pase a aceptado/i)).toBeInTheDocument();
  });
});
