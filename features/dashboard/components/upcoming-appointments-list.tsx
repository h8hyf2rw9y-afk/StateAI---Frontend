import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { Appointment } from "@/features/appointments/types";
import { formatShortDate } from "@/lib/format";

export function UpcomingAppointmentsList({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing on the calendar"
        description="Upcoming viewings, calls, and meetings will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {appointments.map((appt) => (
        <li key={appt.id}>
          <Link
            href="/appointments"
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
          >
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-muted py-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {formatShortDate(appt.date)}
              </span>
              <span className="text-xs font-semibold tabular-nums">{appt.time}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{appt.title}</p>
              <p className="truncate text-xs text-muted-foreground">{appt.leadName}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
