"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { BuyerRequirementForm } from "@/features/buyer-requirements/components/buyer-requirement-form";
import { PropertyMatchList } from "@/features/buyer-requirements/components/property-match-list";
import { updateBuyerRequirement } from "@/lib/api/buyer-requirements";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatPropertyType } from "@/features/properties/types";
import {
  formatBudgetRange,
  formatLocations,
  formatMinMax,
  formatPurpose,
  formatRequirementStatus,
  getRequirementStatusBadgeClassName,
  type BuyerRequirement,
  type PropertyInterest,
} from "@/features/buyer-requirements/types";
import { cn } from "@/lib/utils";

/**
 * One buyer requirement — active ones get Edit/Cancel actions and a
 * "See property matches" toggle (Buyer Matching — see
 * property-match-list.tsx); anything else (paused/fulfilled/cancelled)
 * renders as a read-only history entry, per this task's explicit
 * ACTIVE-vs-HISTORY example. History is never hidden — see
 * buyer-search-section.tsx, which renders every requirement the backend
 * returns, not just the active one.
 */
export function BuyerRequirementCard({
  requirement,
  contactId,
  onChanged,
  existingInterests,
  onPropertyAssigned,
}: {
  requirement: BuyerRequirement;
  contactId: string;
  onChanged: (requirement: BuyerRequirement) => void;
  existingInterests?: PropertyInterest[];
  onPropertyAssigned?: () => void;
}) {
  const isActive = requirement.status === "active";
  const [showMatches, setShowMatches] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (typeof window !== "undefined" && !window.confirm("Cancel this search? It will stay visible in this contact's history.")) {
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    const response = await updateBuyerRequirement(requirement.id, { status: "cancelled" });
    setIsCancelling(false);
    if (!response.ok) {
      setCancelError(getApiErrorMessage(response.error));
      return;
    }
    onChanged(response.data);
  }

  const budget = formatBudgetRange(requirement.budget_min, requirement.budget_max, requirement.currency);
  const bedrooms = formatMinMax(requirement.bedrooms_min, requirement.bedrooms_max);
  const bathrooms = formatMinMax(requirement.bathrooms_min, requirement.bathrooms_max);
  const construction = formatMinMax(requirement.construction_m2_min, requirement.construction_m2_max, " m²");
  const locations = formatLocations(requirement.locations);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("border-transparent", getRequirementStatusBadgeClassName(requirement.status))}>
              {formatRequirementStatus(requirement.status)}
            </Badge>
            {requirement.property_type && <span className="text-sm font-medium">{formatPropertyType(requirement.property_type)}</span>}
            {requirement.purpose && <span className="text-xs text-muted-foreground">{formatPurpose(requirement.purpose)}</span>}
          </div>
          <p className="mt-1.5 text-sm font-semibold">{budget}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {bedrooms && <span>{bedrooms} bedrooms</span>}
            {bathrooms && <span>{bathrooms} bathrooms</span>}
            {construction && <span>{construction} construction</span>}
          </div>
          {locations && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {locations}
            </p>
          )}
          {requirement.features.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {requirement.features.map((feature) => (
                <Badge key={feature.feature_key} variant="secondary" className="text-[10px]">
                  {feature.feature_key}
                </Badge>
              ))}
            </div>
          )}
          {requirement.notes && <p className="mt-1.5 text-xs text-muted-foreground">{requirement.notes}</p>}
        </div>

        {isActive && (
          <div className="flex shrink-0 items-center gap-1">
            <BuyerRequirementForm
              contactId={contactId}
              requirement={requirement}
              trigger={
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              }
              onSaved={onChanged}
            />
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
              Cancel
            </Button>
          </div>
        )}
      </div>

      <FormError message={cancelError} />

      {isActive && (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setShowMatches((value) => !value)}>
            {showMatches ? "Hide property matches" : "See property matches"}
          </Button>
          {showMatches && (
            <div className="mt-3">
              <PropertyMatchList
                requirementId={requirement.id}
                contactId={contactId}
                existingInterests={existingInterests}
                onAssigned={onPropertyAssigned}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
