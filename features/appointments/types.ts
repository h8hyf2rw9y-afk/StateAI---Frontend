// ---------------------------------------------------------------------------
// Real backend Appointment — mirrors app/schemas/appointment.py's
// AppointmentRead field-for-field (see lib/api/appointments.ts).
//
// This file used to also define a mock `Appointment` type (separate
// `date`/`time`/`durationMinutes`/`leadName`/`agentName` fields, plus
// AppointmentType/AppointmentStatus/APPOINTMENT_TYPES/APPOINTMENT_STATUSES
// for it) — kept around only because the mock Dashboard was its last real
// consumer. Removed in the CRM Integration Gaps task once the Dashboard was
// rewired to real data; the real Appointments page never used them.
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

/** For populating the create/edit form's type picker — derived from the same label map as formatAppointmentType, so the two can't drift apart. Named `REAL_*` (not `APPOINTMENT_TYPES`) because that name is already taken by the mock section above, still load-bearing for the Dashboard. */
export const REAL_APPOINTMENT_TYPES: string[] = Object.keys(REAL_APPOINTMENT_TYPE_LABELS);

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

/** Same naming reasoning as REAL_APPOINTMENT_TYPES above — `APPOINTMENT_STATUSES` is already taken by the mock section. */
export const REAL_APPOINTMENT_STATUSES: string[] = Object.keys(REAL_APPOINTMENT_STATUS_LABELS);

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

/**
 * Outbound shape for `POST /appointments` / `PATCH /appointments/{id}` —
 * mirrors app/schemas/appointment.py's AppointmentBase/Update.
 * `assigned_to_user_id` is optional on the backend (unlike Task's
 * required equivalent), but the create form
 * (features/appointments/components/appointment-form.tsx) still defaults
 * it to the signed-in user rather than leaving it unset or offering a
 * picker — same "no /users endpoint, so only 'you' is a safe choice"
 * reasoning as features/tasks/components/task-form.tsx.
 */
export interface AppointmentInput {
  assigned_to_user_id?: string;
  contact_id?: string;
  property_id?: string;
  opportunity_id?: string;
  title?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  appointment_type?: string;
  status?: string;
}
