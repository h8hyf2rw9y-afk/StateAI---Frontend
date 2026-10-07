"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { RenovaOperationsMap } from "@/features/renova/components/renova-operations-map";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";

/** Dedicated Retify surface for the post-acceptance property operation. */
export function RetifyOperationsWorkspace() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [shareCaseId, setShareCaseId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setCaseId(null);
    setRefreshKey((value) => value + 1);
  }

  return (
    <>
      <PageHeader
        title="Operaciones Retify"
        description="Propiedades con propuesta aceptada: levantamiento, notaría, remodelación, venta y liquidación."
      />
      <RenovaOperationsMap
        refreshKey={refreshKey}
        onOpen={(id) => setCaseId(id)}
        onShare={(id) => setShareCaseId(id)}
      />

      {caseId && (
        <RenovaCaseDialog
          caseId={caseId}
          onClose={() => setCaseId(null)}
          onSaved={handleSaved}
          onShare={(id) => setShareCaseId(id)}
        />
      )}
      {shareCaseId && (
        <RenovaShareDialog
          key={shareCaseId}
          caseId={shareCaseId}
          onClose={() => setShareCaseId(null)}
        />
      )}
    </>
  );
}
