"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProperty } from "@/lib/api/properties";
import { deletePropertyInterest, updatePropertyInterest } from "@/lib/api/property-interests";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCollaborationStatus, formatPropertyPrice, type Property } from "@/features/properties/types";
import {
  PROPERTY_INTEREST_STATUSES,
  formatPropertyInterestStatus,
  type PropertyInterest,
} from "@/features/buyer-requirements/types";

/**
 * One client↔property relationship — "interested in this specific
 * property" (Case A), whether the property is the advisor's own inventory
 * or an External / Collaboration one passed on by another advisor.
 * PropertyInterestRead only has `property_id` (a UUID), not the property's
 * own fields, so this fetches the one referenced property for display — a
 * single, cheap lookup per row rather than a bulk endpoint that doesn't
 * exist, acceptable given a contact realistically has very few of these.
 *
 * The status is editable in place (Proposed → Interested → Viewing
 * scheduled → …) and the relationship can be removed. Removing deletes
 * only this link, never the property. DELETE is owner/admin-only on the
 * backend, so a failure there is shown as the friendly error, not hidden.
 */
export function PropertyInterestRow({
  interest,
  onChanged,
  onRemoved,
}: {
  interest: PropertyInterest;
  onChanged?: (updated: PropertyInterest) => void;
  onRemoved?: (interestId: string) => void;
}) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProperty(interest.property_id).then((response) => {
      if (cancelled) return;
      if (response.ok) setProperty(response.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [interest.property_id]);

  async function handleStatusChange(status: string | null) {
    if (!status || status === interest.status || busy) return;
    setBusy(true);
    setError(null);
    const response = await updatePropertyInterest(interest.id, { status });
    setBusy(false);
    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }
    onChanged?.(response.data);
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const response = await deletePropertyInterest(interest.id);
    setBusy(false);
    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }
    onRemoved?.(interest.id);
  }

  const isExternal = property?.ownership_type === "external";

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {loading ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Loading property…
            </span>
          ) : property ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/properties/${property.id}`} className="text-sm font-medium hover:underline">
                  {property.title}
                </Link>
                {isExternal && (
                  <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400">
                    External
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{formatPropertyPrice(property.price, property.currency)}</p>
              {isExternal && (property.external_advisor_name || property.collaboration_status) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {property.external_advisor_name && (
                    <span className="flex items-center gap-1">
                      <UserRound className="size-3" aria-hidden="true" />
                      {property.external_advisor_name}
                    </span>
                  )}
                  {property.collaboration_status && <span>{formatCollaborationStatus(property.collaboration_status)}</span>}
                </p>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Property no longer available</span>
          )}
          {interest.notes && <p className="mt-1 text-xs text-muted-foreground">{interest.notes}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onChanged ? (
            <Select value={interest.status} onValueChange={handleStatusChange} disabled={busy}>
              <SelectTrigger className="h-7 w-44 text-xs" aria-label="Relationship status">
                <SelectValue>{(value: string | null) => formatPropertyInterestStatus(value ?? interest.status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_INTEREST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatPropertyInterestStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">{formatPropertyInterestStatus(interest.status)}</Badge>
          )}
          {onRemoved && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove property from this client"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
