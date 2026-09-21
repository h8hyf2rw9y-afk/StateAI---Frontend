"use client";

import { Download, Loader2, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RenovaShareOptions } from "@/features/renova/components/renova-share-card";

export type ExportState =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; message: string }
  | { kind: "error"; message: string };

const TOGGLES: { key: keyof RenovaShareOptions; label: string }[] = [
  { key: "includePhone", label: "Incluir teléfono del titular" },
  { key: "includeAmounts", label: "Incluir montos y adeudos" },
  { key: "includeSpouse", label: "Incluir información del cónyuge" },
];

/**
 * The "Preparar para compartir" panel. It lives OUTSIDE the exportable card
 * (its own column in the dialog), so none of these controls can end up in the
 * PNG. Purely presentational: the dialog owns the options and the export.
 */
export function RenovaShareOptionsPanel({
  options,
  onChange,
  canShareFiles,
  exportState,
  hasPendingData,
  onShare,
  onDownload,
}: {
  options: RenovaShareOptions;
  onChange: (options: RenovaShareOptions) => void;
  /** Whether this browser can hand a file to the native share sheet. */
  canShareFiles: boolean;
  exportState: ExportState;
  /** True when the case is missing data the card would show as "Pendiente". */
  hasPendingData: boolean;
  onShare: () => void;
  onDownload: () => void;
}) {
  const generating = exportState.kind === "generating";

  return (
    <aside aria-label="Preparar para compartir" className="flex flex-col gap-5 rounded-xl border p-4">
      <h3 className="text-sm font-medium">Preparar para compartir</h3>

      <div className="flex flex-col gap-3">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={options[key]}
              onChange={(event) => onChange({ ...options, [key]: event.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        NSS, número de crédito e imágenes del INE nunca se incluyen.
      </p>

      {hasPendingData && (
        <p className="text-xs text-muted-foreground">Este expediente aún tiene datos incompletos; en la ficha aparecerán como “Pendiente”.</p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onShare} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <Share2 />}
          Compartir imagen
        </Button>
        <Button type="button" variant="outline" onClick={onDownload} disabled={generating}>
          <Download />
          Descargar PNG
        </Button>
        <p className="text-xs text-muted-foreground">
          {canShareFiles
            ? "Se abrirá el menú de compartir de tu dispositivo."
            : "Este navegador no puede compartir imágenes directamente: se descargará el PNG para que lo adjuntes en WhatsApp."}
        </p>
      </div>

      <div aria-live="polite" className="min-h-5 text-sm">
        {exportState.kind === "generating" && <p className="text-muted-foreground">Generando imagen…</p>}
        {exportState.kind === "ready" && <p className="text-emerald-600 dark:text-emerald-400">{exportState.message}</p>}
        {exportState.kind === "error" && (
          <p role="alert" className="text-destructive">
            {exportState.message}
          </p>
        )}
      </div>
    </aside>
  );
}
