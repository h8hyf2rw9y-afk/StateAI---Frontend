"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter, Loader2, Search, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getContacts } from "@/lib/api/contacts";
import { formatContactRole, formatContactSource, type Contact } from "@/features/leads/types";
import { formatTimestamp, getInitials } from "@/lib/format";

type Status = "loading" | "success" | "error";

type CreatedFilter = "any" | "7d" | "30d" | "90d";
const CREATED_FILTER_LABELS: Record<CreatedFilter, string> = {
  any: "Any time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};
const CREATED_FILTER_DAYS: Record<Exclude<CreatedFilter, "any">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * Real backend contacts, fetched on mount — the actual CRM source of truth
 * (app/api/routes/contacts.py), not features/leads/mock-data.ts. No
 * score/status/budget columns: Contact has none of those fields, and
 * fabricating them would violate the "don't invent backend data" rule this
 * task is built around — see features/leads/types.ts's Contact/Lead
 * comment for why a fresh type was introduced instead of stretching Lead
 * to fit.
 */
export function LeadsTable({ view = "all" }: { view?: "all" | "active" }) {
  const router = useRouter();
  const isActiveView = view === "active";
  const [status, setStatus] = useState<Status>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>("any");
  // Captured once so the "last N days" cutoff is stable across renders (and render stays pure).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // "Clientes activos" is decided by the backend (?active=true) — see
      // active_contact_condition in the API — not by filtering here.
      const response = await getContacts(isActiveView ? { active: true } : undefined);
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setContacts(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isActiveView]);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const contact of contacts) {
      for (const role of contact.roles) roles.add(role.role_key);
    }
    return Array.from(roles).sort();
  }, [contacts]);

  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    for (const contact of contacts) if (contact.source) sources.add(contact.source);
    return Array.from(sources).sort();
  }, [contacts]);

  const activeFilterCount = [roleFilter !== "all", sourceFilter !== "all", createdFilter !== "any"].filter(Boolean).length;

  function clearFilters() {
    setRoleFilter("all");
    setSourceFilter("all");
    setCreatedFilter("any");
  }

  const filteredContacts = useMemo(() => {
    const createdSince = createdFilter === "any" ? null : now - CREATED_FILTER_DAYS[createdFilter] * 24 * 60 * 60 * 1000;
    return contacts.filter((contact) => {
      const matchesRole = roleFilter === "all" || contact.roles.some((r) => r.role_key === roleFilter);
      const matchesSource = sourceFilter === "all" || contact.source === sourceFilter;
      const matchesCreated = createdSince === null || new Date(contact.created_at).getTime() >= createdSince;
      const name = `${contact.first_name} ${contact.last_name}`.toLowerCase();
      const matchesQuery =
        query.trim().length === 0 ||
        name.includes(query.toLowerCase()) ||
        (contact.email?.toLowerCase().includes(query.toLowerCase()) ?? false);
      return matchesRole && matchesSource && matchesCreated && matchesQuery;
    });
  }, [contacts, query, roleFilter, sourceFilter, createdFilter, now]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading leads…</p>
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

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={Users}
          title={isActiveView ? "No active clients yet" : "No leads yet"}
          description={
            isActiveView
              ? "Contacts with an open opportunity or a live buyer search will show up here."
              : "Contacts your organization adds will show up here."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads by name or email…"
            className="h-10 rounded-xl border-border/70 bg-background/45 pl-9 shadow-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {/*
          Secondary filters live behind one button at the right end of the
          toolbar. Roles used to be a visible "All roles" select acting as a
          primary view; the Todos / Clientes activos tabs replaced that role,
          so roles are now just one filter among three, and it keeps working
          in both views and combined with the search box.
        */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 rounded-xl border-border/70 bg-background/45 sm:ml-auto"
                aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : "Filters"}
              >
                <ListFilter />
                Filters
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
              {availableRoles.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lead-filter-role">Role</Label>
                  <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value ?? "all")}>
                    <SelectTrigger id="lead-filter-role" aria-label="Role">
                      <SelectValue placeholder="All roles">
                        {(value: string | null) => (!value || value === "all" ? "All roles" : formatContactRole(value))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatContactRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {availableSources.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lead-filter-source">Source</Label>
                  <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value ?? "all")}>
                    <SelectTrigger id="lead-filter-source" aria-label="Source">
                      <SelectValue placeholder="All sources">
                        {(value: string | null) => (!value || value === "all" ? "All sources" : formatContactSource(value))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sources</SelectItem>
                      {availableSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {formatContactSource(source)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lead-filter-created">Created</Label>
                <Select value={createdFilter} onValueChange={(value) => setCreatedFilter((value as CreatedFilter) ?? "any")}>
                  <SelectTrigger id="lead-filter-created" aria-label="Created">
                    <SelectValue>{(value: string | null) => CREATED_FILTER_LABELS[(value as CreatedFilter) ?? "any"]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CREATED_FILTER_LABELS) as CreatedFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {CREATED_FILTER_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Clear filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/20">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/25 text-[11px] uppercase tracking-[0.08em]">
              <TableHead>Lead</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => {
              const name = `${contact.first_name} ${contact.last_name}`;
              return (
                <TableRow
                  key={contact.id}
                  className="group cursor-pointer transition-colors hover:bg-primary/[0.045]"
                  onClick={() => router.push(`/leads/${contact.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium transition-colors group-hover:text-primary">{name}</span>
                        <span className="text-xs text-muted-foreground">{contact.email ?? "—"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.roles.length > 0 ? (
                        contact.roles.map((role) => (
                          <Badge key={role.role_key} variant="outline">
                            {formatContactRole(role.role_key)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatContactSource(contact.source)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(contact.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filteredContacts.length === 0 && (
          <EmptyState
            icon={Users}
            title="No leads match your filters"
            description="Try a different search term or clear the filters."
          />
        )}
      </div>
    </div>
  );
}
