"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleDot, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { OpportunityForm } from "@/features/pipeline/components/opportunity-form";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";
import { PIPELINE_VIEWS, PIPELINE_VIEW_LABELS, parsePipelineView, type PipelineView } from "@/features/pipeline/views";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { RenovaPipelineBoard } from "@/features/renova/components/renova-pipeline-board";
import type { RenovaCase } from "@/features/renova/types";

const DESCRIPTIONS: Record<PipelineView, string> = {
  crm: "Every open opportunity, organized by sales stage.",
  renova: "Expedientes Renova en el flujo de compra, de Nuevo a Comprado.",
};

/**
 * The Pipeline page's client shell: two completely independent boards behind
 * one URL-persisted toggle (`?view=`) — same pattern as
 * features/leads/components/leads-workspace.tsx. Only the ACTIVE view's board
 * is mounted, so the traditional Opportunity pipeline never calls the Renova
 * API and vice versa; a RenovaCase created here is still never a Contact or
 * an Opportunity.
 */
export function PipelineWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parsePipelineView(searchParams.get("view"));
  const [renovaDialogOpen, setRenovaDialogOpen] = useState(false);
  const [renovaBoardKey, setRenovaBoardKey] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  function handleViewChange(next: string | number | null) {
    const nextView = parsePipelineView(typeof next === "string" ? next : null);
    if (nextView !== view) router.push(`/pipeline?view=${nextView}`);
  }

  function handleRenovaSaved(_renovaCase: RenovaCase, intent: "draft" | "prospect") {
    setRenovaDialogOpen(false);
    setRenovaBoardKey((n) => n + 1);
    setSaved(intent === "draft" ? "Borrador guardado." : "Prospecto guardado.");
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={DESCRIPTIONS[view]}
        actions={
          view === "renova" ? (
            <Button onClick={() => setRenovaDialogOpen(true)}>
              <Plus />
              Nuevo prospecto Renova
            </Button>
          ) : (
            <OpportunityForm
              trigger={
                <Button>
                  <Plus />
                  New opportunity
                </Button>
              }
            />
          )
        }
      />

      {saved && view === "renova" && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            {saved}
          </span>
          <button type="button" aria-label="Cerrar aviso" className="ml-auto" onClick={() => setSaved(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 overflow-x-auto px-1">
            <GooeyNav
              aria-label="Vistas de pipeline"
              size="sm"
              items={PIPELINE_VIEWS.map((v) => PIPELINE_VIEW_LABELS[v])}
              value={PIPELINE_VIEWS.indexOf(view)}
              onChange={(index) => handleViewChange(PIPELINE_VIEWS[index])}
            />
          </div>
          <div className="hidden items-center gap-2 pr-1 text-[11px] text-muted-foreground sm:flex">
            <CircleDot className="size-3 text-emerald-400" aria-hidden="true" />
            {view === "renova" ? "Expedientes independientes" : "CRM conectado"}
          </div>
        </div>

        {view === "crm" && <PipelineBoard />}
        {view === "renova" && <RenovaPipelineBoard key={renovaBoardKey} />}
      </div>

      {renovaDialogOpen && <RenovaCaseDialog onClose={() => setRenovaDialogOpen(false)} onSaved={handleRenovaSaved} />}
    </>
  );
}
