import { Badge } from "@/components/ui/badge";
import { formatTaskPriority, getTaskPriorityBadgeClassName } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

/** `priority` is the backend's real Task priority soft-enum string — see features/tasks/types.ts. */
export function TaskPriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getTaskPriorityBadgeClassName(priority), className)}>
      {formatTaskPriority(priority)}
    </Badge>
  );
}
