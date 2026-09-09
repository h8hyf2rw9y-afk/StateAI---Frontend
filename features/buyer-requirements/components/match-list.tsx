"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { PropertyCard } from "@/features/properties/components/property-card";
import { getBuyerRequirementMatches } from "@/lib/api/buyer-requirements";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PropertyMatch } from "@/features/buyer-requirements/types";

type Status = "loading" | "success" | "error";

/**
 * Matching properties for one active buyer requirement — Use Case 5
 * (app/services/matching_service.py), deterministic and backend-driven.
 * No AI, no score: `matched_preferred_features`/`total_preferred_features`
 * are the only real numbers the backend returns, shown as a plain "N of M"
 * caption — never converted into a percentage or a fabricated "match
 * score", per this task's explicit instruction. Reuses the existing
 * PropertyCard as-is (same visuals as the Properties page, same link to
 * the real property detail page) rather than duplicating property
 * rendering logic.
 */
export function MatchList({ requirementId }: { requirementId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getBuyerRequirementMatches(requirementId);
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setMatches(response.data);
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
        <p className="text-sm text-muted-foreground">Loading matching properties…</p>
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

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border">
        <EmptyState
          icon={Search}
          title="No properties currently match this search."
          description="Try widening the budget or location criteria."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {matches.map((match) => (
        <div key={match.property.id} className="flex flex-col gap-1">
          <PropertyCard property={match.property} />
          {match.total_preferred_features > 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              {match.matched_preferred_features} of {match.total_preferred_features} preferred features matched
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
