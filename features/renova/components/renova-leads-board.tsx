"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Ban,
  Building2,
  FolderOpen,
  ListFilter,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { RenovaFollowUpPopover } from "@/features/renova/components/renova-follow-up-popover";
import { isRenovaOnly } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useTeamMembers } from "@/features/organization/use-team-members";
import { getRenovaCaseCounts, getRenovaCases, updateRenovaCase } from "@/lib/api/renova";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import { useUser } from "@/hooks/useUser";
import {
  RENOVA_CASE_BUCKETS,
  RENOVA_STATUSES,
  formatRenovaCaseBucket,
  formatRenovaDateTime,
  formatRenovaMoney,
  formatRenovaStatus,
  getRenovaStatusClassName,
  type RenovaCaseBucket,
  type RenovaCaseBucketCounts,
  type RenovaCaseListItem,
  type RenovaFollowUpSummary,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

type ActionRequest = { kind: "archive" | "reactivate" | "restore"; item: RenovaCaseListItem };

const ACTIVE_STAGE_ORDER = RENOVA_STATUSES.filter((stage) => !["rejected", "cancelled"].includes(stage));
const SEARCH_DEBOUNCE_MS = 300;

function addressLabel(item: RenovaCaseListItem): string {
  return [item.street_address, item.neighborhood, item.municipality].filter(Boolean).join(" · ") || "Dirección pendiente";
}

const EMPTY_FOLLOW_UP: RenovaFollowUpSummary = {
  last_call_activity_id: null,
  last_call_at: null,
  last_result: null,
  contact_attempt_count: 0,
  next_follow_up_at: null,
  is_follow_up_overdue: false,
  contact_state: "never_contacted",
  note_preview: null,
};

function followUpLabel(followUp: RenovaFollowUpSummary): string {
  if (followUp.next_follow_up_at) {
    const attempts = followUp.contact_attempt_count > 0 ? ` · ${followUp.contact_attempt_count} intentos` : "";
    return `${followUp.is_follow_up_overdue ? "Vencido" : "Próximo"}: ${formatRenovaDateTime(followUp.next_follow_up_at)}${attempts}`;
  }
  if (followUp.contact_attempt_count === 0) return "Aún no se ha registrado una llamada";
  if (followUp.last_result === "no_answer") return `No contestó · ${followUp.contact_attempt_count} intentos`;
  if (followUp.last_result === "interested") return "Cliente interesado · definir siguiente paso";
  if (followUp.last_result === "callback_requested") return "Pidió que le vuelvan a llamar";
  if (followUp.last_result === "not_interested") return "Indicó que no le interesa continuar";
  return "Revisar seguimiento";
}

export function RenovaLeadsBoard({
  refreshKey = 0,
  onEdit,
  onShare,
}: {
  refreshKey?: number;
  onEdit?: (caseId: string) => void;
  onShare?: (caseId: string) => void;
}) {
  const { user } = useUser();
  const { me } = useCurrentUser();
  const renovaOnly = isRenovaOnly(me?.role);
  const members = useTeamMembers();
  const teammates = members.filter((member) => member.id !== user?.id);
  const [bucket, setBucket] = useState<RenovaCaseBucket>("active");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [items, setItems] = useState<RenovaCaseListItem[] | null>(null);
  const [counts, setCounts] = useState<RenovaCaseBucketCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [action, setAction] = useState<ActionRequest | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    getRenovaCases({
      bucket,
      q: debouncedQuery,
      status: statusFilter === "all" ? undefined : statusFilter,
      assigned_user_id:
        advisorFilter === "all" ? undefined : advisorFilter === "mine" ? user?.id : advisorFilter,
    }).then((response) => {
      if (cancelled) return;
      if (response.ok) setItems(response.data);
      else setError(getRenovaErrorMessage(response.error));
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, debouncedQuery, statusFilter, advisorFilter, user?.id, refreshKey, localRefresh]);

  useEffect(() => {
    let cancelled = false;
    getRenovaCaseCounts().then((response) => {
      if (!cancelled && response.ok) setCounts(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, localRefresh]);

  const groups = useMemo(() => {
    if (!items) return [];
    if (bucket !== "active") return [{ status: bucket, cases: items }];
    return ACTIVE_STAGE_ORDER.map((status) => ({ status, cases: items.filter((item) => item.status === status) })).filter(
      (group) => group.cases.length > 0
    );
  }, [bucket, items]);

  function updateFollowUp(caseId: string, followUp: RenovaFollowUpSummary) {
    setItems((current) => current?.map((item) => (item.id === caseId ? { ...item, follow_up: followUp } : item)) ?? current);
  }

  async function confirmAction() {
    if (!action) return;
    setActing(true);
    setError(null);
    const payload =
      action.kind === "archive"
        ? { archived: true }
        : action.kind === "restore"
          ? { archived: false }
          : { status: "new" };
    const response = await updateRenovaCase(action.item.id, payload);
    setActing(false);
    setAction(null);
    if (!response.ok) {
      setError(getRenovaErrorMessage(response.error));
      return;
    }
    setLocalRefresh((value) => value + 1);
  }

  const emptyTitle = debouncedQuery
    ? "No encontramos ese expediente"
    : bucket === "closed"
      ? "No hay expedientes rechazados o cancelados"
      : bucket === "archived"
        ? "No hay expedientes archivados"
        : "Aún no hay expedientes Renova";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-border/70 bg-background/45 p-1" role="radiogroup" aria-label="Vista de expedientes">
          {RENOVA_CASE_BUCKETS.map((value) => (
            <Button key={value} type="button" role="radio" aria-checked={bucket === value} variant="ghost" size="sm" className={cn("shrink-0 rounded-lg", bucket === value && "bg-primary/15 text-foreground hover:bg-primary/20")} onClick={() => setBucket(value)}>
              {formatRenovaCaseBucket(value)}
              {counts && <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{counts[value]}</span>}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 xl:ml-auto xl:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar propietario o celular…" aria-label="Buscar expedientes Renova" className="h-10 rounded-xl bg-background/45 pl-9" />
        </div>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" className="h-10 rounded-xl bg-background/45" aria-label="Filtros"><ListFilter /> Filtros</Button>} />
          <PopoverContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="visual-status-filter">Estado</Label><Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}><SelectTrigger id="visual-status-filter"><SelectValue>{(value: string | null) => !value || value === "all" ? "Todos los estados" : formatRenovaStatus(value)}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{RENOVA_STATUSES.map((value) => <SelectItem key={value} value={value}>{formatRenovaStatus(value)}</SelectItem>)}</SelectContent></Select></div>
              {!renovaOnly && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="visual-advisor-filter">Asesor</Label>
                  <Select value={advisorFilter} onValueChange={(value) => setAdvisorFilter(value ?? "all")}>
                    <SelectTrigger id="visual-advisor-filter">
                      <SelectValue>
                        {(value: string | null) =>
                          !value || value === "all"
                            ? "Todos los asesores"
                            : value === "mine"
                              ? "Mis expedientes"
                              : (teammates.find((member) => member.id === value)?.email ?? "Otro asesor")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los asesores</SelectItem>
                      <SelectItem value="mine">Mis expedientes</SelectItem>
                      {teammates.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.email ?? "Asesor sin correo"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setAdvisorFilter("all"); }} disabled={statusFilter === "all" && advisorFilter === "all"}>Limpiar filtros</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {bucket === "closed" && counts && <p className="text-xs text-muted-foreground">Total: <span className="font-medium text-foreground">{counts.closed}</span> · Rechazados: <span className="font-medium text-foreground">{counts.rejected}</span> · Cancelados: <span className="font-medium text-foreground">{counts.cancelled}</span></p>}
      {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2"><FormError message={error} /></div>}

      {items === null && !error && <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" /><p className="text-sm text-muted-foreground">Cargando expedientes Renova…</p></div>}
      {items?.length === 0 && <div className="rounded-2xl border border-border/70"><EmptyState icon={bucket === "closed" ? Ban : bucket === "archived" ? Archive : Building2} title={emptyTitle} description={debouncedQuery ? "Prueba con otro nombre o número." : bucket === "closed" ? "Los casos que salgan del proceso aparecerán aquí sin perder sus datos." : bucket === "archived" ? "Los expedientes archivados pueden restaurarse cuando quieras." : "Registra el primero con Nuevo prospecto Renova."} /></div>}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <section key={group.status} className={cn("grid gap-3", bucket === "active" && "lg:grid-cols-[10.5rem_minmax(0,1fr)]")}>
              {bucket === "active" && <div className="flex items-center justify-between rounded-2xl bg-muted/65 p-4 lg:flex-col lg:items-start"><div><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Estado</p><h3 className="mt-1 text-sm font-medium">{formatRenovaStatus(group.status)}</h3></div><span className="text-2xl font-medium tabular-nums">{String(group.cases.length).padStart(2, "0")}</span></div>}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.cases.map((item) => {
                  const followUp = item.follow_up ?? EMPTY_FOLLOW_UP;
                  const normalizedItem = item.follow_up ? item : { ...item, follow_up: followUp };
                  return <article key={item.id} className="group rounded-2xl border border-border/70 bg-background/75 p-3.5 shadow-sm transition-colors hover:border-primary/35 hover:bg-background">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-4" aria-hidden="true" /></div>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(item.id)}><span className="block truncate text-sm font-medium transition-colors group-hover:text-primary">{item.owner_name}</span><span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground"><MapPin className="size-3 shrink-0" />{addressLabel(item)}</span></button>
                      <Badge variant="outline" className={cn("shrink-0 border-transparent text-[10px]", getRenovaStatusClassName(item.status))}>{formatRenovaStatus(item.status)}</Badge>
                    </div>
                    <div className={cn("mt-3 rounded-xl bg-muted/55 px-3 py-2.5", followUp.is_follow_up_overdue && "bg-destructive/10")}><p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Seguimiento</p><p className={cn("mt-1 text-xs font-medium", followUp.is_follow_up_overdue && "text-destructive")}>{followUpLabel(followUp)}</p>{followUp.note_preview && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{followUp.note_preview}</p>}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground"><div><span className="block">Propuesta</span><strong className="mt-0.5 block font-medium text-foreground">{formatRenovaMoney(item.final_offer, item.currency)}</strong></div><div><span className="block">Adeudos</span><strong className="mt-0.5 block font-medium text-foreground">{formatRenovaMoney(item.total_debt, item.currency)}</strong></div></div>
                    <p className="mt-2 text-[10px] text-muted-foreground">Asesor: {advisorLabel(item.assigned_user_id, user?.id, members)}</p>
                    <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2.5" onClick={(event) => event.stopPropagation()}>
                      {bucket !== "archived" && <div className="min-w-0 flex-1"><RenovaFollowUpPopover renovaCase={normalizedItem} onSaved={(savedFollowUp) => updateFollowUp(item.id, savedFollowUp)} /></div>}
                      {bucket !== "archived" && <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver ficha y compartir de ${item.owner_name}`} onClick={() => onShare?.(item.id)}><Share2 /></Button>}
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Abrir expediente de ${item.owner_name}`} onClick={() => onEdit?.(item.id)}><FolderOpen /></Button>
                      {bucket === "closed" && <><Button type="button" variant="ghost" size="icon-sm" aria-label={`Archivar expediente de ${item.owner_name}`} onClick={() => setAction({ kind: "archive", item })}><Archive /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Reactivar expediente de ${item.owner_name}`} onClick={() => setAction({ kind: "reactivate", item })}><RotateCcw /></Button></>}
                      {bucket === "archived" && <Button type="button" variant="outline" size="sm" aria-label={`Restaurar expediente de ${item.owner_name}`} onClick={() => setAction({ kind: "restore", item })}><ArchiveRestore /> Restaurar</Button>}
                    </div>
                  </article>;
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={action !== null} onOpenChange={(open) => !open && !acting && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{action?.kind === "archive" ? "Archivar expediente" : action?.kind === "restore" ? "Restaurar expediente" : "Reactivar operación"}</DialogTitle><DialogDescription>{action?.kind === "archive" ? `El expediente de ${action.item.owner_name} se moverá a Archivados sin perder sus datos.` : action?.kind === "restore" ? `El expediente de ${action.item.owner_name} saldrá de Archivados conservando su estado.` : action ? `El expediente de ${action.item.owner_name} volverá a Nuevo y aparecerá en Activos.` : ""}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={acting} onClick={() => setAction(null)}>Cancelar</Button><Button variant={action?.kind === "archive" ? "destructive" : "default"} disabled={acting} onClick={confirmAction}>{acting ? "Procesando…" : "Confirmar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
