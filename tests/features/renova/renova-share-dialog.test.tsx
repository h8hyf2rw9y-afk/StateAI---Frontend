import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";
import { makeRenovaCase } from "@/tests/test-utils/renova-fixtures";

const getRenovaCaseMock = vi.fn();
const toBlobMock = vi.fn();

vi.mock("@/lib/api/renova", () => ({
  getRenovaCase: (...args: unknown[]) => getRenovaCaseMock(...args),
}));
vi.mock("html-to-image", () => ({ toBlob: (...args: unknown[]) => toBlobMock(...args) }));
vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    user: { id: "user-1", email: "ana@example.com", user_metadata: { full_name: "Ana Ruiz" } },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

const DOWNLOAD_MESSAGE = "La imagen se descargó. Ahora puedes adjuntarla en tu grupo de WhatsApp.";
const PNG = () => new Blob(["png"], { type: "image/png" });

let anchorClicks: { download: string; href: string }[] = [];

function setShare(support: "files" | "none") {
  const nav = navigator as unknown as Record<string, unknown>;
  if (support === "files") {
    nav.canShare = vi.fn(() => true);
    nav.share = vi.fn().mockResolvedValue(undefined);
  } else {
    delete nav.canShare;
    delete nav.share;
  }
}

async function openDialog(overrides = {}) {
  getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase(overrides) });
  const onClose = vi.fn();
  render(<RenovaShareDialog caseId="9f3a2c41-7b1d-4e0a-8c55-0d6e1f2a3b4c" onClose={onClose} />);
  await screen.findByTestId("renova-share-card");
  return onClose;
}

beforeEach(() => {
  getRenovaCaseMock.mockReset();
  toBlobMock.mockReset();
  toBlobMock.mockResolvedValue(PNG());
  anchorClicks = [];
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    anchorClicks.push({ download: this.download, href: this.href });
  });
  setShare("none");
});

afterEach(() => {
  vi.restoreAllMocks();
  setShare("none");
});

describe("RenovaShareDialog — the card and its options", () => {
  it("shows a loading state, then the card built from the real saved case", async () => {
    getRenovaCaseMock.mockReturnValue(new Promise(() => {}));
    render(<RenovaShareDialog caseId="case-1" onClose={vi.fn()} />);
    expect(screen.getByText(/cargando ficha/i)).toBeInTheDocument();

    getRenovaCaseMock.mockReset();
    getRenovaCaseMock.mockResolvedValue({ ok: true, data: makeRenovaCase() });
  });

  it("loads the case by id and renders its real values on the card", async () => {
    await openDialog();

    expect(getRenovaCaseMock).toHaveBeenCalledWith("9f3a2c41-7b1d-4e0a-8c55-0d6e1f2a3b4c");
    const card = screen.getByTestId("renova-share-card");
    expect(card).toHaveTextContent("María López");
    expect(card).toHaveTextContent("$950,000");
    expect(card).toHaveTextContent("RN-9F3A2C");
    expect(card).toHaveTextContent("Ana Ruiz"); // the signed-in user is the advisor: the one name that is knowable
  });

  it("names no advisor it cannot know — it reads Pendiente", async () => {
    await openDialog({ assigned_user_id: "someone-else" });

    expect(within(screen.getByTestId("renova-share-card")).getByText("Asesor").nextSibling).toHaveTextContent("Pendiente");
  });

  it("shows a readable error if the case cannot be loaded", async () => {
    getRenovaCaseMock.mockResolvedValue({ ok: false, error: { message: "x", status: 404 } });
    render(<RenovaShareDialog caseId="case-1" onClose={vi.fn()} />);

    expect(await screen.findByText(/no se encontró el registro/i)).toBeInTheDocument();
    expect(screen.queryByTestId("renova-share-card")).not.toBeInTheDocument();
  });

  it("offers the 'Preparar para compartir' options OUTSIDE the card, with the requested defaults and notice", async () => {
    await openDialog();
    const panel = screen.getByRole("complementary", { name: "Preparar para compartir" });
    const card = screen.getByTestId("renova-share-card");

    expect(panel).not.toContainElement(card);
    expect(card).not.toContainElement(panel);
    expect(within(panel).getByLabelText("Incluir teléfono del titular")).toBeChecked();
    expect(within(panel).getByLabelText("Incluir montos y adeudos")).toBeChecked();
    expect(within(panel).getByLabelText("Incluir información del cónyuge")).not.toBeChecked();
    expect(within(panel).getByText("NSS, número de crédito e imágenes del INE nunca se incluyen.")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Compartir imagen" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Descargar PNG" })).toBeInTheDocument();
    expect(card.querySelector("input, button")).toBeNull();
  });

  it("the toggles change what the card shows", async () => {
    await openDialog();
    const card = screen.getByTestId("renova-share-card");
    expect(card).toHaveTextContent("+52 81 5555 0101");
    expect(card).not.toHaveTextContent("Juan Pérez");

    fireEvent.click(screen.getByLabelText("Incluir teléfono del titular"));
    expect(card.textContent).not.toContain("+52 81 5555 0101");

    fireEvent.click(screen.getByLabelText("Incluir información del cónyuge"));
    expect(card).toHaveTextContent("Juan Pérez");

    fireEvent.click(screen.getByLabelText("Incluir montos y adeudos"));
    expect(card.textContent).not.toMatch(/\$/);
  });

  it("warns that an incomplete case will show Pendiente", async () => {
    await openDialog({ street_address: null, final_offer: null });

    expect(screen.getByText(/datos incompletos/i)).toBeInTheDocument();
  });

  it("never renders NSS, número de crédito or the full UUID anywhere in the dialog", async () => {
    await openDialog();
    const dialog = screen.getByRole("dialog");

    expect(dialog.textContent).not.toContain("4455");
    expect(dialog.textContent).not.toContain("9911");
    expect(dialog.textContent).not.toContain("•");
    expect(dialog.textContent).not.toContain("9f3a2c41-7b1d-4e0a-8c55-0d6e1f2a3b4c");
  });

  it("can be closed", async () => {
    const onClose = await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe("RenovaShareDialog — PNG export", () => {
  it("renders ONLY the card node — on a white background, at 2x, waiting for fonts", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));

    await waitFor(() => expect(toBlobMock).toHaveBeenCalledTimes(1));
    const [node, options] = toBlobMock.mock.calls[0];
    expect(node).toBe(screen.getByTestId("renova-share-card"));
    expect(node.closest("[role='dialog']")).not.toBe(node);
    expect(options).toMatchObject({ backgroundColor: "#ffffff", pixelRatio: 2 });
    // The exported node is the unscaled card: the scale lives on a wrapper above it, never on the card.
    expect(node.style.transform).toBe("");
    expect(node.style.width).toBe("1080px");
  });

  it("Descargar PNG downloads a file named after the short id — never the owner or the UUID", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));

    expect(await screen.findByText("Imagen descargada.")).toBeInTheDocument();
    expect(anchorClicks).toHaveLength(1);
    expect(anchorClicks[0].download).toBe("renova-RN-9F3A2C.png");
    expect(anchorClicks[0].download).not.toMatch(/mar[ií]a|l[oó]pez|9f3a2c41-7b1d/i);
  });

  it("shows 'Generando imagen…' and disables both actions while it works", async () => {
    let resolve!: (blob: Blob) => void;
    toBlobMock.mockReturnValue(new Promise<Blob>((r) => (resolve = r)));
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));

    expect(await screen.findByText("Generando imagen…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PNG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Compartir imagen" })).toBeDisabled();

    resolve(PNG());
    expect(await screen.findByText("Imagen descargada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar PNG" })).toBeEnabled();
  });

  it("reports a generation error readably and lets the person retry", async () => {
    toBlobMock.mockRejectedValueOnce(new Error("canvas exploded"));
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo generar la imagen. Inténtalo de nuevo.");
    expect(document.body.textContent).not.toContain("canvas exploded");
    expect(anchorClicks).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));
    expect(await screen.findByText("Imagen descargada.")).toBeInTheDocument();
  });

  it("treats an empty result from the renderer as an error", async () => {
    toBlobMock.mockResolvedValueOnce(null);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo generar la imagen/i);
  });
});

