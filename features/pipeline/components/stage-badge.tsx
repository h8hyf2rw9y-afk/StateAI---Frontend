import { Badge } from "@/components/ui/badge";
import { formatOpportunityStage, getOpportunityStageBadgeClassName } from "@/features/pipeline/types";
import { cn } from "@/lib/utils";

/**
 * `stage` is the backend's real Opportunity stage soft-enum string (one of
 * the 13 values in OPPORTUNITY_STAGE_VALUES). (The old mock 7-value
 * `PipelineStage` this component briefly rendered was removed in the CRM
 * Integration Gaps task, once the Dashboard — its last remaining caller —
 * was rewired to real data; the real Leads table never used it.)
 */
export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getOpportunityStageBadgeClassName(stage), className)}>
      {formatOpportunityStage(stage)}
    </Badge>
  );
}
