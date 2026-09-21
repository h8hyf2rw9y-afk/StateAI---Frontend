import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RenovaCaseForm } from "@/features/renova/components/renova-case-form";
import type { RenovaCase } from "@/features/renova/types";

const createRenovaCaseMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const getRenovaCaseMock = vi.fn();
const getContactsMock = vi.fn();
const createContactMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  createRenovaCase: (...args: unknown[]) => createRenovaCaseMock(...args),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
  getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args),
  getRenovaCases: vi.fn(),
}));
vi.mock("@/lib/api/contacts", () => ({
  getContacts: (...args: unknown[]) => getContactsMock(...args),
  createContact: (...args: unknown[]) => createContactMock(...args),
}));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-me" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function makeCase(overrides: Partial<RenovaCase> = {}): RenovaCase {
  return {
    id: "case-1",
    organization_id: "org-1",
    assigned_user_id: "user-me",
    created_by_user_id: "user-me",
    entry_date: "2026-09-20",
    source: "whatsapp",
    status: "reviewing",
    owner_name: "María López",
    owner_phone: "+52 81 5555 0101",
    marital_status: "married_conjugal_partnership",
    spouse_name: "Juan Pérez",
    spouse_phone: null,
    dwelling_type: "duplex",
    floors: 2,
    bathrooms: "2.5",
    bedrooms: 3,
    conditions: "Requiere pintura",
    has_deeds: "yes",
    deeds_holder_name: "María López",
    currency: "MXN",
    final_offer: "950000.00",
    market_value: "1400000.00",
    property_tax_debt: "12000.00",
    other_debt: null,
    water_debt: "800.00",
    electricity_debt: null,
    gas_debt: null,
    debt_owed_to: "Infonavit",
    owner_expected_amount: "1100000.00",
    total_debt: "12800.00",
    sale_reason: "Se muda",
    key_questions: null,
    general_situation: null,
    notes: "notas originales",
    nss_masked: "••••4455",
    credit_number_masked: "••••9081",
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...overrides,
  };
}

function renderCreate(onSaved = vi.fn()) {
  render(<RenovaCaseForm onSaved={onSaved} trigger={<button>Nuevo prospecto Renova</button>} />);
  fireEvent.click(screen.getByRole("button", { name: "Nuevo prospecto Renova" }));
  return onSaved;
}

