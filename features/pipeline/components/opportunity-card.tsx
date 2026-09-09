import Link from "next/link";
import { Building2, Calendar, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatOpportunityValue, type Opportunity } from "@/features/pipeline/types";
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
}: {
  opportunity: Opportunity;
  contactName: string;
  propertyName: string | null;
}) {
  return (
    <Link href={`/pipeline/${opportunity.id}`} className="block">
      <Card size="sm" className="gap-2.5 transition-colors hover:bg-muted/40">
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{opportunity.title}</p>
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
        </CardContent>
      </Card>
    </Link>
  );
}
