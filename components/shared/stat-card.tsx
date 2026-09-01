import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Positive/negative trend vs. the previous period. Omit when there's nothing to compare against yet. */
  trend?: { value: string; direction: "up" | "down" };
}

/** Compact KPI tile used on the dashboard overview. */
export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 text-xs font-medium",
                trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </p>
          )}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
