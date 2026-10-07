"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  FileSignature,
  Flag,
  FolderOpen,
  Home,
  Loader2,
  MapPin,
  PaintRoller,
  Route,
  Search,
  Share2,
  SignpostBig,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import { useTeamMembers } from "@/features/organization/use-team-members";
import { getRenovaOperations, updateRenovaOperation } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import {
  RENOVA_OPERATION_STAGES,
  formatRenovaDateTime,
  formatRenovaMoney,
  formatRenovaOperationStage,
  type RenovaOperationCase,
  type RenovaOperationStage,
  type RenovaOperationStageData,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "loading"; stages: null; error: null }
  | { status: "error"; stages: null; error: string }
  | { status: "success"; stages: RenovaOperationStageData[]; error: null };

const STAGE_ICONS: Record<RenovaOperationStage, typeof Home> = {
  proposal_accepted: Check,
  site_survey: Route,
  notary_contract: FileSignature,
  renovation: PaintRoller,
  for_sale: SignpostBig,
  buyer_closing: FileSignature,
  owner_settlement: CalendarClock,
  closed: Flag,
};

function localDateTimeValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addressLabel(item: RenovaOperationCase): string {
  return [item.street_address, item.neighborhood, item.municipality].filter(Boolean).join(" · ") || "Dirección pendiente";
}

function dueLabel(value: string | null): string {
  if (!value) return "Sin fecha programada";
  return formatRenovaDateTime(value);
}

