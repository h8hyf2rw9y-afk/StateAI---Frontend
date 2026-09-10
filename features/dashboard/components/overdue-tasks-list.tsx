import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/features/tasks/types";
import { formatTaskPriority, getTaskPriorityBadgeClassName } from "@/features/tasks/types";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The Dashboard's "what needs attention right now" widget — real overdue
 * Tasks (see features/dashboard/lib.ts's getOverdueTasks, reusing the
 * already-established isTaskOverdue). Replaces the old mock PrioritiesList,
 * which merged three fabricated sources (a mock lead's `followUpDate`,
 * mock appointments, and fake AI recommendations) into one list — no single
 * one of those has a real backend equivalent worth preserving here, and
 * Upcoming Appointments already gets its own real, separate widget below
 * this one, so this widget's job is simply "overdue tasks," not a merge.
 */
export function OverdueTasksList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing overdue"
        description="Tasks past their due date will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href="/tasks"
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="truncate text-xs text-muted-foreground">Due {formatTimestamp(task.due_at)}</p>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 border-transparent capitalize", getTaskPriorityBadgeClassName(task.priority))}
            >
              {formatTaskPriority(task.priority)}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
