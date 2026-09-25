import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const createRenovaCaseMock = vi.fn();
const updateRenovaCaseMock = vi.fn();
const getRenovaCaseMock = vi.fn();
const getContactsMock = vi.fn();
const createContactMock = vi.fn();
const getRenovaSensitiveDataMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  createRenovaCase: (...args: unknown[]) => createRenovaCaseMock(...args),
  updateRenovaCase: (...args: unknown[]) => updateRenovaCaseMock(...args),
  getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args),
  getRenovaSensitiveData: (...args: unknown[]) => getRenovaSensitiveDataMock(...args),
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

// The form has ~35 fields and every keystroke re-renders it; the long "fill everything" flows need more than the 5s default when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const savedCase = () => makeRenovaCase({ id: "case-1", assigned_user_id: "user-me" });

function renderCreate() {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<RenovaCaseDialog onClose={onClose} onSaved={onSaved} />);
  return { onSaved, onClose };
}

async function renderEdit(overrides = {}) {
  getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase({ id: "case-1", assigned_user_id: "user-me", ...overrides }) });
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<RenovaCaseDialog caseId="case-1" onClose={onClose} onSaved={onSaved} />);
  await waitFor(() => expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López"));
  return { onSaved, onClose };
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired() {
  type(/nombre completo del titular/i, "María López");
  type(/celular del titular/i, "+52 81 5555 0101");
}

beforeEach(() => {
  for (const mock of [createRenovaCaseMock, updateRenovaCaseMock, getRenovaCaseMock, getContactsMock, createContactMock, getRenovaSensitiveDataMock]) mock.mockReset();
  createRenovaCaseMock.mockResolvedValue({ ok: true, data: savedCase() });
  updateRenovaCaseMock.mockResolvedValue({ ok: true, data: savedCase() });
});

describe("RenovaCaseDialog — structure (one continuous form, not a wizard)", () => {
  it("opens with the requested header, description and the single 'Datos del expediente' label", async () => {
    renderCreate();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Nuevo prospecto Renova")).toBeInTheDocument();
    expect(within(dialog).getByText("Captura el expediente de compra potencial en un solo formulario.")).toBeInTheDocument();
    expect(within(dialog).getByText("Datos del expediente")).toBeInTheDocument();
  });

  it("shows all six sections at once, in order, in ONE form with no tabs, steps or accordions", async () => {
    renderCreate();
    const dialog = await screen.findByRole("dialog");

    const headings = within(dialog)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Registro y propuesta",
      "Ubicación e inmueble",
      "Adeudos",
      "Condición y situación",
      "Titular y cónyuge",
      "Preguntas clave",
    ]);
    expect(dialog.querySelectorAll("form")).toHaveLength(1);
    expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("tablist")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /siguiente|anterior/i })).not.toBeInTheDocument();
    expect(dialog.querySelector("[aria-expanded]:not([aria-haspopup])")).toBeNull();
    // Fields from the first and the last section are on screen together.
    expect(within(dialog).getByLabelText(/fecha de ingreso/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/notas adicionales o contexto/i)).toBeInTheDocument();
  });

  it("has every requested field, labelled, and does not duplicate the expected-amount field", async () => {
    renderCreate();
    const dialog = await screen.findByRole("dialog");

    for (const label of [
      "Asesor responsable",
      /fecha de ingreso/i,
      "Estado del expediente",
      "Propuesta final",
      "Valor de mercado",
      "Cuánto espera recibir",
      "Calle y número",
      "Colonia",
      "Municipio",
      "Código postal",
      "Plantas",
      "Baños",
      "Recámaras",
      "Deuda predial",
      "Adeudo",
      "Deuda de agua",
      "Deuda de luz",
      "Deuda de gas",
      "A quién se debe",
      "Condiciones de la casa",
      "A nombre de quién están las escrituras",
      "Comentarios generales",
      /nombre completo del titular/i,
      /celular del titular/i,
      "Estado civil al adquirir el inmueble",
      "NSS",
      "Número de crédito",
      "Nombre completo del cónyuge",
      "Celular del cónyuge",
      "¿Por qué la quiere vender?",
      "Notas adicionales o contexto de la conversación",
    ]) {
      expect(within(dialog).getAllByLabelText(label).length).toBeGreaterThan(0);
    }
    expect(within(dialog).getAllByLabelText(/cuánto espera recibir/i)).toHaveLength(1);
    expect(within(dialog).getByRole("radiogroup", { name: "Tipo de vivienda" })).toBeInTheDocument();
    expect(within(dialog).getByRole("radiogroup", { name: "Situación actual" })).toBeInTheDocument();
    expect(within(dialog).getByRole("radiogroup", { name: "Escrituras" })).toBeInTheDocument();
  });

  it("marks the required fields and shows the protected-data note and footer legend", async () => {
    renderCreate();
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText(/nombre completo del titular/i)).toHaveAttribute("aria-required", "true");
    expect(within(dialog).getByText("* Campos necesarios para crear el expediente")).toBeInTheDocument();
    expect(within(dialog).getByText("NSS y número de crédito son datos protegidos. Puedes incluirlos expresamente al preparar la ficha compartible.")).toBeInTheDocument();
    for (const name of ["Cancelar", "Guardar borrador", "Guardar prospecto"]) {
      expect(within(dialog).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("defaults the advisor to the signed-in user", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByLabelText("Asesor responsable")).toHaveValue("user-me");
  });
});

