"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactForm } from "@/features/leads/components/contact-form";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { RenovaCaseForm } from "@/features/renova/components/renova-case-form";
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
 * Only the ACTIVE tab's panel is mounted (Base UI unmounts inactive panels),
 * which is what guarantees Todos / Clientes activos never touch the Renova
 * API and Renova never touches the Contacts API — each side fetches only
 * when its own tab is showing.
 *
 * "Add lead" (Todos, Clientes activos) is the unchanged Contact form;
 * "Nuevo prospecto Renova" opens only the Renova form, which creates a
 * RenovaCase, never a Contact.
 */
export function LeadsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseLeadsView(searchParams.get("view"));
  // Bumped after a Renova case is created so the table reloads.
  const [renovaRefresh, setRenovaRefresh] = useState(0);

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
            <RenovaCaseForm
              onSaved={() => setRenovaRefresh((n) => n + 1)}
              trigger={
                <Button>
                  <Plus />
                  Nuevo prospecto Renova
                </Button>
              }
            />
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

      <Tabs value={view} onValueChange={handleViewChange} className="gap-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList aria-label="Vistas de leads">
            {LEADS_VIEWS.map((v) => (
              <TabsTrigger key={v} value={v} className="px-3">
                {LEADS_VIEW_LABELS[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all">
          <LeadsTable view="all" />
        </TabsContent>
        <TabsContent value="active">
          <LeadsTable view="active" />
        </TabsContent>
        <TabsContent value="renova">
          <RenovaCasesTable refreshKey={renovaRefresh} />
        </TabsContent>
      </Tabs>
    </>
  );
}
