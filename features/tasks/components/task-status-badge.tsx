import { Badge } from "@/components/ui/badge";
import { formatTaskStatus, getTaskStatusBadgeClassName } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

/** `status` is the backend's real Task status soft-enum string — see features/tasks/types.ts. */
export function TaskStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getTaskStatusBadgeClassName(status), className)}>
      {formatTaskStatus(status)}
    </Badge>
  );
}
