import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { AiRecommendation, RecommendationPriority } from "@/features/ai/types";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

/**
 * Structured recommendation placeholders — the copy and priority are
 * hand-written mock data, not live model output. See features/ai/mock-data.ts.
 */
export function RecommendationList({ recommendations }: { recommendations: AiRecommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No recommendations right now"
        description="The AI agents will surface next-best actions here once they're connected to live pipeline data."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {recommendations.map((rec) => (
        <div key={rec.id} className="flex items-start gap-3 rounded-lg border p-3.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{rec.title}</p>
              <Badge
                variant="outline"
                className={cn("shrink-0 border-transparent capitalize", PRIORITY_STYLES[rec.priority])}
              >
                {rec.priority}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
