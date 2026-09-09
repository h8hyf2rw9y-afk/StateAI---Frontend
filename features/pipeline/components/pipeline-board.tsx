"use client";

import { useEffect, useMemo, useState } from "react";
import { Handshake, Loader2, Search } from "lucide-react";
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
import { getOpportunities } from "@/lib/api/pipeline";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { PipelineColumn } from "@/features/pipeline/components/pipeline-column";
import {
  OPPORTUNITY_STAGE_VALUES,
  OPPORTUNITY_TYPE_LABELS,
  formatOpportunityType,
  type Opportunity,
} from "@/features/pipeline/types";

type Status = "loading" | "success" | "error";

/**
 * Real backend opportunities, organized by stage — replaces the old
 * `PipelineBoard(deals)` (which rendered `mockDeals` passed in from
 * app/(dashboard)/pipeline/page.tsx). Self-fetching, same shape as
 * features/properties/components/properties-grid.tsx: fetches on mount,
 * genuine loading/error/empty states, never a fallback to mock data.
 *
 * Columns are built from whichever stages are *actually present* in the
 * loaded opportunities (in the backend's own canonical stage order), not a
 * fixed 13-column layout — most organizations/type filters won't touch
 * every stage, and an all-empty board of 13 columns would be worse than a
 * few real ones. Contact/property names are resolved client-side from the
 * real Contacts/Properties lists (joined by id) since OpportunityRead only
 * carries `contact_id`/`property_id`, never a duplicated name.
 *
 * Drag-and-drop is deliberately not implemented — moving an opportunity
 * between stages is done from its detail page via a stage selector (see
 * app/(dashboard)/pipeline/[id]/page.tsx), which is also the only place
 * `lost_reason` (required by the backend whenever a stage PATCH ends in
 * "lost") can be collected. A per-card drag target here would either skip
 * that requirement or need its own duplicate reason-picker UI, for no real
 * benefit over one click into the detail page — see this task's own brief.
 */
export function PipelineBoard() {
  const [status, setStatus] = useState<Status>("loading");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [opportunitiesRes, contactsRes, propertiesRes] = await Promise.all([
        getOpportunities(),
        getContacts(),
        getProperties(),
      ]);
      if (cancelled) return;

      if (!opportunitiesRes.ok) {
        setErrorMessage(getApiErrorMessage(opportunitiesRes.error));
        setStatus("error");
        return;
      }

      setOpportunities(opportunitiesRes.data);

      // Contact/property name lookups are a display convenience — if either
      // fails to load, the board still renders with a plain fallback label
      // per card rather than failing the whole page over a secondary call.
      if (contactsRes.ok) {
        setContactNames(
          Object.fromEntries(contactsRes.data.map((c) => [c.id, `${c.first_name} ${c.last_name}`]))
        );
      }
      if (propertiesRes.ok) {
        setPropertyNames(Object.fromEntries(propertiesRes.data.map((p) => [p.id, p.title])));
      }

      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      const matchesType = typeFilter === "all" || o.opportunity_type === typeFilter;
      const matchesQuery =
        q.length === 0 ||
        o.title.toLowerCase().includes(q) ||
        (contactNames[o.contact_id]?.toLowerCase().includes(q) ?? false);
      return matchesType && matchesQuery;
    });
  }, [opportunities, query, typeFilter, contactNames]);

  const stagesPresent = useMemo(
    () => OPPORTUNITY_STAGE_VALUES.filter((stage) => filtered.some((o) => o.stage === stage)),
    [filtered]
  );

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
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

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={Handshake}
          title="No opportunities yet"
          description="Opportunities your organization creates will show up here, organized by stage."
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
            placeholder="Search by title or contact…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All types">
              {(value: string | null) =>
                !value || value === "all" ? "All types" : formatOpportunityType(value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.keys(OPPORTUNITY_TYPE_LABELS).map((type) => (
              <SelectItem key={type} value={type}>
                {formatOpportunityType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stagesPresent.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              opportunities={filtered.filter((o) => o.stage === stage)}
              contactNames={contactNames}
              propertyNames={propertyNames}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Handshake}
          title="No opportunities match your filters"
          description="Try a different search term or clear the type filter."
        />
      )}
    </div>
  );
}