export function RenovaOperationsMap({
  refreshKey = 0,
  onOpen,
  onShare,
}: {
  refreshKey?: number;
  onOpen?: (caseId: string) => void;
  onShare?: (caseId: string) => void;
}) {
  const { user } = useUser();
  const members = useTeamMembers();
  const [load, setLoad] = useState<LoadState>({ status: "loading", stages: null, error: null });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RenovaOperationCase | null>(null);
  const [stage, setStage] = useState<RenovaOperationStage>("proposal_accepted");
  const [nextAction, setNextAction] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRenovaOperations().then((response) => {
      if (cancelled) return;
      setLoad(
        response.ok
          ? { status: "success", stages: response.data.stages, error: null }
          : { status: "error", stages: null, error: getRenovaErrorMessage(response.error) }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredStages = useMemo(() => {
    if (load.status !== "success") return [];
    const term = query.trim().toLowerCase();
    if (!term) return load.stages;
    return load.stages.map((group) => ({
      ...group,
      cases: group.cases.filter((item) =>
        [item.owner_name, item.owner_phone, item.street_address, item.neighborhood, item.municipality]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term))
      ),
    }));
  }, [load, query]);

  const total = load.status === "success" ? load.stages.reduce((sum, group) => sum + group.cases.length, 0) : 0;
  const visibleTotal = filteredStages.reduce((sum, group) => sum + group.cases.length, 0);
  const activeStageIndex = RENOVA_OPERATION_STAGES.indexOf(stage);

  function openRoute(item: RenovaOperationCase) {
    setSelected(item);
    setStage(item.operation_stage);
    setNextAction(item.operation_next_action ?? "");
    setDueAt(localDateTimeValue(item.operation_due_at));
    setActionError(null);
  }

  async function saveOperation() {
    if (!selected || !nextAction.trim()) {
      setActionError("Escribe el siguiente paso de esta propiedad.");
      return;
    }
    setSaving(true);
    setActionError(null);
    const response = await updateRenovaOperation(selected.id, {
      operation_stage: stage,
      operation_next_action: nextAction.trim(),
      operation_due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setSaving(false);
    if (!response.ok) {
      setActionError(getRenovaErrorMessage(response.error));
      return;
    }
    setLoad((current) => {
      if (current.status !== "success") return current;
      return {
        status: "success",
        error: null,
        stages: current.stages.map((group) => ({
          ...group,
          cases:
            group.stage === response.data.operation_stage
              ? [response.data, ...group.cases.filter((item) => item.id !== response.data.id)]
              : group.cases.filter((item) => item.id !== response.data.id),
        })),
      };
    });
    setSelected(response.data);
  }

  if (load.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 py-20 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Cargando operaciones Retify…</p>
      </div>
    );
  }

  if (load.status === "error") {
    return <div className="rounded-2xl border border-border/70 p-6"><FormError message={load.error} /></div>;
  }

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/70">
        <EmptyState
          icon={Route}
          title="Aún no hay propiedades en operación"
          description="Cuando una propuesta pase a Aceptado, la propiedad aparecerá aquí automáticamente y comenzará su ruta operativa."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border/70 bg-card/55 p-4" aria-label="Ruta completa de una operación">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-heading text-base font-medium">Ruta completa</h2><p className="text-xs text-muted-foreground">De la propuesta aceptada a la liquidación del propietario.</p></div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{total} operaciones</span>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-y-5 lg:grid-cols-8">
          {load.stages.map((group, index) => {
            const Icon = STAGE_ICONS[group.stage];
            return (
              <div key={group.stage} className="relative min-w-0 text-center">
                <div className={cn("absolute top-4 h-0.5 bg-border", index === 0 ? "left-1/2" : "left-0", index === RENOVA_OPERATION_STAGES.length - 1 ? "right-1/2" : "right-0")} />
                <div className={cn("relative mx-auto flex size-8 items-center justify-center rounded-full border-4 border-card bg-muted text-muted-foreground", group.cases.length > 0 && "bg-primary text-primary-foreground")}><Icon className="size-3.5" aria-hidden="true" /></div>
                <p className="mt-2 truncate px-1 text-[11px] font-medium" title={formatRenovaOperationStage(group.stage)}>{formatRenovaOperationStage(group.stage)}</p>
                <span className="mt-1 inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{group.cases.length}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, dirección o colonia…" aria-label="Buscar operaciones Retify" className="h-10 rounded-xl bg-background/45 pl-9" />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">{visibleTotal === total ? `${total} propiedades` : `${visibleTotal} de ${total} propiedades`}</p>
      </div>

      {visibleTotal === 0 ? (
        <div className="rounded-2xl border border-border/70"><EmptyState icon={Search} title="No encontramos esa propiedad" description="Prueba con otro nombre, teléfono, calle o colonia." /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredStages.filter((group) => group.cases.length > 0).map((group) => (
            <section key={group.stage} className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="flex items-center justify-between rounded-2xl bg-muted/65 p-4 lg:flex-col lg:items-start">
                <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Etapa {String(RENOVA_OPERATION_STAGES.indexOf(group.stage) + 1).padStart(2, "0")}</p><h3 className="mt-1 text-sm font-medium">{formatRenovaOperationStage(group.stage)}</h3></div>
                <span className="text-2xl font-medium tabular-nums">{String(group.cases.length).padStart(2, "0")}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.cases.map((item) => {
                  const progress = ((RENOVA_OPERATION_STAGES.indexOf(item.operation_stage) + 1) / RENOVA_OPERATION_STAGES.length) * 100;
                  const overdue = item.operation_due_at ? new Date(item.operation_due_at).getTime() < Date.now() && item.operation_stage !== "closed" : false;
                  return (
                    <article key={item.id} className="group rounded-2xl border border-border/70 bg-background/75 p-3.5 shadow-sm transition-colors hover:border-primary/35 hover:bg-background">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Home className="size-4" aria-hidden="true" /></div>
                        <button type="button" onClick={() => onOpen?.(item.id)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-sm font-medium transition-colors group-hover:text-primary">{item.owner_name}</span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" />{addressLabel(item)}</span>
                        </button>
                        {overdue && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">Vencido</span>}
                      </div>
                      <div className="mt-3 rounded-xl bg-muted/55 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Siguiente paso</p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium">{item.operation_next_action || "Definir siguiente acción"}</p>
                        <p className={cn("mt-1.5 text-[10px] text-muted-foreground", overdue && "text-destructive")}>{dueLabel(item.operation_due_at)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>Asesor: {advisorLabel(item.assigned_user_id, user?.id, members)}</span><span>{RENOVA_OPERATION_STAGES.indexOf(item.operation_stage) + 1}/8</span></div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                      {item.final_offer && <p className="mt-2 text-[11px] text-muted-foreground">Propuesta: <span className="font-medium text-foreground">{formatRenovaMoney(item.final_offer, item.currency)}</span></p>}
                      <div className="mt-3 flex gap-1 border-t border-border/60 pt-2.5">
                        <Button type="button" variant="ghost" size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={() => openRoute(item)}><Route /> Ver ruta</Button>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Compartir ficha de ${item.owner_name}`} onClick={() => onShare?.(item.id)}><Share2 /></Button>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Abrir expediente de ${item.owner_name}`} onClick={() => onOpen?.(item.id)}><FolderOpen /></Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && !saving && setSelected(null)}>
        <SheetContent className="w-[94vw] overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border/70 pr-12">
            <SheetTitle>{selected?.owner_name ?? "Ruta de la propiedad"}</SheetTitle>
            <SheetDescription>{selected ? addressLabel(selected) : "Seguimiento operativo"}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="flex flex-col gap-5 px-4 pb-4">
              {actionError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2"><FormError message={actionError} /></div>}
              <div className="rounded-xl bg-primary/10 p-3"><p className="text-[10px] uppercase tracking-[0.1em] text-primary">Etapa actual</p><p className="mt-1 text-sm font-medium">{formatRenovaOperationStage(stage)}</p><p className="mt-1 text-xs text-muted-foreground">{nextAction || "Define el siguiente paso"}</p></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="operation-stage">Etapa de la operación</Label><Select value={stage} onValueChange={(value) => value && setStage(value as RenovaOperationStage)}><SelectTrigger id="operation-stage"><SelectValue>{(value: string | null) => value ? formatRenovaOperationStage(value as RenovaOperationStage) : "Selecciona"}</SelectValue></SelectTrigger><SelectContent>{RENOVA_OPERATION_STAGES.map((item) => <SelectItem key={item} value={item}>{formatRenovaOperationStage(item)}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="operation-next-action">Siguiente paso</Label><Textarea id="operation-next-action" value={nextAction} maxLength={500} onChange={(event) => setNextAction(event.target.value)} placeholder="Ej. Firmar carta poder en Notaría 139" /><p className="text-right text-[10px] text-muted-foreground">{nextAction.length}/500</p></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="operation-due-at">Fecha y hora</Label><Input id="operation-due-at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Recorrido completo</h3>
                <div className="mt-3">
                  {RENOVA_OPERATION_STAGES.map((item, index) => {
                    const done = index < activeStageIndex;
                    const current = index === activeStageIndex;
                    return (
                      <div key={item} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0">
                        {index < RENOVA_OPERATION_STAGES.length - 1 && <div className="absolute top-6 bottom-0 left-[0.83rem] w-px bg-border" />}
                        <div className={cn("relative z-10 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground", done && "bg-primary text-primary-foreground", current && "bg-amber-500 text-white ring-4 ring-amber-500/15")}>
                          {done ? <Check className="size-3.5" /> : current ? <ChevronRight className="size-3.5" /> : <Circle className="size-3" />}
                        </div>
                        <div className="pt-1"><p className={cn("text-xs", current && "font-medium text-foreground", !current && !done && "text-muted-foreground")}>{formatRenovaOperationStage(item)}</p>{current && <p className="mt-0.5 text-[10px] text-muted-foreground">En proceso</p>}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <SheetFooter className="border-t border-border/70 bg-background/80">
            <Button disabled={saving || !nextAction.trim()} onClick={saveOperation}>{saving ? <><Loader2 className="animate-spin" /> Guardando…</> : "Guardar avance"}</Button>
            <Button variant="outline" onClick={() => selected && onOpen?.(selected.id)}>Abrir expediente</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