describe("RenovaCaseDialog — expand / collapse", () => {
  it("swaps the expand button for a collapse button and back, with accessible names", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Expandir formulario" }));
    expect(screen.queryByRole("button", { name: "Expandir formulario" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Contraer formulario" }));
    expect(screen.getByRole("button", { name: "Expandir formulario" })).toBeInTheDocument();
  });

  it("keeps everything typed when expanding and collapsing — same single form throughout", async () => {
    renderCreate();
    const dialog = await screen.findByRole("dialog");
    fillRequired();
    type("Colonia", "Centro");
    fireEvent.click(screen.getByRole("radio", { name: "Casa" }));

    fireEvent.click(screen.getByRole("button", { name: "Expandir formulario" }));
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López");
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");
    expect(screen.getByRole("radio", { name: "Casa" })).toHaveAttribute("aria-checked", "true");
    expect(dialog.querySelectorAll("form")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Contraer formulario" }));
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López");
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");
    expect(screen.getByRole("radio", { name: "Casa" })).toHaveAttribute("aria-checked", "true");
  });

  it("offers a labelled close button", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });
});

describe("RenovaCaseDialog — money and debts", () => {
  it("computes the debt total live from the five debt fields and never stores it", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    expect(screen.getByTestId("debt-total")).toHaveTextContent("Total estimado de adeudos: —");

    type("Deuda predial", "12000");
    type("Deuda de agua", "800");
    type("Deuda de luz", "450");
    expect(screen.getByTestId("debt-total")).toHaveTextContent("Total estimado de adeudos: $13,250 MXN");

    type("Adeudo", "3000.5");
    expect(screen.getByTestId("debt-total")).toHaveTextContent("$16,250.50 MXN");
    // The market value is not a debt.
    type("Valor de mercado", "9999999");
    expect(screen.getByTestId("debt-total")).toHaveTextContent("$16,250.50 MXN");
  });

  it("a negative debt is refused and never reduces the total", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    type("Deuda predial", "1000");
    type("Adeudo", "-500");

    expect(screen.getByTestId("debt-total")).toHaveTextContent("$1,000 MXN");
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText("El monto no puede ser negativo.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("shows money with thousands separators while not focused and the bare number while editing", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    const box = screen.getByLabelText("Valor de mercado");

    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "$1,400,000" } });
    expect(box).toHaveValue("1400000");
    fireEvent.blur(box);
    expect(box).toHaveValue("1,400,000");
  });
});

describe("RenovaCaseDialog — validation", () => {
  it("blocks the save, explains what is missing and focuses the first invalid field", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText("El nombre del titular es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El celular es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Revisa los campos marcados antes de guardar.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveFocus();
  });

  it("associates each error with its field and marks it invalid (not by color alone)", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await screen.findByText("El celular es obligatorio.");

    const phone = screen.getByLabelText(/celular del titular/i);
    expect(phone).toHaveAttribute("aria-invalid", "true");
    const describedBy = phone.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toHaveTextContent("El celular es obligatorio.");
  });

  it("rejects a malformed postal code", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("Código postal", "64A");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText("El código postal debe tener 5 dígitos.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is edited", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await screen.findByText("El nombre del titular es obligatorio.");

    type(/nombre completo del titular/i, "María");

    expect(screen.queryByText("El nombre del titular es obligatorio.")).not.toBeInTheDocument();
  });
});

