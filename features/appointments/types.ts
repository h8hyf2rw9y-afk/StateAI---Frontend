// ---------------------------------------------------------------------------
// Mock/demo appointment shape — still used by app/(dashboard)/dashboard/page.tsx
// (via features/appointments/mock-data.ts's `mockAppointments`) and
// features/dashboard/components/{priorities-list,upcoming-appointments-list}.tsx,
// all of which import the `Appointment` type by name (not just the mock
// array — unlike features/properties/mock-data.ts's old `Property`, this
// name can't be freed up the same way without also touching the Dashboard,
// which is explicitly out of scope for the task that made this feature's
// list page real). Left untouched, same reasoning features/leads/types.ts
// already documents for `Lead` vs `Contact`: this shape (`date`/`time`/
// `durationMinutes`/`leadName`/`agentName`) has no real backend equivalent
// (see `AppointmentRecord` below) and is still load-bearing for the
// Dashboard. The real Appointments page
// (app/(dashboard)/appointments/page.tsx) no longer uses `Appointment`,
// `AppointmentType`, or `AppointmentStatus` — see `AppointmentRecord` below.
// ---------------------------------------------------------------------------

export const APPOINTMENT_TYPES = [
  "viewing",
  "call",
  "meeting",
  "closing",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  viewing: "Property Viewing",
  call: "Call",
  meeting: "Meeting",
  closing: "Closing",
  other: "Other",
};

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO date, e.g. "2026-09-03"
  time: string; // "10:30"
  durationMinutes: number;
  leadId: string;
  leadName: string;
  propertyId: string | null;
  propertyName: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  agentId: string;
  agentName: string;
}

// ---------------------------------------------------------------------------
// Real backend Appointment — mirrors app/schemas/appointment.py's
// AppointmentRead field-for-field (see lib/api/appointments.ts). A separate
// type from `Appointment` above for the same reason `Contact`/`Property`/
// `Opportunity` are separate from their mock counterparts elsewhere in this
// app — no field here is fabricated, and nothing here is consolidated with
// the mock shape the Dashboard still depends on.
//
// Note for future readers: features/pipeline/types.ts independently defines
// its own `OpportunityAppointment` (identical shape, for the appointments
// shown on one opportunity's detail page) rather than importing this type.
// That's accepted, documented duplication, not an oversight — this feature
// didn't exist yet when Pipeline was built, and retroactively refactoring
// Pipeline's already-shipped, already-tested files to share this type was
// judged out of scope for a task whose brief was specifically "integrate
// the Appointments frontend," not "de-duplicate Pipeline." A future cleanup
// could have Pipeline import `AppointmentRecord` from here instead.
// ---------------------------------------------------------------------------

export interface AppointmentRecord {
  id: string;
  organization_id: string;
  created_by_user_id: string | null;
  assigned_to_user_id: string | null;
  contact_id: string | null;
  property_id: string | null;
  opportunity_id: string | null;
  title: string;
  description: string | null;
  start_at: string; // ISO timestamp
  end_at: string; // ISO timestamp
  location: string | null;
  status: string;
  appointment_type: string;
  external_calendar_event_id: string | null;
  external_calendar_provider: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * `status`/`appointment_type` are typed as plain `string` on
 * `AppointmentRecord` above (matching the backend's own read schema, which
 * doesn't re-validate them as strict enums), so both format helpers below
 * fall back to the raw value for anything unmapped instead of crashing —
 * same convention as every other real-backend soft enum in this app
 * (formatPropertyType, formatOpportunityStage, ...).
 *
 * Confirmed against app/schemas/enums.py, not assumed from the mock's own
 * (differently-valued) AppointmentType/AppointmentStatus above:
 * `appointment_type` is showing/call/meeting/notary/signing/other — not
 * the mock's viewing/call/meeting/closing/other — and while `status`
 * happens to share the same five values as the mock's `AppointmentStatus`
 * (scheduled/confirmed/completed/cancelled/no_show), that's confirmed
 * coincidence, not a reused type — the real field is unvalidated `string`.
 */
const REAL_APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  showing: "Showing",
  call: "Call",
  meeting: "Meeting",
  notary: "Notary",
  signing: "Signing",
  other: "Other",
};

export function formatAppointmentType(appointmentType: string): string {
  return REAL_APPOINTMENT_TYPE_LABELS[appointmentType] ?? appointmentType;
}

const REAL_APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function formatAppointmentStatus(status: string): string {
  return REAL_APPOINTMENT_STATUS_LABELS[status] ?? status;
}

const REAL_APPOINTMENT_STATUS_BADGE_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  no_show: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

/** Falls back to the "scheduled" styling for any status not in the map above, matching getPropertyStatusBadgeClassName's fallback convention. */
export function getAppointmentStatusBadgeClassName(status: string): string {
  return REAL_APPOINTMENT_STATUS_BADGE_STYLES[status] ?? REAL_APPOINTMENT_STATUS_BADGE_STYLES.scheduled;
}

/** An appointment is upcoming when it's still scheduled/confirmed (not cancelled/completed/no-show) and hasn't started yet — computed client-side from real timestamps, never a stored/fabricated backend field (same convention as features/pipeline/types.ts's identically-named helper). */
export function isAppointmentUpcoming(appointment: Pick<AppointmentRecord, "start_at" | "status">): boolean {
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") return false;
  return new Date(appointment.start_at).getTime() >= Date.now();
}
