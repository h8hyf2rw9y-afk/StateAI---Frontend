import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { DealCard } from "@/features/pipeline/components/deal-card";
import type { Deal, PipelineStage } from "@/features/pipeline/types";
import { formatCurrency } from "@/lib/format";

export function PipelineColumn({ stage, deals }: { stage: PipelineStage; deals: Deal[] }) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/40 p-3">
      <div className="flex items-center justify-between px-0.5">
        <StageBadge stage={stage} />
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </div>
      <p className="px-0.5 text-xs text-muted-foreground">
        {deals.length > 0 ? formatCurrency(totalValue, deals[0].currency) : "—"}
      </p>
      <div className="flex flex-col gap-2.5">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