describe("RenovaCaseDialog — segmented controls", () => {
  it("are radio groups: selection is exclusive, shown with aria-checked, and arrow keys move it", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    const casa = screen.getByRole("radio", { name: "Casa" });
    const depto = screen.getByRole("radio", { name: "Departamento" });
    fireEvent.click(casa);
    expect(casa).toHaveAttribute("aria-checked", "true");
    expect(depto).toHaveAttribute("aria-checked", "false");

    fireEvent.keyDown(casa, { key: "ArrowRight" });
    expect(depto).toHaveAttribute("aria-checked", "true");
    expect(casa).toHaveAttribute("aria-checked", "false");
    expect(depto).toHaveFocus();
  });

  it("clicking the selected optional choice again clears it; deeds always keep a value", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    const rentada = screen.getByRole("radio", { name: "Rentada" });
    fireEvent.click(rentada);
    expect(rentada).toHaveAttribute("aria-checked", "true");
    fireEvent.click(rentada);
    expect(rentada).toHaveAttribute("aria-checked", "false");

    expect(screen.getByRole("radio", { name: "Desconocido" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Desconocido" }));
    expect(screen.getByRole("radio", { name: "Desconocido" })).toHaveAttribute("aria-checked", "true");
  });

  it("offers the five occupancy options in Spanish", async () => {
    renderCreate();
    const group = within(await screen.findByRole("radiogroup", { name: "Situación actual" }));

    expect(group.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Vive ahí", "Deshabitada", "Rentada", "Prestada", "Otra"]);
  });
});

describe("RenovaCaseDialog — dwelling type vs. duplex configuration", () => {
  it("Casa and Departamento remain mutually exclusive, and Dúplex is a separate checkbox — not a third radio option", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByRole("radiogroup", { name: "Tipo de vivienda" }).querySelectorAll('[role="radio"]')).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Dúplex" })).toBeInTheDocument();
  });

  it("Dúplex can be combined with Casa", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("radio", { name: "Casa" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Dúplex" }));

    expect(screen.getByRole("radio", { name: "Casa" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Dúplex" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({ dwelling_type: "house", is_duplex: true });
  });

  it("Dúplex can be combined with Departamento", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("radio", { name: "Departamento" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Dúplex" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({ dwelling_type: "apartment", is_duplex: true });
  });

  it("Dúplex can be selected with no base type yet, and clicking it again clears it", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    const duplex = screen.getByRole("checkbox", { name: "Dúplex" });
    fireEvent.click(duplex);
    expect(duplex).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Casa" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Departamento" })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(duplex);
    expect(duplex).toHaveAttribute("aria-checked", "false");
  });

  it("changing the base type never turns Dúplex off, in either direction", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("radio", { name: "Casa" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Dúplex" }));
    fireEvent.click(screen.getByRole("radio", { name: "Departamento" }));

    expect(screen.getByRole("radio", { name: "Departamento" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Dúplex" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("RenovaCaseDialog — deuda predial: pesos vs. años", () => {
  it("defaults to pesos, and switching to años swaps the amount field for a whole-years field", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    expect(screen.getByRole("radio", { name: "Pesos (MXN)" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Deuda predial")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Años" }));

    expect(screen.getByRole("radio", { name: "Años" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByLabelText("Deuda predial")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Deuda predial (años)")).toBeInTheDocument();
  });

  it("sends the unit and the years value, and excludes it from the live debt total (years and pesos can't be summed)", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("Deuda de agua", "800");

    fireEvent.click(screen.getByRole("radio", { name: "Años" }));
    type("Deuda predial (años)", "3");

    expect(screen.getByTestId("debt-total")).toHaveTextContent("$800 MXN");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({
      property_tax_debt_unit: "years",
      property_tax_debt: "3",
    });
  });

  it("rejects a non-integer or over-60 years value", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    fireEvent.click(screen.getByRole("radio", { name: "Años" }));

    type("Deuda predial (años)", "3.5");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    expect(await screen.findByText("Ingresa un número entero de años.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();

    type("Deuda predial (años)", "61");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));
    expect(await screen.findByText("Máximo 60 años.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });
});

describe("RenovaCaseDialog — saving", () => {
  it("creates a prospect with only the mandatory fields — status new, nothing else invented", async () => {
    const { onSaved } = renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalledTimes(1));
    const payload = createRenovaCaseMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      assigned_user_id: "user-me",
      owner_name: "María López",
      owner_phone: "+52 81 5555 0101",
      status: "new",
      has_deeds: "unknown",
    });
    for (const absent of ["organization_id", "nss", "credit_number", "final_offer", "market_value", "spouse_name", "street_address"]) {
      expect(payload).not.toHaveProperty(absent);
    }
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "case-1" }), "prospect"));
    expect(updateRenovaCaseMock).not.toHaveBeenCalled();
    expect(createContactMock).not.toHaveBeenCalled();
    expect(getContactsMock).not.toHaveBeenCalled();
  });

  it("sends what was captured across every section, with money as decimal strings", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("Propuesta final", "950000");
    type("Valor de mercado", "1400000.50");
    type("Calle y número", "Av. Constitución 123");
    type("Colonia", "Centro");
    type("Municipio", "Monterrey");
    type("Código postal", "64000");
    fireEvent.click(screen.getByRole("radio", { name: "Departamento" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Dúplex" }));
    type("Plantas", "2");
    type("Baños", "2.5");
    type("Recámaras", "3");
    type("Deuda predial", "12000");
    type("A quién se debe", "Infonavit");
    type("Condiciones de la casa", "Requiere pintura");
    fireEvent.click(screen.getByRole("radio", { name: "Vive ahí" }));
    fireEvent.click(screen.getByRole("radio", { name: "Sí" }));
    type("Nombre completo del cónyuge", "Juan Pérez");
    type("¿Por qué la quiere vender?", "Se muda");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({
      final_offer: "950000",
      market_value: "1400000.50",
      street_address: "Av. Constitución 123",
      neighborhood: "Centro",
      municipality: "Monterrey",
      postal_code: "64000",
      dwelling_type: "apartment",
      is_duplex: true,
      floors: 2,
      bathrooms: "2.5",
      bedrooms: 3,
      property_tax_debt: "12000",
      debt_owed_to: "Infonavit",
      conditions: "Requiere pintura",
      occupancy_status: "lives_there",
      has_deeds: "yes",
      spouse_name: "Juan Pérez",
      sale_reason: "Se muda",
    });
  });

  it("saves a draft with status draft through the same create call", async () => {
    const { onSaved } = renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalledTimes(1));
    expect(createRenovaCaseMock.mock.calls[0][0].status).toBe("draft");
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), "draft"));
  });

  it("a draft still needs the fields the backend requires", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(await screen.findByText("El nombre del titular es obligatorio.")).toBeInTheDocument();
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("uses the real backend response: on failure it keeps everything typed and explains in Spanish", async () => {
    createRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 422 } });
    const { onSaved, onClose } = renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("Colonia", "Centro");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText(/revisa los datos capturados/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López");
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Guardar prospecto" })).toBeEnabled();
  });

  it("explains an unreachable server without raw errors", async () => {
    createRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "Failed to fetch" } });
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    const alert = await screen.findByText(/no se pudo conectar con el servidor/i);
    expect(alert).toBeInTheDocument();
    expect(screen.queryByText(/failed to fetch/i)).not.toBeInTheDocument();
  });

  it("disables the buttons while saving and cannot be double-submitted", async () => {
    let resolve!: (value: unknown) => void;
    createRenovaCaseMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    const save = screen.getByRole("button", { name: "Guardar prospecto" });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(createRenovaCaseMock).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    resolve({ ok: true, data: savedCase() });
    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalledTimes(1));
  });

  it("NSS and número de crédito are visible numeric text inputs — not passwords — with their helper texts", async () => {
    renderCreate();
    await screen.findByRole("dialog");

    for (const [label, helper] of [
      ["NSS", "11 dígitos. Se almacenará cifrado."],
      ["Número de crédito", "Se almacenará cifrado y no aparecerá en la ficha compartible."],
    ]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputmode", "numeric");
      expect(input).toHaveAttribute("autocomplete", "off");
      expect(input).toHaveAttribute("spellcheck", "false");
      expect(input.getAttribute("style") ?? "").not.toMatch(/text-security/i);
      expect(input.className).not.toMatch(/text-security/i);
      expect(screen.getByText(helper)).toBeInTheDocument();
    }
    expect(document.querySelector("input[type=password]")).toBeNull();
    expect(screen.queryByText(/contraseña|password/i)).not.toBeInTheDocument();
  });

  it("shows what is typed in full, keeps leading zeros and sends bare digits", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();

    type("NSS", "001 2345 6789");
    type("Número de crédito", "0098765432");
    expect(screen.getByLabelText("NSS")).toHaveValue("001 2345 6789");
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(createRenovaCaseMock).toHaveBeenCalled());
    expect(createRenovaCaseMock.mock.calls[0][0]).toMatchObject({ nss: "00123456789", credit_number: "0098765432" });
  });

  it("a badly formatted NSS is reported without echoing the value, and nothing is sent", async () => {
    renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("NSS", "no válido!!");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    expect(await screen.findByText("El NSS debe tener 11 dígitos.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("no válido!!");
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("NSS")).toHaveFocus();
  });

  it("when the server has no encryption key it keeps the whole form and explains it next to the protected data", async () => {
    createRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 503 } });
    const { onSaved, onClose } = renderCreate();
    await screen.findByRole("dialog");
    fillRequired();
    type("Colonia", "Centro");
    type("NSS", "00123456789");

    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    const message =
      "El servidor todavía no puede proteger estos datos. Configura la clave de cifrado antes de guardar NSS o número de crédito.";
    const alert = await screen.findByText(message);
    expect(alert.closest("section")).toHaveTextContent("Titular y cónyuge");
    expect(screen.getByLabelText("NSS")).toHaveValue("00123456789");
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López");
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByText(message)).toHaveLength(1);
  });
});

