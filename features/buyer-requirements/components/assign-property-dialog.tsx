"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Building2, Loader2, Search, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { getProperties } from "@/lib/api/properties";
import { createPropertyInterest } from "@/lib/api/property-interests";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPropertyPrice, type Property } from "@/features/properties/types";
import { formatPropertyInterestStatus, type PropertyInterest } from "@/features/buyer-requirements/types";
import { cn } from "@/lib/utils";

type Scope = "all" | "own" | "external";
type LoadState = "idle" | "loading" | "ready" | "error";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "own", label: "My inventory" },
  { value: "external", label: "External advisors" },
];

/** The two starting points that matter when putting a property in front of a client; every later stage is changed on the row itself. */
const STARTING_STATUSES = ["new", "interested"];

/**
 * "This client is connected to THIS property" — pick any property from the
 * organization's catalog (the advisor's own inventory or an External /
 * Collaboration one another advisor passed on) and link it to the client.
 * Same write the buyer-search "Assign to client" button already does
 * (POST /contacts/{id}/property-interests) — no new backend surface; this
 * is only a second, direct way in that doesn't require a matching search.
 * Properties already linked to this client are shown but not selectable.
 * Never sends an organization_id — the backend derives it from the token.
 */
export function AssignPropertyDialog({
  contactId,
  existingInterests,
  trigger,
  onAssigned,
}: {
  contactId: string;
  existingInterests: PropertyInterest[];
  trigger: ReactElement;
  onAssigned?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [properties, setProperties] = useState<Property[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [startingStatus, setStartingStatus] = useState("new");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = useMemo(() => new Set(existingInterests.map((i) => i.property_id)), [existingInterests]);

  async function loadProperties() {
    setLoadState("loading");
    const response = await getProperties();
    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      setLoadState("error");
      return;
    }
    setProperties(response.data);
    setLoadState("ready");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      setQuery("");
      setScope("all");
      void loadProperties();
    }
  }

  async function handleAssign(property: Property) {
    if (assigningId) return;
    setAssigningId(property.id);
    setError(null);
    const response = await createPropertyInterest(contactId, { property_id: property.id, status: startingStatus });
    setAssigningId(null);
    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }
    onAssigned?.();
    setOpen(false);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((p) => {
      if (scope !== "all" && p.ownership_type !== scope) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.city?.toLowerCase().includes(q) ?? false) ||
        (p.external_advisor_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [properties, scope, query]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a property to this client</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label="Property source" className="flex gap-1 rounded-lg bg-muted p-1">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={scope === s.value}
                onClick={() => setScope(s.value)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  scope === s.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, city or advisor…"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={startingStatus} onValueChange={(v) => v && setStartingStatus(v)}>
              <SelectTrigger className="sm:w-48" aria-label="Relationship to create">
                <SelectValue>{(value: string | null) => formatPropertyInterestStatus(value ?? "new")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STARTING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatPropertyInterestStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormError message={error} />

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {loadState === "loading" && (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading properties…
              </p>
            )}
            {loadState === "ready" && visible.length === 0 && (
              <p className="flex flex-col items-center gap-1 py-8 text-center text-sm text-muted-foreground">
                <Building2 className="size-5" aria-hidden="true" />
                {scope === "external"
                  ? "No external properties yet — add one from Properties → Add external property."
                  : "No properties match."}
              </p>
            )}
            {loadState === "ready" && visible.map((property) => {
              const alreadyAssigned = assignedIds.has(property.id);
              const isExternal = property.ownership_type === "external";
              return (
                <div key={property.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{property.title}</p>
                      {isExternal && (
                        <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400">
                          External
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPropertyPrice(property.price, property.currency)}
                      {property.city ? ` · ${property.city}` : ""}
                    </p>
                    {isExternal && property.external_advisor_name && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="size-3" aria-hidden="true" />
                        {property.external_advisor_name}
                      </p>
                    )}
                  </div>
                  {alreadyAssigned ? (
                    <span className="shrink-0 text-xs text-muted-foreground">Already assigned</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssign(property)}
                      disabled={assigningId !== null}
                      aria-label={`Assign ${property.title}`}
                    >
                      {assigningId === property.id && <Loader2 className="size-3.5 animate-spin" />}
                      Assign
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
