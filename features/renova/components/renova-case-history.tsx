"use client";

import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { formatRenovaDateTime, formatRenovaHistoryAction, type RenovaHistoryEntry } from "@/features/renova/types";
import { getRenovaHistory } from "@/lib/api/renova";

/**
 * "Historial" for one Renova case — WHAT happened and WHEN, never the audit
 * rows' before/after data. Shared by the detail page and the edit popup (see
 * RenovaCaseDialog) so both read it from the same place; `refreshKey`
 * refetches after a save without the caller needing to know this
 * component's internals.
 */
export function RenovaCaseHistory({
  caseId,
  refreshKey = 0,
  className,
}: {
  caseId: string;
  refreshKey?: number;
  className?: string;
}) {
  const [history, setHistory] = useState<RenovaHistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getRenovaHistory(caseId).then((response) => {
      if (!cancelled && response.ok) setHistory(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, refreshKey]);

  return (
    <SectionCard title="Historial" className={className}>
      {history.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Sin movimientos registrados" description="Los cambios importantes del expediente aparecerán aquí." />
      ) : (
        <ol className="flex flex-col gap-2">
          {history.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-4 text-sm">
              <span>{formatRenovaHistoryAction(entry.action)}</span>
              <span className="text-muted-foreground">{formatRenovaDateTime(entry.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
