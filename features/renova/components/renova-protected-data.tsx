"use client";

import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProtectedData } from "@/features/renova/lib/use-protected-data";

/**
 * The "Mostrar datos protegidos" control shared by the case detail page and
 * the edit popup. It only drives the reveal flow (confirmation → audited fetch
 * → temporary display → hide); the values themselves are shown by whoever
 * renders `protectedData.values`.
 *
 * Nothing sensitive is rendered here — only the confirmation text, the state
 * of the reveal and its errors.
 */
export function ProtectedDataControls({ protectedData }: { protectedData: ProtectedData }) {
  const { state } = protectedData;

  if (state.status === "confirming") {
    return (
      <div role="alertdialog" aria-label="Confirmar consulta de datos protegidos" className="flex flex-col gap-2 rounded-md border p-3 text-sm">
        <p className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          Vas a consultar información personal protegida de este cliente.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void protectedData.confirmReveal()}>
            Sí, mostrar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={protectedData.cancel}>
            Cancelar consulta
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Consultando datos protegidos…
      </p>
    );
  }

  if (state.status === "revealed") {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p role="status" className="text-muted-foreground">
          Datos protegidos visibles temporalmente; se ocultarán en 1 minuto.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={protectedData.hide}>
          <EyeOff />
          Ocultar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="button" size="sm" variant="outline" onClick={protectedData.requestReveal}>
        <Eye />
        Mostrar datos protegidos
      </Button>
    </div>
  );
}
