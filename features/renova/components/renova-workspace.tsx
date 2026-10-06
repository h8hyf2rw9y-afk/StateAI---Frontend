"use client";

import { useState } from "react";
import { LayoutGrid, List, Route, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RenovaCasesTable } from "@/features/renova/components/renova-cases-table";
import { RenovaLeadsBoard } from "@/features/renova/components/renova-leads-board";
import { RenovaOperationsMap } from "@/features/renova/components/renova-operations-map";
import { cn } from "@/lib/utils";

type Section = "leads" | "operations";
type LeadsMode = "visual" | "table";

export function RenovaWorkspace({
  refreshKey = 0,
  onEdit,
  onShare,
}: {
  refreshKey?: number;
  onEdit?: (caseId: string) => void;
  onShare?: (caseId: string) => void;
}) {
  const [section, setSection] = useState<Section>("leads");
  const [leadsMode, setLeadsMode] = useState<LeadsMode>("visual");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit rounded-xl bg-muted/65 p-1" role="radiogroup" aria-label="Área Renova">
          <Button type="button" role="radio" aria-checked={section === "leads"} variant="ghost" size="sm" className={cn("rounded-lg", section === "leads" && "bg-background text-foreground shadow-sm hover:bg-background")} onClick={() => setSection("leads")}><Users /> Leads</Button>
          <Button type="button" role="radio" aria-checked={section === "operations"} variant="ghost" size="sm" className={cn("rounded-lg", section === "operations" && "bg-background text-foreground shadow-sm hover:bg-background")} onClick={() => setSection("operations")}><Route /> Operaciones</Button>
        </div>
        {section === "leads" && (
          <div className="flex w-fit rounded-lg border border-border/70 p-0.5" role="radiogroup" aria-label="Presentación de leads">
            <Button type="button" role="radio" aria-checked={leadsMode === "visual"} variant="ghost" size="sm" className={cn("h-7 rounded-md px-2.5 text-xs", leadsMode === "visual" && "bg-primary/10 text-foreground")} onClick={() => setLeadsMode("visual")}><LayoutGrid /> Visual</Button>
            <Button type="button" role="radio" aria-checked={leadsMode === "table"} variant="ghost" size="sm" className={cn("h-7 rounded-md px-2.5 text-xs", leadsMode === "table" && "bg-primary/10 text-foreground")} onClick={() => setLeadsMode("table")}><List /> Lista detallada</Button>
          </div>
        )}
      </div>

      <div className="animate-enter">
        {section === "leads" && leadsMode === "visual" && <RenovaLeadsBoard refreshKey={refreshKey} onEdit={onEdit} onShare={onShare} />}
        {section === "leads" && leadsMode === "table" && <RenovaCasesTable refreshKey={refreshKey} onEdit={onEdit} onShare={onShare} />}
        {section === "operations" && <RenovaOperationsMap refreshKey={refreshKey} onOpen={onEdit} onShare={onShare} />}
      </div>
    </div>
  );
}
