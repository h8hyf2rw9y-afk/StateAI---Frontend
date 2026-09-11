"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { PropertyCard } from "@/features/properties/components/property-card";
import { getBuyerRequirementPropertyMatches } from "@/lib/api/buyer-requirements";
import { createPropertyInterest } from "@/lib/api/property-interests";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  formatMatchClassification,
  getMatchClassificationBadgeClassName,
  type PropertyInterest,
  type PropertyMatchAnalysis,
} from "@/features/buyer-requirements/types";
import { cn } from "@/lib/utils";

type Status = "loading" | "success" | "error";

/**
 * Buyer Matching — the richer, explainable analysis
 * (`GET /buyer-requirements/{id}/property-matches`,
 * app/services/matching_service.py's `analyze_matches`). Deterministic and
 * backend-driven, same as the older features/buyer-requirements/components/
 * match-list.tsx this replaces in the UI (not deleted — still a real,
 * tested backend capability, just no longer what this screen calls): no
 * AI, no embeddings, no numeric score anywhere. Every active property the
 * organization has gets a result here, not just ones that happen to
 * qualify — classified "match"/"partial match"/"no match", each with the
 * specific, plain-English criteria it did and didn't satisfy, so a person
 * can see *why* a property that's missing gets left out isn't just absent
 * without explanation.
 *
 * Reuses the existing PropertyCard as-is for each property (same visuals
 * as the Properties page, same link to the real property detail page) —
 * the classification badge and criteria breakdown render alongside it,
 * not by duplicating property-rendering logic.
 *
 * "Assign to client" (contactId/existingInterests/onAssigned) is the
 * manual-assignment half of the buyer -> property workflow: the advisor
 * reviews STATE AI's deterministic matches and decides which ones to
 * actually attach to this buyer, via the exact same PropertyInterest the
 * lead detail page already displays (features/buyer-requirements/components/
 * property-interest-row.tsx) — no new relationship concept, no duplicated
 * property. A property already interested-in shows "Assigned" instead of
 * a button, since PropertyInterest isn't unique on (contact, property) by
 * design (a contact can regain interest over time) — re-assigning an
 * already-assigned one here would just be a confusing duplicate, not a
 * meaningful new fact.
 */
export function PropertyMatchList({
  requirementId,
  contactId,
  existingInterests = [],
  onAssigned,
}: {
  requirementId: string;
  contactId?: string;
  existingInterests?: PropertyInterest[];
  onAssigned?: () => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [results, setResults] = useState<PropertyMatchAnalysis[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const assignedPropertyIds = new Set(existingInterests.map((interest) => interest.property_id));

  async function handleAssign(propertyId: string) {
    if (!contactId) return;
    setAssigningId(propertyId);
    setAssignError(null);
    const response = await createPropertyInterest(contactId, { property_id: propertyId, status: "new" });
    setAssigningId(null);
    if (!response.ok) {
      setAssignError(getApiErrorMessage(response.error));
      return;
    }
    onAssigned?.();
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getBuyerRequirementPropertyMatches(requirementId);
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setResults(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border py-8 text-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Analyzing property matches…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border p-4">
        <FormError message={errorMessage} />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={Search}
          title="No properties to compare yet."
          description="Properties your organization adds will be analyzed against this search."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormError message={assignError} />
      {results.map((result) => {
        const isAssigned = assignedPropertyIds.has(result.property.id);
        const isAssigning = assigningId === result.property.id;
        return (
        <div key={result.property.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start">
          <div className="sm:w-64 sm:shrink-0">
            <PropertyCard property={result.property} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("border-transparent", getMatchClassificationBadgeClassName(result.classification))}
              >
                {formatMatchClassification(result.classification)}
              </Badge>
              <p className="text-xs text-muted-foreground">{result.summary}</p>
            </div>
            {result.criteria_met.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {result.criteria_met.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
            {result.criteria_unmet.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {result.criteria_unmet.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <X className="mt-0.5 size-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
            {contactId && (
              <div className="mt-1">
                {isAssigned ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="size-3" aria-hidden="true" />
                    Assigned to client
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAssign(result.property.id)}
                    disabled={isAssigning}
                  >
                    {isAssigning ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <UserPlus className="size-3.5" aria-hidden="true" />
                    )}
                    Assign to client
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
