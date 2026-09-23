"use client";

import { Download, Loader2, Share2 } from "lucide-react";
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
  { key: "includeIdentifiers", label: "Incluir NSS y número de crédito" },
  { key: "includeIne", label: "Incluir imágenes del INE" },
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
  onIneUpload,
  loadingProtected,
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
  onIneUpload?: (side: "front" | "back", file: File) => void;
  loadingProtected?: boolean;
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

      <p className="text-xs text-muted-foreground">Estos datos se incluirán únicamente al activar sus opciones. Revisa la vista previa antes de compartir.</p>
      <div className="flex flex-col gap-2 text-xs">
        {(["front", "back"] as const).map((side) => (
          <label key={side}>Guardar INE {side === "front" ? "frente" : "reverso"} (JPEG, PNG o WebP; máximo 2 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onIneUpload?.(side, file);
              event.target.value = "";
            }} />
          </label>
        ))}
      </div>

      {hasPendingData && (
        <p className="text-xs text-muted-foreground">Este expediente aún tiene datos incompletos; en la ficha aparecerán como “Pendiente”.</p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onShare} disabled={generating || loadingProtected}>
          {generating ? <Loader2 className="animate-spin" /> : <Share2 />}
          Compartir imagen
        </Button>
        <Button type="button" variant="outline" onClick={onDownload} disabled={generating || loadingProtected}>
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
