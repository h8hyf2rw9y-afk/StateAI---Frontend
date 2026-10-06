"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Archive, ArchiveRestore, Ban, Columns3, FolderOpen, ListFilter, Loader2, RotateCcw, Search, Share2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { getRenovaCaseCounts, getRenovaCases, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { isRenovaOnly } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useTeamMembers } from "@/features/organization/use-team-members";
import type { OrganizationMember } from "@/lib/api/organization";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  RENOVA_CASE_BUCKETS,
  RENOVA_STATUSES,
  formatRenovaCaseBucket,
  formatRenovaDate,
  formatRenovaDateTime,
  formatRenovaDwellingWithDuplex,
  formatRenovaMoney,
  formatRenovaStatus,
  getRenovaStatusClassName,
  type RenovaCaseBucket,
  type RenovaCaseBucketCounts,
  type RenovaCaseListItem,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";
import { RenovaFollowUpPopover } from "@/features/renova/components/renova-follow-up-popover";
import type { RenovaFollowUpSummary } from "@/features/renova/types";

interface Loaded {
  key: string;
  cases: RenovaCaseListItem[] | null;
  error: string | null;
}

/** A pending confirmation for one of the two state-changing bucket actions — reactivar (closed -> active) or restaurar (archived -> its prior status). Archiving keeps its own simpler confirmation below. */
type ActionRequest = { kind: "reactivate" | "restore"; renovaCase: RenovaCaseListItem };

const SEARCH_DEBOUNCE_MS = 300;

const REACTIVATE_TARGET_STATUS = "new";

const EMPTY_STATE_ICON: Record<RenovaCaseBucket, typeof FolderOpen> = {
  active: FolderOpen,
  closed: Ban,
  archived: Archive,
};

interface ColumnContext {
  currentUserId: string | undefined;
  members: OrganizationMember[];
  onFollowUpSaved: (caseId: string, followUp: RenovaFollowUpSummary) => void;
}

interface ColumnDef {
  id: string;
  label: string;
  headClassName?: string;
  cellClassName?: string;
  render: (renovaCase: RenovaCaseListItem, ctx: ColumnContext) => ReactNode;
}

const MONEY_HEAD = "text-right whitespace-normal";
const MONEY_CELL = "text-right whitespace-nowrap";

/**
 * Every column the person can hide from the "Columnas" menu. Propietario
 * (what identifies the row) and Acciones (sticky, reachable on narrow
 * screens) are rendered outside this list so they can never be hidden.
 */
const TOGGLEABLE_COLUMNS: ColumnDef[] = [
  { id: "phone", label: "Celular", cellClassName: "whitespace-nowrap text-muted-foreground", render: (c) => c.owner_phone },
  { id: "address", label: "Dirección", headClassName: "min-w-36", cellClassName: "text-muted-foreground", render: (c) => c.street_address ?? "—" },
  {
    id: "dwelling",
    label: "Vivienda",
    cellClassName: "text-muted-foreground",
    render: (c) => formatRenovaDwellingWithDuplex(c.dwelling_type, c.is_duplex),
  },
  {
    id: "advisor",
    label: "Asesor",
    cellClassName: "text-muted-foreground",
    render: (c, ctx) => advisorLabel(c.assigned_user_id, ctx.currentUserId, ctx.members),
  },
  { id: "market_value", label: "Valor de mercado", headClassName: `max-w-28 ${MONEY_HEAD}`, cellClassName: MONEY_CELL, render: (c) => formatRenovaMoney(c.market_value, c.currency) },
  {
    id: "owner_expected",
    label: "Expectativa del propietario",
    headClassName: `max-w-32 ${MONEY_HEAD}`,
    cellClassName: MONEY_CELL,
    render: (c) => formatRenovaMoney(c.owner_expected_amount, c.currency),
  },
  { id: "final_offer", label: "Propuesta final", headClassName: `max-w-24 ${MONEY_HEAD}`, cellClassName: MONEY_CELL, render: (c) => formatRenovaMoney(c.final_offer, c.currency) },
  { id: "total_debt", label: "Adeudos totales", headClassName: `max-w-24 ${MONEY_HEAD}`, cellClassName: MONEY_CELL, render: (c) => formatRenovaMoney(c.total_debt, c.currency) },
  {
    id: "status",
    label: "Estado",
    render: (c) => (
      <Badge variant="outline" className={cn("border-transparent", getRenovaStatusClassName(c.status))}>
        {formatRenovaStatus(c.status)}
      </Badge>
    ),
  },
  {
    id: "follow_up",
    label: "Seguimiento",
    headClassName: "min-w-44",
    render: (c, ctx) => <RenovaFollowUpPopover renovaCase={c} onSaved={(followUp) => ctx.onFollowUpSaved(c.id, followUp)} />,
  },
  { id: "entry_date", label: "Fecha de ingreso", cellClassName: "whitespace-nowrap text-muted-foreground", render: (c) => formatRenovaDate(c.entry_date) },
  { id: "updated_at", label: "Última actualización", cellClassName: "whitespace-nowrap text-muted-foreground", render: (c) => formatRenovaDateTime(c.updated_at) },
];

