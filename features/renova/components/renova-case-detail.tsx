"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FolderOpen, Loader2, Pencil, Share2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { ProtectedDataControls } from "@/features/renova/components/renova-protected-data";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import { renovaShortId } from "@/features/renova/lib/short-id";
import { useProtectedData } from "@/features/renova/lib/use-protected-data";
import {
  RENOVA_STATUSES,
  formatRenovaDate,
  formatRenovaDateTime,
  formatRenovaDeeds,
  formatRenovaDwellingWithDuplex,
  formatRenovaHistoryAction,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaOccupancy,
  formatRenovaPropertyTaxDebt,
  formatRenovaStatus,
  getRenovaStatusClassName,
  type RenovaCase,
  type RenovaHistoryEntry,
} from "@/features/renova/types";
import { getRenovaCase, getRenovaHistory, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; renovaCase: RenovaCase };

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2 lg:col-span-3")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-wrap">{empty ? "—" : children}</dd>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

/**
 * The detail view of one Renova case (the page a table row opens): owner,
 * status, advisor, date, address, property, money, motivation and history,
 * with the actions Editar (the same popup as creation, in edit mode), Cambiar
 * estado and Ver ficha para compartir.
 *
 * Everything shown is the real saved case from the backend. NSS and número de
 * crédito appear masked ("•••••••4821") until the person chooses "Mostrar datos
 * protegidos": that asks for confirmation, calls the audited endpoint, shows
 * the full values in memory for about a minute and drops them again on
 * "Ocultar", on timeout, when the editor opens and when the page is left. The
 * history lists WHAT happened and WHEN — never the audit rows' data.
 */
