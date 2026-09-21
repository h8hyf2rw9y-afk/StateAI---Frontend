"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, ListFilter, Loader2, Pencil, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { getRenovaCases } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  RENOVA_STATUSES,
  formatRenovaDate,
  formatRenovaDwelling,
  formatRenovaMoney,
  formatRenovaStatus,
  getRenovaStatusClassName,
  type RenovaCaseListItem,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

interface Loaded {
  key: string;
  cases: RenovaCaseListItem[] | null;
  error: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The Leads → Renova table: an independent list of Renova cases from
 * GET /renova/cases — it never calls the Contacts API and shows no Contact
 * roles. Rows are the backend's lean listing, so NSS and número de crédito
 * are not just hidden here, they are not in the data at all.
 *
 * Search (owner name/phone) and the status / advisor filters are applied
 * server-side. Advisor filtering offers only "Todos" and "Mis expedientes":
 * the backend has no endpoint listing an organization's users, and the
 * `users` table has no names, so no other advisor can be named honestly.
 *
 * Opening a case: a row click (or its "Abrir" link) goes to the detail page
 * /leads/renova/[id]; "Editar" asks the parent to open the popup in edit mode
 * (`onEdit`) — the table owns no dialog itself.
 *
 * Only mounted while the Renova tab is active (see LeadsWorkspace), so
 * merely opening Leads → Todos / Clientes activos makes no Renova request.
 */
export function RenovaCasesTable({ refreshKey = 0, onEdit }: { refreshKey?: number; onEdit?: (caseId: string) => void }) {
  const router = useRouter();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState<"all" | "mine">("all");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const advisorId = advisorFilter === "mine" ? user?.id : undefined;
  const requestKey = JSON.stringify([debouncedQuery, statusFilter, advisorId ?? null, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    getRenovaCases({
      q: debouncedQuery,
      status: statusFilter === "all" ? undefined : statusFilter,
      assigned_user_id: advisorId,
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

  // Anything not answering the CURRENT request (first load, or a filter just
  // changed) reads as loading — never stale rows under a new filter.
  const isLoading = loaded?.key !== requestKey;
  const activeFilterCount = [statusFilter !== "all", advisorFilter !== "all"].filter(Boolean).length;
  const hasActiveFilters = debouncedQuery.trim() !== "" || activeFilterCount > 0;

  function clearFilters() {
    setStatusFilter("all");
    setAdvisorFilter("all");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por propietario o celular…"
            aria-label="Buscar expedientes Renova"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="sm:ml-auto"
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="renova-filter-advisor">Asesor</Label>
                <Select value={advisorFilter} onValueChange={(v) => setAdvisorFilter(v === "mine" ? "mine" : "all")}>
                  <SelectTrigger id="renova-filter-advisor" aria-label="Filtrar por asesor">
                    <SelectValue>{(v: string | null) => (v === "mine" ? "Mis expedientes" : "Todos los asesores")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los asesores</SelectItem>
                    <SelectItem value="mine">Mis expedientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Limpiar filtros
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

      {!isLoading && loaded?.cases && loaded.cases.length === 0 && (
        <div className="rounded-xl border">
          <EmptyState
            icon={FolderOpen}
            title={hasActiveFilters ? "Ningún expediente coincide con los filtros" : "Aún no hay expedientes Renova"}
            description={
              hasActiveFilters
                ? "Prueba con otra búsqueda o limpia los filtros."
                : "Registra el primero con “Nuevo prospecto Renova”."
            }
          />
        </div>
      )}

      {!isLoading && loaded?.cases && loaded.cases.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-32">Propietario</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Vivienda</TableHead>
                <TableHead>Asesor</TableHead>
                <TableHead className="max-w-28 text-right whitespace-normal">Valor de mercado</TableHead>
                <TableHead className="max-w-32 text-right whitespace-normal">Expectativa del propietario</TableHead>
                <TableHead className="max-w-24 text-right whitespace-normal">Propuesta final</TableHead>
                <TableHead className="max-w-24 text-right whitespace-normal">Adeudos totales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                {/* Sticky: on narrower screens the table scrolls sideways, but Abrir/Editar must stay reachable. */}
                <TableHead className="sticky right-0 bg-muted text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loaded.cases.map((renovaCase) => (
                <TableRow
                  key={renovaCase.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/renova/${renovaCase.id}`)}
                >
                  <TableCell className="font-medium">{renovaCase.owner_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{renovaCase.owner_phone}</TableCell>
                  <TableCell className="text-muted-foreground">{formatRenovaDwelling(renovaCase.dwelling_type)}</TableCell>
                  <TableCell className="text-muted-foreground">{advisorLabel(renovaCase.assigned_user_id, user?.id)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatRenovaMoney(renovaCase.market_value, renovaCase.currency)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatRenovaMoney(renovaCase.owner_expected_amount, renovaCase.currency)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatRenovaMoney(renovaCase.final_offer, renovaCase.currency)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatRenovaMoney(renovaCase.total_debt, renovaCase.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-transparent", getRenovaStatusClassName(renovaCase.status))}>
                      {formatRenovaStatus(renovaCase.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatRenovaDate(renovaCase.entry_date)}</TableCell>
                  <TableCell className="sticky right-0 bg-background">
                    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                      <Link
                        href={`/leads/renova/${renovaCase.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label={`Abrir expediente de ${renovaCase.owner_name}`}
                      >
                        Abrir
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Editar expediente de ${renovaCase.owner_name}`}
                        onClick={() => onEdit?.(renovaCase.id)}
                      >
                        <Pencil />
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