describe("RenovaCaseDialog — unsaved changes", () => {
  it("closes straight away when nothing was changed", async () => {
    const { onClose } = renderCreate();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("¿Descartar los cambios?")).not.toBeInTheDocument();
  });

  it.each([["Cancelar"], ["Cerrar"]])("asks for confirmation instead of silently discarding when %s is used with changes", async (button) => {
    const { onClose } = renderCreate();
    await screen.findByRole("dialog");
    type("Colonia", "Centro");

    fireEvent.click(screen.getByRole("button", { name: button }));

    expect(await screen.findByText("¿Descartar los cambios?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // The typed value is still there behind the confirmation.
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");
  });

  it("'Seguir editando' keeps the form; 'Descartar cambios' closes it", async () => {
    const { onClose } = renderCreate();
    await screen.findByRole("dialog");
    type("Colonia", "Centro");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(await screen.findByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByText("¿Descartar los cambios?")).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Colonia")).toHaveValue("Centro");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape asks for confirmation when there are changes", async () => {
    const { onClose } = renderCreate();
    const dialog = await screen.findByRole("dialog");
    type("Colonia", "Centro");

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(await screen.findByText("¿Descartar los cambios?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not count the untouched default advisor or date as a change", async () => {
    const { onClose } = renderCreate();
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe("RenovaCaseDialog — edit mode (same popup, real data)", () => {
  it("loads the real case into the same form under the edit title", async () => {
    await renderEdit();

    const dialog = screen.getByRole("dialog");
    expect(getRenovaCaseMock).toHaveBeenCalledWith("case-1");
    expect(within(dialog).getByText("Editar prospecto Renova")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López");
    expect(screen.getByLabelText("Calle y número")).toHaveValue("Av. Constitución 123");
    expect(screen.getByLabelText("Código postal")).toHaveValue("64000");
    expect(screen.getByRole("radio", { name: "Departamento" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Dúplex" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Rentada" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Valor de mercado")).toHaveValue("1,400,000");
    // Same layout, same six sections.
    expect(within(dialog).getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument();
  });

  it("shows a loading state and then a readable error if the case cannot be loaded", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "nope", status: 404 } });
    render(<RenovaCaseDialog caseId="case-1" onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByText(/no se encontró el registro/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre completo del titular/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("saves with an update (never a create), keeping unrelated fields and sending null for cleared ones", async () => {
    const { onSaved } = await renderEdit();
    type("Propuesta final", "");
    type("Colonia", "Obispado");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledTimes(1));
    const [id, payload] = updateRenovaCaseMock.mock.calls[0];
    expect(id).toBe("case-1");
    expect(payload).toMatchObject({ neighborhood: "Obispado", final_offer: null, market_value: "1400000", status: "reviewing" });
    expect(payload).not.toHaveProperty("key_questions");
    expect(createRenovaCaseMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), "prospect"));
  });

  it("offers no draft button for a case that is already a real prospect", async () => {
    await renderEdit();

    expect(screen.queryByRole("button", { name: "Guardar borrador" })).not.toBeInTheDocument();
  });

  it("a saved draft can still be saved as a draft or promoted to a prospect (status new)", async () => {
    await renderEdit({ status: "draft" });

    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar prospecto" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    expect(updateRenovaCaseMock.mock.calls[0][1].status).toBe("new");
  });

  it("shows the stored NSS and número de crédito as masks — no input, nothing pre-filled, nothing sent", async () => {
    await renderEdit();

    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expect(screen.getByTestId("credit_number-display")).toHaveTextContent("••••••9911");
    expect(screen.queryByRole("textbox", { name: "NSS" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Número de crédito" })).not.toBeInTheDocument();
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Colonia"), { target: { value: "Obispado" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    const payload = updateRenovaCaseMock.mock.calls[0][1];
    expect(payload).not.toHaveProperty("nss");
    expect(payload).not.toHaveProperty("credit_number");
    expect(JSON.stringify(payload)).not.toMatch(/•|\*|4455|9911/);
  });

  it("'Reemplazar' shows an empty visible input; only the typed digits are sent, and an empty one sends nothing", async () => {
    await renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Reemplazar NSS" }));
    const input = screen.getByLabelText("NSS");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledTimes(1));
    expect(updateRenovaCaseMock.mock.calls[0][1]).not.toHaveProperty("nss");
  });

  it("'Reemplazar' then typing sends only the new digits", async () => {
    await renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar NSS" }));
    type("NSS", "99887766554");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalledTimes(1));
    expect(updateRenovaCaseMock.mock.calls[0][1].nss).toBe("99887766554");
    expect(updateRenovaCaseMock.mock.calls[0][1]).not.toHaveProperty("credit_number");
  });

  it("a mask typed into the replacement input is refused, never sent", async () => {
    await renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar NSS" }));
    type("NSS", "•••••••4455");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("El NSS debe tener 11 dígitos.")).toBeInTheDocument();
    expect(updateRenovaCaseMock).not.toHaveBeenCalled();
  });

  it("cancelling a replacement returns to the mask and drops what was typed", async () => {
    await renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar NSS" }));
    type("NSS", "99887766554");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reemplazo de NSS" }));

    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    expect(updateRenovaCaseMock.mock.calls[0][1]).not.toHaveProperty("nss");
  });

  it("'Quitar' asks for confirmation, and only then removes just that value (null); 'Deshacer' cancels it", async () => {
    await renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Quitar NSS" }));
    expect(screen.getByText(/¿Quitar el NSS guardado\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No quitar" }));
    expect(screen.queryByText(/¿Quitar el NSS guardado\?/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar NSS" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar" }));
    expect(screen.getByText("Se eliminará al guardar.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer eliminación de NSS" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar NSS" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    const payload = updateRenovaCaseMock.mock.calls[0][1];
    expect(payload.nss).toBeNull();
    expect(payload).not.toHaveProperty("credit_number");
  });

  it("replacing the credit number sends only that new value", async () => {
    await renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar Número de crédito" }));
    type("Número de crédito", "0011223344");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateRenovaCaseMock).toHaveBeenCalled());
    const payload = updateRenovaCaseMock.mock.calls[0][1];
    expect(payload.credit_number).toBe("0011223344");
    expect(payload).not.toHaveProperty("nss");
  });

  it("with nothing stored, the case has visible inputs directly (no mask, no reveal button)", async () => {
    await renderEdit({ nss_masked: null, credit_number_masked: null, has_nss: false, has_credit_number: false });

    expect(screen.getByLabelText("NSS")).toHaveAttribute("type", "text");
    expect(screen.queryByRole("button", { name: "Mostrar datos protegidos" })).not.toBeInTheDocument();
  });

  it("protects unsaved edits too", async () => {
    const { onClose } = await renderEdit();
    type("Colonia", "Otra");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar los cambios?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a failed update keeps the edits and reports the outcome", async () => {
    updateRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 500 } });
    const { onSaved } = await renderEdit();
    type("Colonia", "Obispado");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/algo salió mal/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Colonia")).toHaveValue("Obispado");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