describe("RenovaShareDialog — sharing", () => {
  it("uses the native share sheet with the PNG file when the browser can share files", async () => {
    setShare("files");
    await openDialog();
    expect(screen.getByText(/se abrirá el menú de compartir/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));

    expect(await screen.findByText("Imagen compartida.")).toBeInTheDocument();
    const share = navigator.share as unknown as ReturnType<typeof vi.fn>;
    expect(share).toHaveBeenCalledTimes(1);
    const shared = share.mock.calls[0][0];
    expect(shared.files).toHaveLength(1);
    expect(shared.files[0]).toBeInstanceOf(File);
    expect(shared.files[0].name).toBe("renova-RN-9F3A2C.png");
    expect(shared.files[0].type).toBe("image/png");
    expect(anchorClicks).toHaveLength(0);
  });

  it("falls back to downloading the PNG and tells the person to attach it in WhatsApp", async () => {
    setShare("none");
    await openDialog();
    expect(screen.getByText(/no puede compartir imágenes directamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));

    expect(await screen.findByText(DOWNLOAD_MESSAGE)).toBeInTheDocument();
    expect(anchorClicks).toHaveLength(1);
    expect(anchorClicks[0].download).toBe("renova-RN-9F3A2C.png");
  });

  it("falls back to download when canShare exists but refuses files", async () => {
    setShare("files");
    (navigator.canShare as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));

    expect(await screen.findByText(DOWNLOAD_MESSAGE)).toBeInTheDocument();
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it("closing the share sheet is not an error and does not download", async () => {
    setShare("files");
    (navigator.share as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException("cancelled", "AbortError"));
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Generando imagen…")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(anchorClicks).toHaveLength(0);
  });

  it("a share failure other than cancelling is reported", async () => {
    setShare("files");
    (navigator.share as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not allowed"));
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo generar la imagen/i);
  });

  it("never sends anything on its own: no network call is made by sharing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    setShare("none");
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Compartir imagen" }));
    await screen.findByText(DOWNLOAD_MESSAGE);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
