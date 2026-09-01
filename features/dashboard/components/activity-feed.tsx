import { CheckCircle2, FilePlus, MessageSquare, Trophy, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { ActivityItem, ActivityType } from "@/features/dashboard/types";
import { formatRelativeToToday } from "@/lib/format";

const TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  lead_created: UserPlus,
  status_changed: FilePlus,
  appointment_completed: CheckCircle2,
  note_added: MessageSquare,
  deal_won: Trophy,
};

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No recent activity"
        description="Actions your team takes across leads, deals, and appointments will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {activity.map((item) => {
        const Icon = TYPE_ICONS[item.type];
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{item.actorName}</span>{" "}
                <span className="text-muted-foreground">{item.description}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeToToday(item.timestamp.slice(0, 10))}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
