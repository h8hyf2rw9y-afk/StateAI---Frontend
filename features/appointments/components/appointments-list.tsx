"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FileSignature,
  Home,
  Loader2,
  PenLine,
  Pencil,
  Phone,
  Search,
  Users as UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { FormError } from "@/features/auth/components/form-error";
import { AppointmentStatusBadge } from "@/features/appointments/components/appointment-status-badge";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import {
  formatAppointmentStatus,
  formatAppointmentType,
  type AppointmentRecord,
} from "@/features/appointments/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getAppointments } from "@/lib/api/appointments";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getOpportunities } from "@/lib/api/pipeline";
import { formatTime, formatTimestamp, getInitials } from "@/lib/format";
import { useUser } from "@/hooks/useUser";

type Status = "loading" | "success" | "error";

const TYPE_ICONS: Record<string, LucideIcon> = {
  showing: Home,
  call: Phone,
  meeting: UsersIcon,
  notary: FileSignature,
  signing: PenLine,
  other: CalendarClock,
};

/** Same "no /users endpoint, so only the signed-in user's own identity can ever be resolved" reasoning as app/(dashboard)/pipeline/[id]/page.tsx's getOwnerLabel — kept as a separate, small local copy rather than a shared import; see features/appointments/types.ts's AppointmentRecord doc comment for why this task didn't retroactively refactor Pipeline's own copy. */
function getAssigneeLabel(assignedToUserId: string | null, currentUserId: string | undefined): string {
  if (assignedToUserId === null) return "Unassigned";
  if (assignedToUserId === currentUserId) return "You";
  return "Another team member";
}

function groupByDay(appointments: AppointmentRecord[]) {
  const groups = new Map<string, AppointmentRecord[]>();
  for (const appt of appointments) {
    const key = new Date(appt.start_at).toDateString();
    const list = groups.get(key) ?? [];
    list.push(appt);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

/**
 * Real backend appointments, fetched on mount — the actual CRM source of
 * truth (app/api/routes/appointments.py), not features/appointments/mock-data.ts.
 * Same self-fetching shape as features/properties/components/properties-grid.tsx
 * and features/pipeline/components/pipeline-board.tsx: loading/error/empty
 * states, a search box and a status filter (both client-side only — the
 * backend has no text-search endpoint, and while it does support a
 * `status` query filter, this fetches the full list once and filters
 * client-side, matching how Properties/Pipeline already handle their own
 * filters rather than round-tripping on every change), day-grouping
 * (ported from the old mock UI, now driven by the real, already
 * start_at-ascending-sorted data the backend returns), and contact/
 * property/opportunity names resolved client-side from the real lists
 * (joined by id) and linked to their real detail pages.
 *
 * No "sort by" control: the backend has exactly one order
 * (`start_at ASC`, app/repositories/appointment_repo.py) and no sort
 * parameter — inventing a client-side "sort by" would imply a server
 * capability that doesn't exist, so this only ever shows that one order.
 */
export function AppointmentsList() {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>("loading");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({});
  const [opportunityTitles, setOpportunityTitles] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [appointmentsRes, contactsRes, propertiesRes, opportunitiesRes] = await Promise.all([
        getAppointments(),
        getContacts(),
        getProperties(),
        getOpportunities(),
      ]);
      if (cancelled) return;

      if (!appointmentsRes.ok) {
        setErrorMessage(getApiErrorMessage(appointmentsRes.error));
        setStatus("error");
        return;
      }

      setAppointments(appointmentsRes.data);

      // Name lookups are a display convenience — if any of these three
      // secondary calls fails, the list still renders with a plain
      // fallback label per row rather than failing the whole page, same
      // principle as PipelineBoard's own contact/property lookups.
      if (contactsRes.ok) {
        setContactNames(Object.fromEntries(contactsRes.data.map((c) => [c.id, `${c.first_name} ${c.last_name}`])));
      }
      if (propertiesRes.ok) {
        setPropertyNames(Object.fromEntries(propertiesRes.data.map((p) => [p.id, p.title])));
      }
      if (opportunitiesRes.ok) {
        setOpportunityTitles(Object.fromEntries(opportunitiesRes.data.map((o) => [o.id, o.title])));
      }

      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableStatuses = useMemo(() => Array.from(new Set(appointments.map((a) => a.status))).sort(), [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((appt) => {
      const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
      const contactName = appt.contact_id ? (contactNames[appt.contact_id] ?? "") : "";
      const matchesQuery =
        q.length === 0 || appt.title.toLowerCase().includes(q) || contactName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [appointments, query, statusFilter, contactNames]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border p-6">
        <FormError message={errorMessage} />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={CalendarClock}
          title="No appointments scheduled"
          description="New viewings, calls, and meetings will show up here once they're booked."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or contact…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {availableStatuses.length > 0 && (
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="sm:w-48" aria-label="Status">
              <SelectValue placeholder="All statuses">
                {(value: string | null) => (!value || value === "all" ? "All statuses" : formatAppointmentStatus(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {availableStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatAppointmentStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groupByDay(filtered).map(([day, dayAppointments]) => (
            <div key={day} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">{formatTimestamp(dayAppointments[0].start_at)}</h3>
              <div className="flex flex-col gap-2.5">
                {dayAppointments.map((appt) => {
                  const Icon = TYPE_ICONS[appt.appointment_type] ?? CalendarClock;
                  const contactName = appt.contact_id ? contactNames[appt.contact_id] : undefined;
                  const propertyName = appt.property_id ? propertyNames[appt.property_id] : undefined;
                  const opportunityTitle = appt.opportunity_id ? opportunityTitles[appt.opportunity_id] : undefined;

                  return (
                    <Card key={appt.id} size="sm">
                      <CardContent className="flex items-center gap-4">
                        <div className="flex w-16 shrink-0 flex-col items-center justify-center">
                          <span className="text-sm font-semibold tabular-nums">{formatTime(appt.start_at)}</span>
                        </div>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{appt.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatAppointmentType(appt.appointment_type)}
                            {appt.contact_id && (
                              <>
                                {" · "}
                                <Link href={`/leads/${appt.contact_id}`} className="hover:text-foreground hover:underline">
                                  {contactName ?? "Unknown contact"}
                                </Link>
                              </>
                            )}
                            {appt.property_id && (
                              <>
                                {" · "}
                                <Link
                                  href={`/properties/${appt.property_id}`}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {propertyName ?? "Unknown property"}
                                </Link>
                              </>
                            )}
                            {appt.opportunity_id && (
                              <>
                                {" · "}
                                <Link
                                  href={`/pipeline/${appt.opportunity_id}`}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {opportunityTitle ?? "Opportunity"}
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        <AppointmentStatusBadge status={appt.status} className="hidden shrink-0 sm:inline-flex" />
                        <Avatar className="size-7 shrink-0" title={getAssigneeLabel(appt.assigned_to_user_id, user?.id)}>
                          <AvatarFallback className="text-[10px]">
                            {getInitials(getAssigneeLabel(appt.assigned_to_user_id, user?.id))}
                          </AvatarFallback>
                        </Avatar>
                        <AppointmentForm
                          appointment={appt}
                          onSaved={(updated) =>
                            setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                          }
                          trigger={
                            <Button size="icon-sm" variant="ghost" aria-label="Edit appointment">
                              <Pencil className="size-3.5" />
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="No appointments match your filters"
          description="Try a different search term or clear the status filter."
        />
      )}
    </div>
  );
}