function goToStep(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function fillRequired() {
  goToStep(/2\. propietario/i);
  fireEvent.change(screen.getByLabelText(/nombre del titular/i), { target: { value: "María López" } });
  fireEvent.change(screen.getByLabelText(/^celular \*/i), { target: { value: "+52 81 5555 0101" } });
}

describe("RenovaCaseForm — create", () => {
  beforeEach(() => {
    createRenovaCaseMock.mockReset();
    updateRenovaCaseMock.mockReset();
    getRenovaCaseMock.mockReset();
    getContactsMock.mockReset();
    createContactMock.mockReset();
    createRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase() });
  });

  it("opens on the first section and offers the five sections", async () => {
    renderCreate();

    expect(await screen.findByRole("dialog")).toHaveTextContent("Nuevo prospecto Renova");
    for (const label of ["1. Registro", "2. Propietario", "3. Inmueble", "4. Finanzas", "5. Motivación y evaluación"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "1. Registro" })).toHaveAttribute("aria-current", "step");
    // Only this section's fields are on screen (a phone never shows everything at once).
    expect(screen.getByLabelText(/fecha de ingreso/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre del titular/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/valor de mercado/i)).not.toBeInTheDocument();
  });

  it("defaults the advisor to the signed-in user and the source to WhatsApp", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByLabelText("Asesor responsable")).toHaveValue("user-me");
    expect(screen.getByLabelText("Fuente")).toHaveValue("whatsapp");
  });

  it("creates a case with only the four mandatory fields — everything else can be added later", async () => {
    const onSaved = renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalledTimes(1));
    const payload = createRenovaCaseMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      assigned_user_id: "user-me",
      owner_name: "María López",
      owner_phone: "+52 81 5555 0101",
      source: "whatsapp",
      status: "new",
      has_deeds: "unknown",
    });
    // Nothing that wasn't filled is sent, and there's no organization id or sensitive field.
    for (const absent of ["organization_id", "nss", "credit_number", "final_offer", "market_value", "spouse_name"]) {
      expect(payload).not.toHaveProperty(absent);
    }
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("never touches the Contacts API when creating a Renova case", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());

    expect(getContactsMock).not.toHaveBeenCalled();
    expect(createContactMock).not.toHaveBeenCalled();
  });

  it("'Guardar' is available from any section, not only the last", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "Guardar prospecto" })).toBeEnabled();
    fillRequired();
    goToStep("1. Registro");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
  });

  it("Siguiente / Anterior move between sections", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("button", { name: "2. Propietario" })).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByRole("button", { name: "1. Registro" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("blocks saving without the mandatory fields, jumps to the first section with a problem, and says why in Spanish", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(createRenovaCaseMock).not.toHaveBeenCalled();
    expect(await screen.findByText("El nombre del titular es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El celular es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Revisa los campos marcados antes de guardar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2. Propietario" })).toHaveAttribute("aria-current", "step");
  });

  it("rejects a negative amount, returns to the Finanzas section and never calls the API", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    goToStep("4. Finanzas");
    fireEvent.change(screen.getByLabelText(/valor de mercado/i), { target: { value: "-5" } });
    goToStep("1. Registro");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText("El monto no puede ser negativo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4. Finanzas" })).toHaveAttribute("aria-current", "step");
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("rejects negative floors, bathrooms and bedrooms", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    goToStep("3. Inmueble");
    fireEvent.change(screen.getByLabelText(/número de plantas/i), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText(/número de baños/i), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText(/número de recámaras/i), { target: { value: "-1" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(screen.getAllByText(/no puede ser negativo/i)).toHaveLength(3));
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("shows the running debt total in MXN as the debts are typed (predial + otros + agua + luz + gas)", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    goToStep("4. Finanzas");
    expect(screen.getByTestId("debt-total")).toHaveTextContent("—");

    fireEvent.change(screen.getByLabelText(/deuda predial/i), { target: { value: "12000" } });
    fireEvent.change(screen.getByLabelText(/otros adeudos/i), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText(/deuda de agua/i), { target: { value: "800" } });
    fireEvent.change(screen.getByLabelText(/deuda de luz/i), { target: { value: "450" } });
    fireEvent.change(screen.getByLabelText(/deuda de gas/i), { target: { value: "100" } });
    // Not part of the debt total:
    fireEvent.change(screen.getByLabelText(/valor de mercado/i), { target: { value: "9999999" } });

    expect(screen.getByTestId("debt-total")).toHaveTextContent("$16,350");
  });

  it("sends a filled-in case with money as decimal strings and counts as integers", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    goToStep("3. Inmueble");
    fireEvent.change(screen.getByLabelText(/número de plantas/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/número de recámaras/i), { target: { value: "3" } });
    goToStep("4. Finanzas");
    fireEvent.change(screen.getByLabelText(/valor de mercado/i), { target: { value: "1400000.50" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    const payload = createRenovaCaseMock.mock.calls[0][0];
    expect(payload.market_value).toBe("1400000.50");
    expect(payload.floors).toBe(2);
    expect(payload.bedrooms).toBe(3);
  });

  it("sends NSS and número de crédito only when typed, as masked password inputs with autocomplete off", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    const nss = screen.getByLabelText(/^nss/i);
    expect(nss).toHaveAttribute("type", "password");
    expect(nss).toHaveAttribute("autocomplete", "off");
    fireEvent.change(nss, { target: { value: "TESTNSS4455667" } });
    fireEvent.change(screen.getByLabelText(/número de crédito/i), { target: { value: "TESTCRED9081726" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({ nss: "TESTNSS4455667", credit_number: "TESTCRED9081726" });
  });

  it("flags an invalid NSS without repeating what was typed", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    fireEvent.change(screen.getByLabelText(/^nss/i), { target: { value: "no valido!!" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText(/solo letras, números y guiones/i)).toBeInTheDocument();
    expect(screen.queryByText(/no valido!!/i)).not.toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("shows a specific Spanish message when the server has no encryption key (503) and keeps the dialog open", async () => {
    createRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 503 } });
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cifrado de nss y número de crédito no está configurado/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a friendly message when the advisor isn't found (404)", async () => {
    createRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 404 } });
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró el registro o el asesor/i);
  });

  it("starts fresh every time it is opened", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo prospecto Renova" }));
    await screen.findByRole("dialog");
    goToStep("2. Propietario");

    expect(screen.getByLabelText(/nombre del titular/i)).toHaveValue("");
  });
});

