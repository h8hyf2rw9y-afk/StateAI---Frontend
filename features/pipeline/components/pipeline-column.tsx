import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { OpportunityCard } from "@/features/pipeline/components/opportunity-card";
import type { Opportunity } from "@/features/pipeline/types";
import { formatCurrency } from "@/lib/format";

/**
 * One column per real Opportunity stage actually present in the board's
 * data (see OpportunitiesBoard — never a fixed 13-column layout, most of
 * which would be empty for any one organization/type filter). `contactName`/
 * `propertyName` lookup maps are threaded down from the board, which is the
 * one place that fetches Contacts/Properties.
 */
export function PipelineColumn({
  stage,
  opportunities,
  contactNames,
  propertyNames,
}: {
  stage: string;
  opportunities: Opportunity[];
  contactNames: Record<string, string>;
  propertyNames: Record<string, string>;
}) {
  const totalValue = opportunities.reduce((sum, o) => sum + Number(o.expected_value ?? 0), 0);
  const currency = opportunities[0]?.currency ?? "MXN";

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/40 p-3">
      <div className="flex items-center justify-between px-0.5">
        <StageBadge stage={stage} />
        <span className="text-xs text-muted-foreground">{opportunities.length}</span>
      </div>
      <p className="px-0.5 text-xs text-muted-foreground">
        {opportunities.length > 0 ? formatCurrency(totalValue, currency) : "—"}
      </p>
      <div className="flex flex-col gap-2.5">
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            contactName={contactNames[opportunity.contact_id] ?? "Unknown contact"}
            propertyName={opportunity.property_id ? (propertyNames[opportunity.property_id] ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}
