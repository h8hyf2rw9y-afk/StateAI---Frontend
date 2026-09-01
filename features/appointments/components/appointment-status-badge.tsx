import { Badge } from "@/components/ui/badge";
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from "@/features/appointments/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  no_show: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[status], className)}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
