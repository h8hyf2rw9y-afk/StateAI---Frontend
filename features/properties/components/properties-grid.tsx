"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getProperties } from "@/lib/api/properties";
import { PropertyCard } from "@/features/properties/components/property-card";
import { formatPropertyStatus, type Property } from "@/features/properties/types";
import { cn } from "@/lib/utils";

type Status = "loading" | "success" | "error";

const OWNERSHIP_TABS: { value: "all" | "own" | "external"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "own", label: "My inventory" },
  { value: "external", label: "External advisors" },
];

/**
 * Real backend properties, fetched on mount — the actual CRM source of
 * truth (app/api/routes/properties.py), not features/properties/mock-data.ts.
 * Same shape as features/leads/components/leads-table.tsx: self-fetching,
 * a status filter derived from whatever's actually in the data (not a
 * hardcoded list), a genuine empty state, never a fallback to mock data.
 */
export function PropertiesGrid() {
  const [status, setStatus] = useState<Status>("loading");
  const [properties, setProperties] = useState<Property[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getProperties();
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setProperties(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(properties.map((p) => p.status))).sort();
  }, [properties]);

  const counts = useMemo(
    () => ({
      all: properties.length,
      own: properties.filter((p) => p.ownership_type === "own").length,
      external: properties.filter((p) => p.ownership_type === "external").length,
    }),
    [properties]
  );

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesOwnership = ownershipFilter === "all" || property.ownership_type === ownershipFilter;
      const query_ = query.trim().toLowerCase();
      const matchesQuery =
        query_.length === 0 ||
        property.title.toLowerCase().includes(query_) ||
        (property.city?.toLowerCase().includes(query_) ?? false);
      return matchesStatus && matchesOwnership && matchesQuery;
    });
  }, [properties, query, statusFilter, ownershipFilter]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading properties…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border p-6">
        <FormError message={errorMessage} />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Listings your organization adds will show up here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or city…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {availableStatuses.length > 0 && (
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="All statuses">
                {(value: string | null) => (!value || value === "all" ? "All statuses" : formatPropertyStatus(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {availableStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatPropertyStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/*
        The "External advisors" section: properties that belong to another
        advisor/portal and that the advisor is pursuing for a client (see
        Property.ownership_type). A tab, not a separate page or table — they
        are the same Property records, only kept visibly apart from owned
        inventory so they're never mistaken for it. Counts come from the
        already-fetched list, no extra request.
      */}
      <div role="tablist" aria-label="Property source" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {OWNERSHIP_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={ownershipFilter === tab.value}
            onClick={() => setOwnershipFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors",
              ownershipFilter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className="text-xs text-muted-foreground">{counts[tab.value]}</span>
          </button>
        ))}
      </div>
      {ownershipFilter === "external" && (
        <p className="text-sm text-muted-foreground">
          Properties passed to you by other advisors or found on external portals. Assign them to your clients from the
          lead&apos;s page — they never count as your own inventory or get auto-matched.
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={
            ownershipFilter === "external" && counts.external === 0
              ? "No external properties yet"
              : "No properties match your filters"
          }
          description={
            ownershipFilter === "external" && counts.external === 0
              ? "When another advisor passes you a property, add it with “Add external property”."
              : "Try a different search term or clear the status filter."
          }
        />
      )}
    </div>
  );
}
