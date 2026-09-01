import { CalendarClock, Home, Phone, Users as UsersIcon, Handshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { APPOINTMENT_TYPE_LABELS, type Appointment, type AppointmentType } from "@/features/appointments/types";
import { formatDate, getInitials } from "@/lib/format";

const TYPE_ICONS: Record<AppointmentType, LucideIcon> = {
  viewing: Home,
  call: Phone,
  meeting: UsersIcon,
  closing: Handshake,
  other: CalendarClock,
};

function groupByDate(appointments: Appointment[]) {
  const sorted = [...appointments].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );
  const groups = new Map<string, Appointment[]>();
  for (const appt of sorted) {
    const list = groups.get(appt.date) ?? [];
    list.push(appt);
    groups.set(appt.date, list);
  }
  return Array.from(groups.entries());
}

export function AppointmentsList({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No appointments scheduled"
        description="New viewings, calls, and meetings will show up here once they're booked."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupByDate(appointments).map(([date, dayAppointments]) => (
        <div key={date} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{formatDate(date)}</h3>
          <div className="flex flex-col gap-2.5">
            {dayAppointments.map((appt) => {
              const Icon = TYPE_ICONS[appt.type];
              return (
                <Card key={appt.id} size="sm">
                  <CardContent className="flex items-center gap-4">
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center">
                      <span className="text-sm font-semibold tabular-nums">{appt.time}</span>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{appt.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {APPOINTMENT_TYPE_LABELS[appt.type]} · {appt.leadName}
                        {appt.propertyName ? ` · ${appt.propertyName}` : ""}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appt.status} className="hidden shrink-0 sm:inline-flex" />
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(appt.agentName)}
                      </AvatarFallback>
                    </Avatar>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