export function RenovaCaseDetail({ caseId }: { caseId: string }) {
  const { user } = useUser();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [history, setHistory] = useState<RenovaHistoryEntry[]>([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const protectedData = useProtectedData(caseId);

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

  useEffect(() => {
    let cancelled = false;
    getRenovaHistory(caseId).then((response) => {
      if (!cancelled && response.ok) setHistory(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, historyKey]);

  function applySaved(saved: RenovaCase) {
    setLoad({ status: "ready", renovaCase: saved });
    setHistoryKey((key) => key + 1);
  }

  async function handleStatusChange(next: string | null) {
    if (load.status !== "ready" || !next || next === load.renovaCase.status || changingStatus) return;
    setChangingStatus(true);
    setActionError(null);
    setNotice(null);
    const response = await updateRenovaCase(caseId, { status: next });
    setChangingStatus(false);
    if (!response.ok) {
      setActionError(getRenovaErrorMessage(response.error));
      return;
    }
    applySaved(response.data);
    setNotice(`Estado actualizado a “${formatRenovaStatus(next)}”.`);
  }

  const c = load.status === "ready" ? load.renovaCase : null;
  const money = (value: string | null) => (c ? formatRenovaMoney(value, c.currency) : "—");

  return (
    <>
      <Link href="/leads?view=renova" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a Renova
      </Link>

      {load.status === "loading" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Cargando expediente…</p>
        </div>
      )}

      {load.status === "error" && (
        <div className="rounded-xl border p-6">
          <FormError message={load.message} />
        </div>
      )}

      {c && (
        <>
          <PageHeader
            title={c.owner_name}
            description={`${renovaShortId(c.id)} · ${advisorLabel(c.assigned_user_id, user?.id)} · Ingreso ${formatRenovaDate(c.entry_date)}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border-transparent", getRenovaStatusClassName(c.status))}>
                  {formatRenovaStatus(c.status)}
                </Badge>
                <Select value={c.status} onValueChange={handleStatusChange}>
                  <SelectTrigger size="sm" aria-label="Cambiar estado" disabled={changingStatus}>
                    <SelectValue>{() => "Cambiar estado"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RENOVA_STATUSES.filter((s) => s !== "draft" || c.status === "draft").map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatRenovaStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    protectedData.hide();
                    setEditing(true);
                  }}
                >
                  <Pencil />
                  Editar
                </Button>
                <Button size="sm" onClick={() => setSharing(true)}>
                  <Share2 />
                  Ver ficha para compartir
                </Button>
              </div>
            }
          />

          {notice && (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
          {actionError && (
            <div className="mb-4">
              <FormError message={actionError} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Propietario" contentClassName="gap-3">
              <Grid>
                <Row label="Nombre completo del titular">{c.owner_name}</Row>
                <Row label="Celular del titular">{c.owner_phone}</Row>
                <Row label="Estado civil al adquirir el inmueble">{c.marital_status ? formatRenovaMaritalStatus(c.marital_status) : null}</Row>
                <Row label="Nombre completo del cónyuge">{c.spouse_name}</Row>
                <Row label="Celular del cónyuge">{c.spouse_phone}</Row>
                <Row label="NSS">
                  <span data-testid="nss-display" className="font-mono tracking-wide">
                    {protectedData.values?.nss ?? c.nss_masked ?? "No registrado"}
                  </span>
                </Row>
                <Row label="Número de crédito">
                  <span data-testid="credit-number-display" className="font-mono tracking-wide">
                    {protectedData.values?.credit_number ?? c.credit_number_masked ?? "No registrado"}
                  </span>
                </Row>
              </Grid>
              {(c.has_nss || c.has_credit_number) && (
                <div className="pt-2">
                  <ProtectedDataControls protectedData={protectedData} />
                </div>
              )}
            </SectionCard>

            <SectionCard title="Ubicación e inmueble" contentClassName="gap-3">
              <Grid>
                <Row label="Calle y número" wide>
                  {c.street_address}
                </Row>
                <Row label="Colonia">{c.neighborhood}</Row>
                <Row label="Municipio">{c.municipality}</Row>
                <Row label="Código postal">{c.postal_code}</Row>
                <Row label="Tipo de vivienda">{formatRenovaDwellingWithDuplex(c.dwelling_type, c.is_duplex)}</Row>
                <Row label="Plantas">{c.floors}</Row>
                <Row label="Baños">{c.bathrooms}</Row>
                <Row label="Recámaras">{c.bedrooms}</Row>
                <Row label="Situación actual">{c.occupancy_status ? formatRenovaOccupancy(c.occupancy_status) : null}</Row>
                <Row label="Escrituras">{formatRenovaDeeds(c.has_deeds)}</Row>
                <Row label="A nombre de">{c.deeds_holder_name}</Row>
                <Row label="Condiciones de la casa" wide>
                  {c.conditions}
                </Row>
              </Grid>
            </SectionCard>

            <SectionCard title="Información financiera" contentClassName="gap-3">
              <Grid>
                <Row label="Propuesta final">{money(c.final_offer)}</Row>
                <Row label="Valor de mercado">{money(c.market_value)}</Row>
                <Row label="Cuánto espera recibir">{money(c.owner_expected_amount)}</Row>
                <Row label="Deuda predial">{formatRenovaPropertyTaxDebt(c.property_tax_debt, c.property_tax_debt_unit, c.currency) ?? "—"}</Row>
                <Row label="Adeudo">{money(c.other_debt)}</Row>
                <Row label="Deuda de agua">{money(c.water_debt)}</Row>
                <Row label="Deuda de luz">{money(c.electricity_debt)}</Row>
                <Row label="Deuda de gas">{money(c.gas_debt)}</Row>
                <Row label="Total estimado de adeudos">{money(c.total_debt)}</Row>
                <Row label="A quién se debe">{c.debt_owed_to}</Row>
              </Grid>
            </SectionCard>

            <SectionCard title="Motivación y comentarios" contentClassName="gap-3">
              <Grid>
                <Row label="¿Por qué la quiere vender?" wide>
                  {c.sale_reason}
                </Row>
                <Row label="Comentarios generales" wide>
                  {c.general_situation}
                </Row>
                <Row label="Notas adicionales o contexto de la conversación" wide>
                  {c.notes}
                </Row>
              </Grid>
            </SectionCard>

            <SectionCard title="Historial" className="xl:col-span-2">
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
          </div>
        </>
      )}

      {editing && (
        <RenovaCaseDialog
          caseId={caseId}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            applySaved(saved);
            setNotice("Cambios guardados.");
            setActionError(null);
          }}
        />
      )}
      {sharing && <RenovaShareDialog caseId={caseId} onClose={() => setSharing(false)} />}
    </>
  );
}
