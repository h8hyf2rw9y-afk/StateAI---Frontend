import { ListTodo } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatTaskPriority,
  formatTaskStatus,
  isTaskOverdue,
  type OpportunityTask,
} from "@/features/pipeline/types";
import { formatTimestamp } from "@/lib/format";

/**
 * Tasks linked to this opportunity (GET /tasks?opportunity_id=...), with an
 * "Overdue" flag computed from `due_at`/`status` (see isTaskOverdue) rather
 * than a stored field — the backend has no `is_overdue` column, this is a
 * plain client-side comparison against "now", same as the property/lead
 * pages never fabricate a field the backend doesn't return.
 */
export function OpportunityTaskList({ tasks }: { tasks: OpportunityTask[] }) {
  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks yet" description="Tasks linked to this opportunity will show up here." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => {
        const overdue = isTaskOverdue(task);
        return (
          <li key={task.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{task.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{formatTaskStatus(task.status)}</Badge>
                <Badge variant="outline">{formatTaskPriority(task.priority)}</Badge>
                {overdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </div>
            <span className={cn("shrink-0 text-xs whitespace-nowrap", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              Due {formatTimestamp(task.due_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