const HIDDEN_COLUMNS_STORAGE_KEY = "renova-cases-table:hidden-columns";

/**
 * A per-browser display preference only (which columns to show), so
 * localStorage is enough — it never holds case data. Unknown ids from an
 * older version are dropped; any storage failure just means "show all".
 */
function readHiddenColumns(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY) ?? "[]");
    const known = new Set(TOGGLEABLE_COLUMNS.map((column) => column.id));
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && known.has(id)) : []);
  } catch {
    return new Set();
  }
}

function writeHiddenColumns(hidden: Set<string>) {
  try {
    window.localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify([...hidden]));
  } catch {
    // Storage blocked (private mode, quota): the choice still applies for this visit.
  }
}

/**
 * The Leads → Renova table: an independent list of Renova cases from
 * GET /renova/cases — it never calls the Contacts API and shows no Contact
 * roles. Rows are the backend's lean listing, so NSS and número de crédito
 * are not just hidden here, they are not in the data at all.
 *
 * Three views, server-filtered via `bucket` (never fetched-then-filtered
 * client-side, so this scales to an organization with hundreds of cases):
 *   - Activos: not archived, status not rejected/cancelled.
 *   - Rechazados y cancelados: not archived, status rejected or cancelled.
 *     "Estado" already shows which of the two, in its own color.
 *   - Archivados: archived = true, any status.
 * `status`/`archived` are the ONLY source of truth — there is no separate
 * archive table and no case copies.
 *
 * Search (owner name/phone) and the status / advisor filters are applied
 * server-side, composed with `bucket`. Advisor filtering offers only "Todos"
 * and "Mis expedientes": the backend has no endpoint listing an
 * organization's users, and the `users` table has no names, so no other
 * advisor can be named honestly.
 *
 * Clicking a row asks the parent to open the SAME editable case popup in
 * every view — there is no separate page and no separate "Editar" button.
 * Archivar / Reactivar / Restaurar stay as explicit row actions and never
 * navigate away; Reactivar and Restaurar ask for confirmation first (see
 * ActionRequest) since both change what the person sees next.
 *
 * Only mounted while the Renova tab is active (see LeadsWorkspace), so
 * merely opening Leads → Todos / Clientes activos makes no Renova request.
 */
