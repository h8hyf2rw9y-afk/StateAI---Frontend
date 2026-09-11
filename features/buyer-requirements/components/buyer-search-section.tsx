"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { BuyerRequirementForm } from "@/features/buyer-requirements/components/buyer-requirement-form";
import { BuyerRequirementCard } from "@/features/buyer-requirements/components/buyer-requirement-card";
import { PropertyInterestRow } from "@/features/buyer-requirements/components/property-interest-row";
import { getBuyerRequirementsForContact } from "@/lib/api/buyer-requirements";
import { getPropertyInterestsForContact } from "@/lib/api/property-interests";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { BuyerRequirement, PropertyInterest } from "@/features/buyer-requirements/types";

type Status = "loading" | "success" | "error";

/**
 * "What is this client looking for?" — rendered on the lead detail page
 * (app/(dashboard)/leads/[id]/page.tsx). Covers both CRM cases: Case A
 * (PropertyInterest — interested in one specific property) and Case B
 * (BuyerRequirement — searching by criteria). Every requirement the
 * backend returns is shown, split into an ACTIVE section and a HISTORY
 * section (paused/fulfilled/cancelled) — history is never hidden, per
 * this task's explicit rule that a contact's evolution (e.g. a rejected
 * property followed by a new search) must stay visible, not be silently
 * replaced.
 */
export function BuyerSearchSection({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [requirements, setRequirements] = useState<BuyerRequirement[]>([]);
  const [interests, setInterests] = useState<PropertyInterest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [requirementsResponse, interestsResponse] = await Promise.all([
        getBuyerRequirementsForContact(contactId),
        getPropertyInterestsForContact(contactId),
      ]);
      if (cancelled) return;

      if (!requirementsResponse.ok) {
        setErrorMessage(getApiErrorMessage(requirementsResponse.error));
        setStatus("error");
        return;
      }
      if (!interestsResponse.ok) {
        setErrorMessage(getApiErrorMessage(interestsResponse.error));
        setStatus("error");
        return;
      }

      setRequirements(requirementsResponse.data);
      setInterests(interestsResponse.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  function handleRequirementSaved(saved: BuyerRequirement) {
    setRequirements((current) => {
      const exists = current.some((r) => r.id === saved.id);
      return exists ? current.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...current];
    });
  }

  /** Called after "Assign to client" successfully creates a PropertyInterest (see property-match-list.tsx) — refetches rather than guessing the new row's full shape locally. */
  async function handlePropertyAssigned() {
    const response = await getPropertyInterestsForContact(contactId);
    if (response.ok) setInterests(response.data);
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-10 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading buyer search…</p>
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

  const activeRequirements = requirements.filter((r) => r.status === "active");
  const historicalRequirements = requirements.filter((r) => r.status !== "active");

  return (
    <div className="flex flex-col gap-4">
      {interests.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Property interests</p>
          <div className="flex flex-col gap-2">
            {interests.map((interest) => (
              <PropertyInterestRow key={interest.id} interest={interest} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {activeRequirements.length > 0 ? "Active search" : "Property search"}
          </p>
          <BuyerRequirementForm
            contactId={contactId}
            trigger={
              <Button variant="outline" size="sm">
                <Plus /> New search
              </Button>
            }
            onSaved={handleRequirementSaved}
          />
        </div>

        {activeRequirements.length === 0 && interests.length === 0 && historicalRequirements.length === 0 ? (
          <EmptyState icon={Search} title="No active property search yet." description="Start one with “New search” above." />
        ) : (
          <>
            {activeRequirements.length === 0 && (
              <p className="text-sm text-muted-foreground">No active property search yet.</p>
            )}
            <div className="flex flex-col gap-3">
              {activeRequirements.map((requirement) => (
                <BuyerRequirementCard
                  key={requirement.id}
                  requirement={requirement}
                  contactId={contactId}
                  onChanged={handleRequirementSaved}
                  existingInterests={interests}
                  onPropertyAssigned={handlePropertyAssigned}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {historicalRequirements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">History</p>
          <div className="flex flex-col gap-3">
            {historicalRequirements.map((requirement) => (
              <BuyerRequirementCard
                key={requirement.id}
                requirement={requirement}
                contactId={contactId}
                onChanged={handleRequirementSaved}
                existingInterests={interests}
                onPropertyAssigned={handlePropertyAssigned}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
