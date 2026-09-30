import Link from "next/link";
import { Building2, Calendar, ChevronDown, Loader2, UserRound } from "lucide-react";
import { OPPORTUNITY_STAGES_BY_TYPE, formatOpportunityStage, formatOpportunityValue, type Opportunity, type OpportunityType } from "@/features/pipeline/types";
import { formatTimestamp } from "@/lib/format";

/**
 * One opportunity on the real Pipeline board — replaces the old mock
 * `DealCard` (deal-card.tsx, deleted; nothing else imported it). `contactName`/
 * `propertyName` are resolved by the parent board from the real Contacts/
 * Properties lists (joined client-side by id, same pattern the backend
 * itself uses — no name is ever duplicated onto the Opportunity row) —
 * `propertyName` is `null` both when the opportunity has no `property_id`
 * and while the lookup is still loading, so the property line simply
 * doesn't render rather than showing a stale placeholder.
 */
export function OpportunityCard({
  opportunity,
  contactName,
  propertyName,
  isMoving,
  onStageChange,
}: {
  opportunity: Opportunity;
  contactName: string;
  propertyName: string | null;
  isMoving: boolean;
  onStageChange: (stage: string) => void;
}) {
  const stages = OPPORTUNITY_STAGES_BY_TYPE[opportunity.opportunity_type as OpportunityType] ?? [];

  return (
    <article className="flex flex-col gap-2.5 rounded-md border bg-background p-3 transition-colors hover:bg-muted/20">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/pipeline/${opportunity.id}`} className="font-medium leading-snug hover:underline">
              {opportunity.title}
            </Link>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatOpportunityValue(opportunity.expected_value, opportunity.currency)}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">{contactName}</span>
          </p>

          {propertyName && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{propertyName}</span>
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {opportunity.expected_close_date && (
                <>
                  <Calendar className="size-3.5" />
                  {formatTimestamp(opportunity.expected_close_date)}
                </>
              )}
            </p>
            {opportunity.probability !== null && (
              <span className="text-xs text-muted-foreground">{opportunity.probability}%</span>
            )}
          </div>

      <div className="relative border-t pt-2">
        <select
          value={opportunity.stage}
          disabled={isMoving}
          onChange={(event) => onStageChange(event.target.value)}
          aria-label={`Change stage for ${opportunity.title}`}
          className="h-7 w-full appearance-none rounded-sm bg-transparent px-1 pr-6 text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {stages.map((stage) => (
            <option key={stage} value={stage}>{formatOpportunityStage(stage)}</option>
          ))}
        </select>
        {isMoving ? (
          <Loader2 className="pointer-events-none absolute top-3 right-1 size-3 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="pointer-events-none absolute top-3 right-1 size-3 text-muted-foreground" />
        )}
      </div>
    </article>
  );
}
