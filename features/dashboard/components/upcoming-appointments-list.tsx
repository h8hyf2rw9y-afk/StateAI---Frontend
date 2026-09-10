import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { AppointmentRecord } from "@/features/appointments/types";
import { formatTime, formatTimestamp } from "@/lib/format";

/**
 * Real upcoming appointments (see features/dashboard/lib.ts's
 * getUpcomingAppointments, reusing the already-established
 * isAppointmentUpcoming) — replaces the old mock version, which used
 * separate `.date`/`.time` string fields and a flat `.leadName`. The real
 * AppointmentRecord has one ISO `start_at` instead, formatted the same way
 * the real Appointments list already does (formatTimestamp/formatTime, not
 * formatShortDate — that one's parseLocalDate assumes a bare "YYYY-MM-DD"
 * and would misparse a full timestamp) — and no contact name baked in;
 * `contactName` is resolved
 * by the parent Dashboard page from the real Contacts list, same
 * join-by-id convention OpportunityCard already established, so it can be
 * `null` (appointments aren't required to have a contact) without pretending
 * a name exists.
 */
export function UpcomingAppointmentsList({
  appointments,
  contactNameById,
}: {
  appointments: AppointmentRecord[];
  contactNameById: Map<string, string>;
}) {
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
            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-muted py-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {formatTimestamp(appt.start_at)}
              </span>
              <span className="text-xs font-semibold tabular-nums">{formatTime(appt.start_at)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{appt.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {appt.contact_id ? (contactNameById.get(appt.contact_id) ?? "Unknown contact") : "No contact linked"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
