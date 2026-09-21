"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getDisplayName } from "@/features/auth/lib";
import { DEFAULT_SHARE_OPTIONS, RenovaShareCard, type RenovaShareOptions } from "@/features/renova/components/renova-share-card";
import { RenovaShareOptionsPanel, type ExportState } from "@/features/renova/components/renova-share-options";
import { getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  SHARE_CARD_WIDTH,
  canShareFile,
  downloadFile,
  pngFileFromBlob,
  renderNodeToPng,
  shareOrDownload,
} from "@/features/renova/lib/export-image";
import { renovaShortId } from "@/features/renova/lib/short-id";
import type { RenovaCase } from "@/features/renova/types";
import { getRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";

const DOWNLOAD_FALLBACK_MESSAGE = "La imagen se descargó. Ahora puedes adjuntarla en tu grupo de WhatsApp.";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; renovaCase: RenovaCase };

/**
 * Shows the card at whatever width fits by scaling it with CSS. Only the
 * VISUAL size changes: the card itself keeps its fixed 1080px layout, which is
 * exactly what gets exported (the PNG is rendered from the card node, not from
 * this scaled wrapper).
 */
function ScaledPreview({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number | null }>({ scale: 1, height: null });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const scale = Math.min(1, wrapper.clientWidth / SHARE_CARD_WIDTH);
      setFit({ scale, height: inner.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden" style={{ height: fit.height ?? undefined }}>
      <div ref={innerRef} style={{ width: SHARE_CARD_WIDTH, transform: `scale(${fit.scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * "Ver ficha para compartir": loads the REAL saved case from the backend and
 * shows its white card next to the "Preparar para compartir" options.
 *
 * Export: the card node is rendered to a PNG client-side (lib/export-image.ts);
 * "Compartir imagen" then uses the native share sheet when the browser can
 * share files (on phones this includes WhatsApp) and otherwise downloads the
 * PNG with a message telling the person to attach it in WhatsApp. Nothing is
 * ever sent automatically.
 */
export function RenovaShareDialog({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { user } = useUser();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [options, setOptions] = useState<RenovaShareOptions>(DEFAULT_SHARE_OPTIONS);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [canShareFiles] = useState(() => canShareFile(new File([], "probe.png", { type: "image/png" })));
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getRenovaCase(caseId).then((response) => {
      if (cancelled) return;
      setLoad(response.ok ? { status: "ready", renovaCase: response.data } : { status: "error", message: getRenovaErrorMessage(response.error) });
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const renovaCase = load.status === "ready" ? load.renovaCase : null;
  // Only the signed-in user's name is knowable (the backend has no user directory); anyone else reads "Pendiente" on the card.
  const advisorName = renovaCase && user && renovaCase.assigned_user_id === user.id ? getDisplayName(user) : null;
  const hasPendingData = renovaCase
    ? !renovaCase.street_address || !renovaCase.final_offer || !renovaCase.market_value || !renovaCase.sale_reason || !renovaCase.conditions
    : false;

  async function buildFile(): Promise<File> {
    const node = cardRef.current;
    if (!node || !renovaCase) throw new Error("card not ready");
    return pngFileFromBlob(await renderNodeToPng(node), `renova-${renovaShortId(renovaCase.id)}.png`);
  }

  async function handleDownload() {
    setExportState({ kind: "generating" });
    try {
      downloadFile(await buildFile());
      setExportState({ kind: "ready", message: "Imagen descargada." });
    } catch {
      setExportState({ kind: "error", message: "No se pudo generar la imagen. Inténtalo de nuevo." });
    }
  }

  async function handleShare() {
    setExportState({ kind: "generating" });
    try {
      const outcome = await shareOrDownload(await buildFile(), `Ficha Renova ${renovaShortId(renovaCase!.id)}`);
      if (outcome === "shared") setExportState({ kind: "ready", message: "Imagen compartida." });
      else if (outcome === "downloaded") setExportState({ kind: "ready", message: DOWNLOAD_FALLBACK_MESSAGE });
      else setExportState({ kind: "idle" });
    } catch {
      setExportState({ kind: "error", message: "No se pudo generar la imagen. Inténtalo de nuevo." });
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh-1rem)] max-h-none w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[92dvh] sm:max-w-[min(1360px,calc(100%-2rem))]"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className="text-lg">Ficha para compartir</DialogTitle>
            <DialogDescription>Revisa la ficha, elige qué incluir y compártela como imagen.</DialogDescription>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {load.status === "loading" && (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando ficha…
            </p>
          )}
          {load.status === "error" && <FormError message={load.message} />}
          {renovaCase && (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 rounded-xl bg-muted/40 p-3 sm:p-4">
                <ScaledPreview>
                  <RenovaShareCard ref={cardRef} renovaCase={renovaCase} options={options} advisorName={advisorName} />
                </ScaledPreview>
              </div>
              <div className="w-full shrink-0 lg:w-80">
                <RenovaShareOptionsPanel
                  options={options}
                  onChange={setOptions}
                  canShareFiles={canShareFiles}
                  exportState={exportState}
                  hasPendingData={hasPendingData}
                  onShare={() => void handleShare()}
                  onDownload={() => void handleDownload()}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
