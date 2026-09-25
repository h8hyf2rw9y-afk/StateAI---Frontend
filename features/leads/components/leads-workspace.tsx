"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleDot, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { ContactForm } from "@/features/leads/components/contact-form";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";
import type { RenovaCase } from "@/features/renova/types";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import { LEADS_VIEWS, LEADS_VIEW_LABELS, parseLeadsView, type LeadsView } from "@/features/leads/views";

const DESCRIPTIONS: Record<LeadsView, string> = {
  all: "Every contact in your organization's CRM.",
  active: "Clients with an open opportunity or a live buyer search.",
  renova: "Expedientes Renova — evaluación de compra para flipping, separados de tus contactos.",
};

/**
 * The Leads page's client shell: three tabs (Todos / Clientes activos /
 * Renova) whose selection lives in the URL (`?view=`), plus the header
 * button that changes with the tab.
 *
 * Selecting a tab is a `router.push`, so each view is its own history entry
 * (back/forward work) and the URL is shareable; the view is always derived
 * from the URL, never from separate state, so the two can't drift.
 *
 * Only the ACTIVE view's panel is mounted (plain conditional rendering below,
 * since the tab switcher itself — GooeyNav — is a nav control, not a
 * content-swapping primitive), which is what guarantees Todos / Clientes
 * activos never touch the Renova API and Renova never touches the Contacts
 * API — each side fetches only when its own tab is showing.
 *
 * "Add lead" (Todos, Clientes activos) is the unchanged Contact form;
 * "Nuevo prospecto Renova" opens only the Renova popup (RenovaCaseDialog),
 * which creates a RenovaCase, never a Contact. The popup is also what the
 * table's "Editar" opens, in edit mode. After a save it closes, the table
 * reloads. Every row has its own share action.
 */
export function LeadsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseLeadsView(searchParams.get("view"));
  // Bumped after a Renova case is created so the table reloads.
  const [renovaRefresh, setRenovaRefresh] = useState(0);
  const [renovaDialog, setRenovaDialog] = useState<{ caseId?: string } | null>(null);
  const [shareCaseId, setShareCaseId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function handleRenovaSaved(_renovaCase: RenovaCase, intent: "draft" | "prospect") {
    const wasEdit = renovaDialog?.caseId !== undefined;
    setRenovaDialog(null);
    setRenovaRefresh((n) => n + 1);
    setSaved(intent === "draft" ? "Borrador guardado." : wasEdit ? "Cambios guardados." : "Prospecto guardado.");
  }

  function handleViewChange(next: string | number | null) {
    const nextView = parseLeadsView(typeof next === "string" ? next : null);
    if (nextView !== view) router.push(`/leads?view=${nextView}`);
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description={DESCRIPTIONS[view]}
        actions={
          view === "renova" ? (
            <Button onClick={() => setRenovaDialog({})}>
              <Plus />
              Nuevo prospecto Renova
            </Button>
          ) : (
            <ContactForm
              trigger={
                <Button>
                  <Plus />
                  Add lead
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

      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-card/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 overflow-x-auto px-1">
            <GooeyNav
              aria-label="Vistas de leads"
              size="sm"
              items={LEADS_VIEWS.map((v) => LEADS_VIEW_LABELS[v])}
              value={LEADS_VIEWS.indexOf(view)}
              onChange={(index) => handleViewChange(LEADS_VIEWS[index])}
            />
          </div>
          <div className="hidden items-center gap-2 pr-1 text-[11px] text-muted-foreground sm:flex">
            <CircleDot className="size-3 text-emerald-400" aria-hidden="true" />
            {view === "renova" ? "Expedientes independientes" : "CRM conectado"}
          </div>
        </div>

        <div className="animate-enter">
          {view === "all" && <LeadsTable view="all" />}
          {view === "active" && <LeadsTable view="active" />}
          {view === "renova" && <RenovaCasesTable refreshKey={renovaRefresh} onEdit={(caseId) => setRenovaDialog({ caseId })} onShare={(caseId) => setShareCaseId(caseId)} />}
        </div>
      </div>

      {renovaDialog && (
        <RenovaCaseDialog caseId={renovaDialog.caseId} onClose={() => setRenovaDialog(null)} onSaved={handleRenovaSaved} />
      )}
      {shareCaseId && <RenovaShareDialog key={shareCaseId} caseId={shareCaseId} onClose={() => setShareCaseId(null)} />}
    </>
  );
}
