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
import { formatPropertyOwnership, formatPropertyStatus, type Property } from "@/features/properties/types";

type Status = "loading" | "success" | "error";

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
        <Select value={ownershipFilter} onValueChange={(value) => setOwnershipFilter(value ?? "all")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="My inventory + External">
              {(value: string | null) => (!value || value === "all" ? "My inventory + External" : formatPropertyOwnership(value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">My inventory + External</SelectItem>
            <SelectItem value="own">My inventory</SelectItem>
            <SelectItem value="external">External / Collaboration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No properties match your filters"
          description="Try a different search term or clear the status filter."
        />
      )}
    </div>
  );
}
