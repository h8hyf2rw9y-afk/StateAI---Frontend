import { Badge } from "@/components/ui/badge";
import { formatAppointmentStatus, getAppointmentStatusBadgeClassName } from "@/features/appointments/types";
import { cn } from "@/lib/utils";

/**
 * `status` is the backend's real Appointment status soft-enum string — a
 * plain `string`, never re-validated as a strict union, so this falls back
 * gracefully for anything unmapped, matching every other real-backend
 * status badge in this app (PropertyStatusBadge, Pipeline's StageBadge).
 * (The old mock `AppointmentStatus` union this component briefly rendered
 * was removed in the CRM Integration Gaps task, once the Dashboard — its
 * last remaining caller — was rewired to real data.)
 */
export function AppointmentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getAppointmentStatusBadgeClassName(status), className)}>
      {formatAppointmentStatus(status)}
    </Badge>
  );
}