export function RenovaCasesTable({ refreshKey = 0, onEdit, onShare }: { refreshKey?: number; onEdit?: (caseId: string) => void; onShare?: (caseId: string) => void }) {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // "all", "mine", or (owners/admins only) a teammate's user id.
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const { me } = useCurrentUser();
  const renovaOnly = isRenovaOnly(me?.role);
  const members = useTeamMembers();
  const teammates = members.filter((member) => member.id !== user?.id);
  const [bucket, setBucket] = useState<RenovaCaseBucket>("active");
  const [localRefresh, setLocalRefresh] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [archiveRequest, setArchiveRequest] = useState<RenovaCaseListItem | null>(null);
  const [actionRequest, setActionRequest] = useState<ActionRequest | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [counts, setCounts] = useState<RenovaCaseBucketCounts | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(readHiddenColumns);
  const visibleColumns = TOGGLEABLE_COLUMNS.filter((column) => !hiddenColumns.has(column.id));
  const columnContext: ColumnContext = { currentUserId: user?.id, members, onFollowUpSaved: updateFollowUpSummary };

  function toggleColumn(id: string) {
    const next = new Set(hiddenColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHiddenColumns(next);
    writeHiddenColumns(next);
  }

  function showAllColumns() {
    const next = new Set<string>();
    setHiddenColumns(next);
    writeHiddenColumns(next);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const advisorId = advisorFilter === "all" ? undefined : advisorFilter === "mine" ? user?.id : advisorFilter;
  const requestKey = JSON.stringify([debouncedQuery, statusFilter, advisorId ?? null, bucket, refreshKey, localRefresh]);

  useEffect(() => {
    let cancelled = false;
    getRenovaCases({
      q: debouncedQuery,
      status: statusFilter === "all" ? undefined : statusFilter,
      assigned_user_id: advisorId,
      bucket,
    }).then((response) => {
      if (cancelled) return;
      setLoaded(
        response.ok
          ? { key: requestKey, cases: response.data, error: null }
          : { key: requestKey, cases: null, error: getRenovaErrorMessage(response.error) }
      );
    });
    return () => {
      cancelled = true;
    };
    // requestKey encodes every input of this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // The three tab counters and the "Rechazados y cancelados" breakdown are
  // organization-wide totals, independent of the search box / status filter
  // — refetched only when something may have actually changed a bucket.
  useEffect(() => {
    let cancelled = false;
    getRenovaCaseCounts().then((response) => {
      if (!cancelled && response.ok) setCounts(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, localRefresh]);

  // Anything not answering the CURRENT request (first load, or a filter just
  // changed) reads as loading — never stale rows under a new filter.
  const isLoading = loaded?.key !== requestKey;
  const activeFilterCount = [statusFilter !== "all", advisorFilter !== "all"].filter(Boolean).length;
  const hasActiveFilters = debouncedQuery.trim() !== "" || activeFilterCount > 0;
  // The backend already returns rows grouped by status (status_rank ASC,
  // created_at DESC, id ASC — see RenovaCaseRepository.list()), including
  // across pagination boundaries. This table trusts that order as-is: no
  // client-side re-sort, so a status change only has to move a row once
  // it's refetched here, never twice in two different places.
  const sortedCases = loaded?.cases ?? null;

  function clearFilters() {
    setStatusFilter("all");
    setAdvisorFilter("all");
  }

  function refresh() {
    setLocalRefresh((n) => n + 1);
  }

  function updateFollowUpSummary(caseId: string, followUp: RenovaFollowUpSummary) {
    setLoaded((current) =>
      current?.cases
        ? { ...current, cases: current.cases.map((item) => (item.id === caseId ? { ...item, follow_up: followUp } : item)) }
        : current
    );
  }

  async function confirmArchive() {
    if (!archiveRequest) return;
    setActionError(null);
    setIsArchiving(true);
    // The row is already closed (rejected/cancelled) to even show this
    // action here, so archiving never needs to touch `status` too — the
    // old combined request (status + archived in one PATCH) is what made a
    // status change look like it deleted the case; the two are independent now.
    const response = await updateRenovaCase(archiveRequest.id, { archived: true });
    setIsArchiving(false);
    if (!response.ok) {
      setActionError(getRenovaErrorMessage(response.error));
      setArchiveRequest(null);
      return;
    }
    setArchiveRequest(null);
    refresh();
  }

  async function confirmAction() {
    if (!actionRequest) return;
    setActionError(null);
    setIsActing(true);
    const response = await updateRenovaCase(
      actionRequest.renovaCase.id,
      actionRequest.kind === "reactivate" ? { status: REACTIVATE_TARGET_STATUS } : { archived: false }
    );
    setIsActing(false);
    if (!response.ok) {
      setActionError(getRenovaErrorMessage(response.error));
      setActionRequest(null);
      return;
    }
    setActionRequest(null);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-border/70 bg-background/45 p-1" role="radiogroup" aria-label="Vista de expedientes">
        {RENOVA_CASE_BUCKETS.map((b) => (
          <Button
            key={b}
            type="button"
            role="radio"
            aria-checked={bucket === b}
            variant="ghost"
            size="sm"
            className={cn("rounded-lg", bucket === b && "bg-primary/15 text-foreground hover:bg-primary/20")}
            onClick={() => setBucket(b)}
          >
            {formatRenovaCaseBucket(b)}
          </Button>
        ))}
      </div>

      {bucket === "closed" && counts && (
        <p className="text-xs text-muted-foreground">
          Total de cerrados: <span className="font-medium text-foreground">{counts.closed}</span> · Rechazados:{" "}
          <span className="font-medium text-foreground">{counts.rejected}</span> · Cancelados:{" "}
          <span className="font-medium text-foreground">{counts.cancelled}</span>
        </p>
      )}

      {actionError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
          <FormError message={actionError} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por propietario o celular…"
            aria-label="Buscar expedientes Renova"
            className="h-10 rounded-xl border-border/70 bg-background/45 pl-9 shadow-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 rounded-xl border-border/70 bg-background/45 sm:ml-auto"
                aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} activos)` : "Filtros"}
              >
                <ListFilter />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="renova-filter-status">Estado</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                  <SelectTrigger id="renova-filter-status" aria-label="Filtrar por estado">
                    <SelectValue>{(v: string | null) => (!v || v === "all" ? "Todos los estados" : formatRenovaStatus(v))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {RENOVA_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatRenovaStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* A Renova-only advisor only ever has their own cases, so there is nothing to filter. */}
              {!renovaOnly && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="renova-filter-advisor">Asesor</Label>
                  <Select value={advisorFilter} onValueChange={(v) => setAdvisorFilter(v ?? "all")}>
                    <SelectTrigger id="renova-filter-advisor" aria-label="Filtrar por asesor">
                      <SelectValue>
                        {(v: string | null) =>
                          !v || v === "all"
                            ? "Todos los asesores"
                            : v === "mine"
                              ? "Mis expedientes"
                              : (teammates.find((member) => member.id === v)?.email ?? "Otro asesor")
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
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Limpiar filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 rounded-xl border-border/70 bg-background/45"
                aria-label={
                  hiddenColumns.size > 0
                    ? `Columnas (${hiddenColumns.size} ${hiddenColumns.size === 1 ? "oculta" : "ocultas"})`
                    : "Columnas"
                }
              >
                <Columns3 />
                Columnas
                {hiddenColumns.size > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {hiddenColumns.size}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent className="w-60">
            <div className="flex flex-col gap-1">
              <p className="px-1 pb-1 text-xs text-muted-foreground">Elige qué columnas ver en la tabla.</p>
              {TOGGLEABLE_COLUMNS.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={!hiddenColumns.has(column.id)}
                    onChange={() => toggleColumn(column.id)}
                  />
                  {column.label}
                </label>
              ))}
              <Button variant="ghost" size="sm" className="mt-1" onClick={showAllColumns} disabled={hiddenColumns.size === 0}>
                Mostrar todas
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Cargando expedientes Renova…</p>
        </div>
      )}

      {!isLoading && loaded?.error && (
        <div className="rounded-xl border p-6">
          <FormError message={loaded.error} />
        </div>
      )}

      {!isLoading && sortedCases && sortedCases.length === 0 && (
        <div className="rounded-xl border">
          <EmptyState
            icon={EMPTY_STATE_ICON[bucket]}
            title={
              hasActiveFilters
                ? "Ningún expediente coincide con los filtros"
                : bucket === "archived"
                  ? "No hay expedientes archivados"
                  : bucket === "closed"
                    ? "No hay expedientes rechazados o cancelados"
                    : "Aún no hay expedientes Renova"
            }
            description={
              hasActiveFilters
                ? "Prueba con otra búsqueda o limpia los filtros."
                : bucket === "archived"
                  ? "Los expedientes que archives desde Rechazados y cancelados aparecerán aquí."
                  : bucket === "closed"
                    ? "Los expedientes que rechaces o cancelas aparecerán aquí sin perder sus datos."
                    : "Registra el primero con “Nuevo prospecto Renova”."
            }
          />
        </div>
      )}

      {!isLoading && sortedCases && sortedCases.length > 0 && (
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 text-[11px] uppercase tracking-[0.08em]">
                <TableHead className="min-w-32">Propietario</TableHead>
                {visibleColumns.map((column) => (
                  <TableHead key={column.id} className={column.headClassName}>
                    {column.label}
                  </TableHead>
                ))}
                  {/* Sticky: on narrower screens the table scrolls sideways, but actions stay reachable. */}
                <TableHead className="sticky right-0 bg-muted text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCases.map((renovaCase) => (
                <TableRow
                  key={renovaCase.id}
                  role="button"
                  tabIndex={0}
                  className="group cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onEdit?.(renovaCase.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onEdit?.(renovaCase.id);
                    }
                  }}
                >
                  <TableCell className="font-medium transition-colors group-hover:text-primary">{renovaCase.owner_name}</TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id} className={column.cellClassName}>
                      {column.render(renovaCase, columnContext)}
                    </TableCell>
                  ))}
                  <TableCell className="sticky right-0 bg-background">
                    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                      {bucket !== "archived" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ver ficha y compartir de ${renovaCase.owner_name}`}
                          title={`Ver ficha y compartir de ${renovaCase.owner_name}`}
                          onClick={() => onShare?.(renovaCase.id)}
                        >
                          <Share2 />
                        </Button>
                      )}
                      {bucket === "closed" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Archivar expediente de ${renovaCase.owner_name}`}
                            title={`Archivar expediente de ${renovaCase.owner_name}`}
                            onClick={() => setArchiveRequest(renovaCase)}
                          >
                            <Archive />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Reactivar expediente de ${renovaCase.owner_name}`}
                            onClick={() => setActionRequest({ kind: "reactivate", renovaCase })}
                          >
                            <RotateCcw />
                            Reactivar
                          </Button>
                        </>
                      )}
                      {bucket === "archived" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Restaurar expediente de ${renovaCase.owner_name}`}
                          onClick={() => setActionRequest({ kind: "restore", renovaCase })}
                        >
                          <ArchiveRestore />
                          Restaurar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={archiveRequest !== null} onOpenChange={(open) => !open && !isArchiving && setArchiveRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar expediente</DialogTitle>
            <DialogDescription>
              El expediente de {archiveRequest?.owner_name ?? "este cliente"} se moverá a Archivados. Su historial y todos sus datos
              se conservan; podrás restaurarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isArchiving} onClick={() => setArchiveRequest(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={isArchiving} onClick={confirmArchive}>
              {isArchiving ? "Archivando…" : "Archivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionRequest !== null} onOpenChange={(open) => !open && !isActing && setActionRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionRequest?.kind === "reactivate" ? "Reactivar operación" : "Restaurar expediente"}</DialogTitle>
            <DialogDescription>
              {actionRequest?.kind === "reactivate"
                ? `El expediente de ${actionRequest.renovaCase.owner_name} regresará a la etapa “${formatRenovaStatus(REACTIVATE_TARGET_STATUS)}” y volverá a aparecer en Activos.`
                : actionRequest
                  ? `El expediente de ${actionRequest.renovaCase.owner_name} saldrá de Archivados conservando su estado actual (“${formatRenovaStatus(actionRequest.renovaCase.status)}”). No se activará automáticamente.`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isActing} onClick={() => setActionRequest(null)}>Cancelar</Button>
            <Button disabled={isActing} onClick={confirmAction}>
              {isActing ? "Procesando…" : actionRequest?.kind === "reactivate" ? "Reactivar" : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
