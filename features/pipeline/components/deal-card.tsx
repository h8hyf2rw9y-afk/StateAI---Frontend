import { Building2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Deal } from "@/features/pipeline/types";
import { formatCurrency, formatShortDate, getInitials } from "@/lib/format";

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Card size="sm" className="gap-2.5">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{deal.leadName}</p>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatCurrency(deal.value, deal.currency)}
          </span>
        </div>

        {deal.propertyName && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" />
            <span className="truncate">{deal.propertyName}</span>
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            {formatShortDate(deal.expectedCloseDate)}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{deal.probability}%</span>
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">
                {getInitials(deal.agentName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
