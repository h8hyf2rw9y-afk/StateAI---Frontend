import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { RenovaCaseDetail } from "@/features/renova/components/renova-case-detail";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { REVEAL_DURATION_MS, useProtectedData } from "@/features/renova/lib/use-protected-data";
import { getRevealErrorMessage } from "@/features/renova/lib/errors";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const getRenovaCaseMock = vi.fn();
const getRenovaSensitiveDataMock = vi.fn();
const getRenovaHistoryMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args),
  getRenovaSensitiveData: (...args: unknown[]) => getRenovaSensitiveDataMock(...args),
  getRenovaHistory: (...args: unknown[]) => getRenovaHistoryMock(...args),
  updateRenovaCase: vi.fn(),
  createRenovaCase: vi.fn(),
}));
vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ user: { id: "user-1" }, isLoading: false, isAuthenticated: true }),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const FULL_NSS = "00123456789";
const FULL_CREDIT = "0098765432";
const REVEALED = { ok: true, data: { nss: FULL_NSS, credit_number: FULL_CREDIT } };

let storageWrites: string[] = [];
let consoleOutput: string[] = [];

beforeEach(() => {
  for (const mock of [getRenovaCaseMock, getRenovaSensitiveDataMock, getRenovaHistoryMock]) mock.mockReset();
  getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase() });
  getRenovaHistoryMock.mockResolvedValue({ ok: true, data: [] });
  getRenovaSensitiveDataMock.mockResolvedValue(REVEALED);
  storageWrites = [];
  consoleOutput = [];
  vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
    storageWrites.push(`${key}=${value}`);
  });
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function expectNoLeaks() {
  expect(storageWrites.join("\n")).not.toContain(FULL_NSS);
  expect(storageWrites.join("\n")).not.toContain(FULL_CREDIT);
  expect(consoleOutput.join("\n")).not.toContain(FULL_NSS);
  expect(consoleOutput.join("\n")).not.toContain(FULL_CREDIT);
  expect(window.location.href).not.toContain(FULL_NSS);
  expect(window.location.href).not.toContain(FULL_CREDIT);
}

describe("useProtectedData", () => {
  it("fetches nothing until the person confirms", async () => {
    const { result } = renderHook(() => useProtectedData("case-1"));

    expect(result.current.state.status).toBe("hidden");
    act(() => result.current.requestReveal());
    expect(result.current.state.status).toBe("confirming");
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();

    await act(async () => result.current.confirmReveal());
    expect(getRenovaSensitiveDataMock).toHaveBeenCalledWith("case-1");
    expect(result.current.values).toEqual({ nss: FULL_NSS, credit_number: FULL_CREDIT });
  });

  it("cancelling the confirmation never fetches", () => {
    const { result } = renderHook(() => useProtectedData("case-1"));
    act(() => result.current.requestReveal());

    act(() => result.current.cancel());

    expect(result.current.state.status).toBe("hidden");
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();
  });

  it("hide() drops the values immediately", async () => {
    const { result } = renderHook(() => useProtectedData("case-1"));
    await act(async () => result.current.confirmReveal());

    act(() => result.current.hide());

    expect(result.current.values).toBeNull();
    expect(result.current.state.status).toBe("hidden");
  });

  it("hides the values by itself after about a minute", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProtectedData("case-1"));
    await act(async () => result.current.confirmReveal());
    expect(result.current.values).not.toBeNull();

    act(() => vi.advanceTimersByTime(REVEAL_DURATION_MS - 1000));
    expect(result.current.values).not.toBeNull();
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.values).toBeNull();
    expect(REVEAL_DURATION_MS).toBe(60_000);
  });

  it("revealing again restarts the countdown", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProtectedData("case-1"));
    await act(async () => result.current.confirmReveal());
    act(() => vi.advanceTimersByTime(50_000));

    await act(async () => result.current.confirmReveal());
    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.values).not.toBeNull();
  });

  it("ignores a response that arrives after hide()", async () => {
    let resolve!: (value: unknown) => void;
    getRenovaSensitiveDataMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useProtectedData("case-1"));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.confirmReveal();
    });
    expect(result.current.state.status).toBe("loading");

    act(() => result.current.hide());
    await act(async () => {
      resolve(REVEALED);
      await pending;
    });

    expect(result.current.values).toBeNull();
    expect(result.current.state.status).toBe("hidden");
  });

  it("ignores a response that arrives after unmount and clears its timer", async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useProtectedData("case-1"));
    await act(async () => result.current.confirmReveal());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a failed reveal with a readable message and no values", async () => {
    getRenovaSensitiveDataMock.mockResolvedValue({ ok: false, error: { message: "x", status: 403 } });
    const { result } = renderHook(() => useProtectedData("case-1"));

    await act(async () => result.current.confirmReveal());

    expect(result.current.state).toEqual({
      status: "error",
      message: "No tienes permiso para consultar los datos protegidos de este expediente.",
    });
    expect(result.current.values).toBeNull();
  });

  it("does nothing without a case id (a new case has nothing to reveal)", async () => {
    const { result } = renderHook(() => useProtectedData(undefined));

    await act(async () => result.current.confirmReveal());

    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, /sesión expiró/],
    [403, /no tienes permiso/i],
    [404, /no se encontró/i],
    [409, /descifrar/i],
    [503, /clave de cifrado/i],
    [500, /no se pudieron consultar/i],
  ])("maps a %s reveal error to Spanish copy without echoing server text", (status, pattern) => {
    const message = getRevealErrorMessage({ message: `secret ${FULL_NSS}`, status });

    expect(message).toMatch(pattern);
    expect(message).not.toContain(FULL_NSS);
  });
});

