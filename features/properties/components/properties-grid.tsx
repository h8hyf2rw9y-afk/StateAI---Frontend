"use client";

import { useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PropertyCard } from "@/features/properties/components/property-card";
import type { Property } from "@/features/properties/types";
import { PROPERTY_STATUSES, PROPERTY_STATUS_LABELS } from "@/features/properties/types";

export function PropertiesGrid({ properties }: { properties: Property[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesQuery =
        query.trim().length === 0 ||
        property.name.toLowerCase().includes(query.toLowerCase()) ||
        property.city.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [properties, query, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or city…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="All statuses">
              {(value: string | null) =>
                !value || value === "all" ? "All statuses" : PROPERTY_STATUS_LABELS[value as keyof typeof PROPERTY_STATUS_LABELS]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROPERTY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PROPERTY_STATUS_LABELS[status]}
              </SelectItem>
            ))}
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
