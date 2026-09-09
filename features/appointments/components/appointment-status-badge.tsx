import { Badge } from "@/components/ui/badge";
import { formatAppointmentStatus, getAppointmentStatusBadgeClassName } from "@/features/appointments/types";
import { cn } from "@/lib/utils";

/**
 * `status` is the backend's real Appointment status soft-enum string — not
 * the old mock `AppointmentStatus` union this component used to render
 * (that type still exists, for the Dashboard's mock appointment widgets,
 * but `AppointmentStatusBadge` itself has no other caller — see
 * features/appointments/types.ts). The five real values happen to be
 * spelled the same as the mock's, but this now accepts any string and
 * falls back gracefully, matching every other real-backend status badge in
 * this app (PropertyStatusBadge, Pipeline's StageBadge).
 */
export function AppointmentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", getAppointmentStatusBadgeClassName(status), className)}>
      {formatAppointmentStatus(status)}
    </Badge>
  );
}
