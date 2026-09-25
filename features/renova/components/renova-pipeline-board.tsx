"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Check, Home, ListFilter, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { RenovaPipelineColumn } from "@/features/renova/components/renova-pipeline-column";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";
import { getRenovaErrorMessage } from "@/features/renova/lib/errors";
import { formatMoney } from "@/features/renova/lib/money";
import { getRenovaPipeline, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import {
  RENOVA_PIPELINE_STAGES,
  formatRenovaDwelling,
  isRenovaPipelineCaseIncomplete,
  type RenovaPipelineCase,
  type RenovaPipelineStageStatus,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

type LoadStatus = "loading" | "success" | "error";
type StageMap = Record<RenovaPipelineStageStatus, RenovaPipelineCase[]>;

function emptyStageMap(): StageMap {
  return Object.fromEntries(RENOVA_PIPELINE_STAGES.map((s) => [s, [] as RenovaPipelineCase[]])) as StageMap;
}

function sumMoney(values: (string | null)[]): number | null {
  const present = values.filter((v): v is string => v !== null).map(Number).filter((n) => !Number.isNaN(n));
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
}

const IN_PROGRESS_STAGES: readonly RenovaPipelineStageStatus[] = ["new", "offer_preparation", "offer_sent", "negotiating"];

const EXIT_CONFIRMATION_TEXT = "Este expediente saldrá del pipeline de Renova, pero conservará su historial.";

/**
 * The Renova Kanban board (/pipeline?view=renova). Fetches the whole active
 * pipeline in one request (GET /renova/pipeline, already grouped by stage)
 * and keeps it as local state so a move can be applied optimistically and
 * rolled back on failure — see `applyMove`.
 *
 * Moving a card never skips a network round trip: the UI updates immediately,
 * the PATCH goes out, and only a FAILED response reverts the card to its
 * previous column (with a visible error). Rejecting/cancelling a card is the
 * one move that asks for confirmation first (it silently disappears from this
 * board otherwise); every other stage-to-stage move applies immediately, drag
 * or "Mover a…" alike — both call the exact same `applyMove`.
 */
export function RenovaPipelineBoard() {
  const router = useRouter();
  const { user } = useUser();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [stages, setStages] = useState<StageMap>(emptyStageMap());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
  const movingRef = useRef<Set<string>>(new Set());
  const [exitRequest, setExitRequest] = useState<{ caseId: string; ownerName: string; status: "rejected" | "cancelled" } | null>(null);
  const [shareCaseId, setShareCaseId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState<"all" | "mine">("all");
  const [dwellingFilter, setDwellingFilter] = useState<"all" | "house" | "apartment">("all");
  const [duplexFilter, setDuplexFilter] = useState<"all" | "yes" | "no">("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);

  // Loads once on mount — filters below are purely client-side, so no filter
  // change ever re-fetches (the whole point of one grouped request).
  useEffect(() => {
    let cancelled = false;
    getRenovaPipeline().then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setLoadError(getRenovaErrorMessage(response.error));
        setStatus("error");
        return;
      }
      const next = emptyStageMap();
      for (const stage of response.data.stages) {
        if (stage.status in next) next[stage.status as RenovaPipelineStageStatus] = stage.cases;
      }
      setStages(next);
      setStatus("success");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function matchesFilters(card: RenovaPipelineCase): boolean {
    const q = query.trim().toLowerCase();
    const matchesQuery = q.length === 0 || card.owner_name.toLowerCase().includes(q) || card.owner_phone.toLowerCase().includes(q);
    const matchesAdvisor = advisorFilter === "all" || card.assigned_user_id === user?.id;
    const matchesDwelling = dwellingFilter === "all" || card.dwelling_type === dwellingFilter;
    const matchesDuplex = duplexFilter === "all" || card.is_duplex === (duplexFilter === "yes");
    const matchesIncomplete = !incompleteOnly || isRenovaPipelineCaseIncomplete(card);
    return matchesQuery && matchesAdvisor && matchesDwelling && matchesDuplex && matchesIncomplete;
  }

  const activeFilterCount = [advisorFilter !== "all", dwellingFilter !== "all", duplexFilter !== "all", incompleteOnly].filter(Boolean).length;
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  const filteredStages: StageMap = useMemo(() => {
    const next = emptyStageMap();
    for (const stage of RENOVA_PIPELINE_STAGES) next[stage] = stages[stage].filter(matchesFilters);
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, query, advisorFilter, dwellingFilter, duplexFilter, incompleteOnly, user?.id]);

  // Metrics summarize the WHOLE pipeline, not the filtered view — a search or
  // advisor filter narrows what's on screen, it never changes what "in
  // process" or "purchased" actually means for the organization.
  const metrics = useMemo(() => {
    const inProgressCards = IN_PROGRESS_STAGES.flatMap((s) => stages[s]);
    const purchasedCards = stages.purchased;
    return {
      inProgressCount: inProgressCards.length,
      acceptedCount: stages.accepted.length,
      purchasedCount: purchasedCards.length,
      inProgressValue: sumMoney(inProgressCards.map((c) => c.final_offer)),
      purchasedValue: sumMoney(purchasedCards.map((c) => c.final_offer)),
    };
  }, [stages]);

  const totalCases = RENOVA_PIPELINE_STAGES.reduce((sum, s) => sum + stages[s].length, 0);

  function findCard(caseId: string): { card: RenovaPipelineCase; stage: RenovaPipelineStageStatus } | null {
    for (const stage of RENOVA_PIPELINE_STAGES) {
      const card = stages[stage].find((c) => c.id === caseId);
      if (card) return { card, stage };
    }
    return null;
  }

  /**
   * The single path every move goes through, whatever triggered it (drag,
   * "Mover a…", or a confirmed exit). `movingRef` (a ref, not state) is
   * checked and set SYNCHRONOUSLY before any state update so two rapid moves
   * of the same card — a fast double-drop, a click landing while the PATCH
   * from a previous click is still in flight — can't both go through: state
   * updates are batched/async, a ref read is not.
   */
  function applyMove(caseId: string, toStatus: string) {
    if (movingRef.current.has(caseId)) return;
    const found = findCard(caseId);
    if (!found || found.stage === toStatus) return;
    const { card, stage } = found;
    const isBoardStage = (RENOVA_PIPELINE_STAGES as readonly string[]).includes(toStatus);
    const snapshot = stages;

    movingRef.current.add(caseId);
    setMovingIds(new Set(movingRef.current));
    setStages((prev) => {
      const next: StageMap = { ...prev, [stage]: prev[stage].filter((c) => c.id !== caseId) };
      if (isBoardStage) {
        const moved = { ...card, status: toStatus };
        next[toStatus as RenovaPipelineStageStatus] = [moved, ...next[toStatus as RenovaPipelineStageStatus]];
      }
      return next;
    });

    updateRenovaCase(caseId, { status: toStatus }).then((response) => {
      movingRef.current.delete(caseId);
      setMovingIds(new Set(movingRef.current));
      if (!response.ok) {
        setStages(snapshot);
        setActionError(getRenovaErrorMessage(response.error));
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (!overId) return;
    applyMove(String(event.active.id), String(overId));
  }

  function requestExit(caseId: string, exitStatus: "rejected" | "cancelled") {
    const found = findCard(caseId);
    if (!found) return;
    setExitRequest({ caseId, ownerName: found.card.owner_name, status: exitStatus });
  }

  function confirmExit() {
    if (!exitRequest) return;
    applyMove(exitRequest.caseId, exitRequest.status);
    setExitRequest(null);
  }

  function clearFilters() {
    setAdvisorFilter("all");
    setDwellingFilter("all");
    setDuplexFilter("all");
    setIncompleteOnly(false);
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Cargando pipeline Renova…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border p-6">
        <FormError message={loadError} />
      </div>
    );
  }

  if (totalCases === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={Home}
          title="Sin expedientes en el pipeline"
          description="Los expedientes Renova en Nuevo, Preparación de oferta, Oferta enviada, Negociando, Aceptado o Comprado aparecerán aquí."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
          <FormError message={actionError} />
        </div>
      )}

      <div className="flex flex-wrap gap-3" data-testid="pipeline-metrics">
        <MetricCard label="En proceso" value={String(metrics.inProgressCount)} />
        <MetricCard label="Aceptados" value={String(metrics.acceptedCount)} />
        <MetricCard label="Comprados" value={String(metrics.purchasedCount)} />
        <MetricCard label="Valor de propuestas en proceso" value={metrics.inProgressValue === null ? "—" : formatMoney(metrics.inProgressValue)} />
        <MetricCard label="Valor total comprado" value={metrics.purchasedValue === null ? "—" : formatMoney(metrics.purchasedValue)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por propietario o celular…"
            aria-label="Buscar en el pipeline Renova"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="sm:ml-auto" aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} activos)` : "Filtros"}>
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
                <Label htmlFor="pipeline-filter-advisor">Asesor</Label>
                <Select value={advisorFilter} onValueChange={(v) => setAdvisorFilter(v === "mine" ? "mine" : "all")}>
                  <SelectTrigger id="pipeline-filter-advisor" aria-label="Filtrar por asesor">
                    <SelectValue>{(v: string | null) => (v === "mine" ? "Mis expedientes" : "Todos los asesores")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los asesores</SelectItem>
                    <SelectItem value="mine">Mis expedientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pipeline-filter-dwelling">Tipo de vivienda</Label>
                <Select value={dwellingFilter} onValueChange={(v) => setDwellingFilter((v as typeof dwellingFilter) ?? "all")}>
                  <SelectTrigger id="pipeline-filter-dwelling" aria-label="Filtrar por tipo de vivienda">
                    <SelectValue>{(v: string | null) => (!v || v === "all" ? "Todos" : formatRenovaDwelling(v))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="house">{formatRenovaDwelling("house")}</SelectItem>
                    <SelectItem value="apartment">{formatRenovaDwelling("apartment")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pipeline-filter-duplex">Dúplex</Label>
                <Select value={duplexFilter} onValueChange={(v) => setDuplexFilter((v as typeof duplexFilter) ?? "all")}>
                  <SelectTrigger id="pipeline-filter-duplex" aria-label="Filtrar por dúplex">
                    <SelectValue>{(v: string | null) => (v === "yes" ? "Solo dúplex" : v === "no" ? "Sin dúplex" : "Todos")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Solo dúplex</SelectItem>
                    <SelectItem value="no">Sin dúplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                role="checkbox"
                aria-checked={incompleteOnly}
                variant="outline"
                size="sm"
                className={cn("w-fit", incompleteOnly && "border-primary bg-primary/15 text-foreground hover:bg-primary/20")}
                onClick={() => setIncompleteOnly((v) => !v)}
              >
                {incompleteOnly && <Check aria-hidden="true" />}
                Solo expedientes incompletos
              </Button>
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Limpiar filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {hasActiveFilters && RENOVA_PIPELINE_STAGES.every((stage) => filteredStages[stage].length === 0) ? (
        <div className="rounded-xl border">
          <EmptyState
            icon={Search}
            title="Ningún expediente coincide con los filtros"
            description="Prueba con otra búsqueda o limpia los filtros."
          />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {RENOVA_PIPELINE_STAGES.map((stage) => (
              <RenovaPipelineColumn
                key={stage}
                status={stage}
                cards={filteredStages[stage]}
                totalCount={stages[stage].length}
                currentUserId={user?.id}
                movingIds={movingIds}
                onOpen={(caseId) => router.push(`/leads/renova/${caseId}`)}
                onShare={setShareCaseId}
                onMove={(caseId, next) => applyMove(caseId, next)}
                onRequestExit={requestExit}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog open={exitRequest !== null} onOpenChange={(open) => !open && setExitRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exitRequest?.status === "rejected" ? "Marcar como rechazado" : "Marcar como cancelado"}</DialogTitle>
            <DialogDescription>{EXIT_CONFIRMATION_TEXT}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Expediente de {exitRequest?.ownerName}.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitRequest(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              {exitRequest?.status === "rejected" ? "Sí, marcar como rechazado" : "Sí, marcar como cancelado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {shareCaseId && <RenovaShareDialog key={shareCaseId} caseId={shareCaseId} onClose={() => setShareCaseId(null)} />}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-0.5 rounded-xl border border-border/70 bg-background/30 px-3 py-2">
      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}
