"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { updateOpportunityStage } from "@/lib/api/pipeline";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  OPPORTUNITY_LOST_REASONS,
  OPPORTUNITY_STAGES_BY_TYPE,
  formatOpportunityLostReason,
  formatOpportunityStage,
  type Opportunity,
  type OpportunityType,
} from "@/features/pipeline/types";

/**
 * The one supported way to change an opportunity's stage — a plain select
 * plus an explicit "Save" button, not drag-and-drop (see pipeline-board.tsx's
 * own comment for why) and not an auto-save-on-change select (a stage
 * change is a real, auditable CRM action — see
 * app/services/opportunity_service.py's stage_change Activity + audit
 * record — so it should need a deliberate confirm, same spirit as this
 * app's AI panels never running automatically).
 *
 * Options are scoped to the opportunity's own `opportunity_type`
 * (OPPORTUNITY_STAGES_BY_TYPE — the same list OpportunityService itself
 * validates against server-side; this is a UX convenience, not the actual
 * enforcement). Picking "Lost" reveals a second, required reason select —
 * the backend 422s a `stage: "lost"` PATCH with no `lost_reason`
 * (OpportunityService._validate_lost_reason), so this collects it up front
 * instead of surfacing that as a raw error after the fact.
 */
export function StageSelector({
  opportunity,
  onUpdated,
}: {
  opportunity: Opportunity;
  onUpdated: (updated: Opportunity) => void;
}) {
  const [selectedStage, setSelectedStage] = useState(opportunity.stage);
  const [lostReason, setLostReason] = useState(opportunity.lost_reason ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableStages = OPPORTUNITY_STAGES_BY_TYPE[opportunity.opportunity_type as OpportunityType] ?? [];
  const isLost = selectedStage === "lost";
  const hasChange = selectedStage !== opportunity.stage || (isLost && lostReason !== (opportunity.lost_reason ?? ""));
  const canSave = hasChange && (!isLost || lostReason !== "");

  async function handleSave() {
    if (!canSave || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const response = await updateOpportunityStage(opportunity.id, {
      stage: selectedStage,
      lost_reason: isLost ? lostReason : null,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }

    onUpdated(response.data);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedStage} onValueChange={(value) => value && setSelectedStage(value)}>
          <SelectTrigger className="w-56" aria-label="Stage">
            <SelectValue>{(value: string | null) => (value ? formatOpportunityStage(value) : "Stage")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableStages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {formatOpportunityStage(stage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLost && (
          <Select value={lostReason} onValueChange={(value) => setLostReason(value ?? "")}>
            <SelectTrigger className="w-56" aria-label="Lost reason">
              <SelectValue placeholder="Reason for losing it">
                {(value: string | null) => (value ? formatOpportunityLostReason(value) : "Reason for losing it")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OPPORTUNITY_LOST_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {formatOpportunityLostReason(reason)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasChange && (
          <Button size="sm" onClick={handleSave} disabled={!canSave || isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Save stage
          </Button>
        )}
      </div>

      {error && <FormError message={error} />}
    </div>
  );
}
