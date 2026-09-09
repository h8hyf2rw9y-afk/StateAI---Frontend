import { History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatActivityType, type Activity } from "@/features/pipeline/types";
import { formatTimestamp } from "@/lib/format";

/**
 * The opportunity's own history — including every `stage_change` entry
 * OpportunityService writes automatically (see lib/api/pipeline.ts's
 * getOpportunityActivities). Rendered in the order the backend returns
 * them (oldest first — ActivityService.list_for_opportunity's own
 * convention), so a stage's progression reads top-to-bottom like a log.
 */
export function OpportunityActivityList({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState icon={History} title="No activity yet" description="Calls, messages, and stage changes will show up here." />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Badge variant={activity.activity_type === "stage_change" ? "secondary" : "outline"}>
                {formatActivityType(activity.activity_type)}
              </Badge>
              {activity.direction && (
                <span className="text-xs text-muted-foreground capitalize">{activity.direction}</span>
              )}
            </div>
            <p className="text-sm">{activity.notes}</p>
          </div>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
            {formatTimestamp(activity.occurred_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