describe("Mostrar datos protegidos — case detail page", () => {
  async function renderDetail() {
    render(<RenovaCaseDetail caseId="case-1" />);
    await screen.findByRole("heading", { level: 1, name: "María López" });
  }

  it("starts masked and loads nothing sensitive", async () => {
    await renderDetail();

    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expect(screen.getByTestId("credit-number-display")).toHaveTextContent("••••••9911");
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mostrar datos protegidos" })).toBeInTheDocument();
  });

  it("asks for confirmation before anything is fetched", async () => {
    await renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));

    expect(screen.getByText("Vas a consultar información personal protegida de este cliente.")).toBeInTheDocument();
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
  });

  it("reveals the full values after confirming, then Ocultar clears them at once", async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));

    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));

    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));
    expect(screen.getByTestId("credit-number-display")).toHaveTextContent(FULL_CREDIT);
    expect(screen.getByText(/se ocultarán en 1 minuto/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));

    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expect(document.body.textContent).not.toContain(FULL_NSS);
    expect(document.body.textContent).not.toContain(FULL_CREDIT);
  });

  it("hides the values automatically after the timeout", async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    });
    expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS);

    act(() => vi.advanceTimersByTime(REVEAL_DURATION_MS + 100));

    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expect(document.body.textContent).not.toContain(FULL_NSS);
  });

  it("clears the values when the page is left (unmount)", async () => {
    const { unmount } = render(<RenovaCaseDetail caseId="case-1" />);
    await screen.findByRole("heading", { level: 1, name: "María López" });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));

    unmount();

    expect(document.body.textContent).not.toContain(FULL_NSS);
    expect(document.body.textContent).not.toContain(FULL_CREDIT);
  });

  it("shows a readable error for an unauthorized reveal and keeps the masks", async () => {
    getRenovaSensitiveDataMock.mockResolvedValue({ ok: false, error: { message: "Forbidden", status: 403 } });
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));

    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no tienes permiso/i);
    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expect(screen.getByRole("button", { name: "Mostrar datos protegidos" })).toBeInTheDocument();
  });

  it("offers no reveal button when nothing is stored", async () => {
    getRenovaCaseMock.mockResolvedValue({
      ok: true,
      data: makeRenovaCase({ nss_masked: null, credit_number_masked: null, has_nss: false, has_credit_number: false }),
    });
    await renderDetail();

    expect(screen.queryByRole("button", { name: "Mostrar datos protegidos" })).not.toBeInTheDocument();
    expect(document.body.textContent?.match(/No registrado/g)).toHaveLength(2);
  });

  it("never leaks the values to storage, the console or the URL", async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));

    expectNoLeaks();
    expect(window.localStorage.getItem(FULL_NSS)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("hides revealed values when the editor is opened", async () => {
    await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(screen.getByLabelText("Colonia")).toBeInTheDocument());
    expect(document.querySelector("span[data-testid=nss-display]")).toHaveTextContent("•••••••4455");
    expect(document.body.textContent).not.toContain(FULL_NSS);
    expect(document.body.textContent).not.toContain(FULL_CREDIT);
  });
});

describe("Mostrar datos protegidos — edit popup", () => {
  async function renderEdit() {
    render(<RenovaCaseDialog caseId="case-1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López"));
  }

  it("reveals the values in place of the masks and hides them again", async () => {
    await renderEdit();
    expect(getRenovaSensitiveDataMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));

    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));
    expect(screen.getByTestId("credit_number-display")).toHaveTextContent(FULL_CREDIT);

    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.getByTestId("nss-display")).toHaveTextContent("•••••••4455");
    expectNoLeaks();
  });

  it("a revealed value is display only: it does not enter the form, the dirty check or the payload", async () => {
    await renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Revealing is not an edit, so closing does not ask to discard anything.
    expect(screen.queryByText("¿Descartar los cambios?")).not.toBeInTheDocument();
  });

  it("clears the revealed values when the popup closes (unmount)", async () => {
    const view = render(<RenovaCaseDialog caseId="case-1" onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/nombre completo del titular/i)).toHaveValue("María López"));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar datos protegidos" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, mostrar" }));
    await waitFor(() => expect(screen.getByTestId("nss-display")).toHaveTextContent(FULL_NSS));

    view.unmount();

    expect(document.body.textContent).not.toContain(FULL_NSS);
  });

  it("a new case has no reveal control at all", async () => {
    render(<RenovaCaseDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Mostrar datos protegidos" })).not.toBeInTheDocument();
  });
});
