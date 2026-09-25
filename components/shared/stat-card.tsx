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
    <Card className="group relative overflow-hidden border-border/70 bg-card/55 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card/80">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="flex items-start justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
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
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.07] text-primary transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
