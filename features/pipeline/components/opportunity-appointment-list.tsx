import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  isAppointmentUpcoming,
  type OpportunityAppointment,
} from "@/features/pipeline/types";
import { formatTimestamp } from "@/lib/format";

/** Appointments linked to this opportunity (GET /appointments?opportunity_id=...), with an "Upcoming" flag computed from `start_at`/`status` (see isAppointmentUpcoming) — same client-side-comparison approach as OpportunityTaskList's "Overdue" flag. */
export function OpportunityAppointmentList({ appointments }: { appointments: OpportunityAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No appointments yet"
        description="Viewings, calls, and meetings linked to this opportunity will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => {
        const upcoming = isAppointmentUpcoming(appointment);
        return (
          <li key={appointment.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{appointment.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{formatAppointmentType(appointment.appointment_type)}</Badge>
                <Badge variant="outline">{formatAppointmentStatus(appointment.status)}</Badge>
                {upcoming && <Badge variant="secondary">Upcoming</Badge>}
              </div>
              {appointment.location && <p className="text-xs text-muted-foreground">{appointment.location}</p>}
            </div>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
              {formatTimestamp(appointment.start_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