describe("RenovaCaseForm — edit", () => {
  beforeEach(() => {
    updateRenovaCaseMock.mockReset();
    getRenovaCaseMock.mockReset();
    getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase() });
    updateRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase({ notes: "editadas" }) });
  });

  function renderEdit(onSaved = vi.fn()) {
    render(<RenovaCaseForm caseId="case-1" onSaved={onSaved} trigger={<button>Editar</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    return onSaved;
  }

  it("loads the full case (the list is lean) and pre-fills it", async () => {
    renderEdit();

    expect(await screen.findByRole("dialog")).toHaveTextContent("Editar expediente Renova");
    await waitFor(() => expect(getRenovaCaseMock).toHaveBeenCalledWith("case-1"));
    goToStep("2. Propietario");
    expect(await screen.findByDisplayValue("María López")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument();
    goToStep("4. Finanzas");
    expect(screen.getByLabelText(/valor de mercado/i)).toHaveValue(1400000);
  });

  it("never pre-fills NSS or número de crédito — only their masks are shown", async () => {
    renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    goToStep("2. Propietario");

    expect(screen.getByLabelText(/^nss/i)).toHaveValue("");
    expect(screen.getByLabelText(/número de crédito/i)).toHaveValue("");
    expect(screen.getByText(/guardado: ••••4455/i)).toBeInTheDocument();
    expect(screen.getByText(/guardado: ••••9081/i)).toBeInTheDocument();
  });

  it("saves only through PATCH for that case, without sending NSS/credit number when untouched", async () => {
    const onSaved = renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    goToStep("5. Motivación y evaluación");
    fireEvent.change(screen.getByLabelText(/notas adicionales/i), { target: { value: "editadas" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledTimes(1));
    const [id, payload] = updateRenovaCaseMock.mock.calls[0];
    expect(id).toBe("case-1");
    expect(payload.notes).toBe("editadas");
    expect(payload).not.toHaveProperty("nss");
    expect(payload).not.toHaveProperty("credit_number");
    expect(payload).not.toHaveProperty("organization_id");
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("changing the status is a normal edit", async () => {
    renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    fireEvent.change(screen.getByLabelText("Estado del expediente"), { target: { value: "offer_sent" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    expect(updateRenovaCaseMock.mock.calls[0][1].status).toBe("offer_sent");
  });

  it("clearing a field sends null so it is really cleared", async () => {
    renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    goToStep("4. Finanzas");
    fireEvent.change(screen.getByLabelText(/propuesta final/i), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    expect(updateRenovaCaseMock.mock.calls[0][1].final_offer).toBeNull();
  });

  it("typing a replacement NSS sends only that new value", async () => {
    renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    goToStep("2. Propietario");
    fireEvent.change(screen.getByLabelText(/^nss/i), { target: { value: "NEWNSS0099887" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    const payload = updateRenovaCaseMock.mock.calls[0][1];
    expect(payload.nss).toBe("NEWNSS0099887");
    expect(payload).not.toHaveProperty("credit_number");
  });

  it("'Quitar' deletes only that stored value (sends null)", async () => {
    renderEdit();
    await screen.findByDisplayValue("2026-09-20");
    goToStep("2. Propietario");
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[0]);
    expect(screen.getByText(/se eliminará al guardar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    const payload = updateRenovaCaseMock.mock.calls[0][1];
    expect(payload.nss).toBeNull();
    expect(payload).not.toHaveProperty("credit_number");
  });

  it("shows an error instead of an empty form when the case can't be loaded", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 404 } });

    renderEdit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se encontró/i);
  });

  it("keeps an advisor other than the signed-in user selectable, labelled generically", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeCase({ assigned_user_id: "someone-else" }) });

    renderEdit();
    await screen.findByDisplayValue("2026-09-20");

    const select = screen.getByLabelText("Asesor responsable") as HTMLSelectElement;
    expect(select.value).toBe("someone-else");
    expect(screen.getByRole("option", { name: "Otro asesor" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Yo (usuario actual)" })).toBeInTheDocument();
  });
});
