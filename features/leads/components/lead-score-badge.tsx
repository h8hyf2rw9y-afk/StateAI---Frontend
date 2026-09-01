import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Score thresholds that back both the visual badge and the "hot leads" dashboard filter — keep them in sync. */
export function isHotLead(score: number): boolean {
  return score >= 80;
}

function getScoreTier(score: number): { label: string; className: string } {
  if (score >= 80)
    return {
      label: "Hot",
      className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    };
  if (score >= 50)
    return {
      label: "Warm",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    };
  return {
    label: "Cold",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  };
}

/** Numeric AI lead score paired with a hot/warm/cold tier chip. */
export function LeadScoreBadge({ score }: { score: number }) {
  const tier = getScoreTier(score);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold tabular-nums">{score}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
          tier.className
        )}
      >
        {tier.label === "Hot" && <Flame className="size-3" />}
        {tier.label}
      </span>
    </div>
  );
}
