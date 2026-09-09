import { Badge } from "@/components/ui/badge";
import { formatOpportunityStage, getOpportunityStageBadgeClassName } from "@/features/pipeline/types";
import { cn } from "@/lib/utils";

/**
 * `stage` is the backend's real Opportunity stage soft-enum string (one of
 * the 13 values in OPPORTUNITY_STAGE_VALUES) — not the old mock
 * 7-value `PipelineStage` this component used to render (that type still
 * exists, for the Leads table's status column and the Dashboard, but
 * `StageBadge` itself has no other caller — see features/pipeline/types.ts).
 */
export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getOpportunityStageBadgeClassName(stage), className)}>
      {formatOpportunityStage(stage)}
    </Badge>
  );
}
