// ---------------------------------------------------------------------------
// Real backend Opportunity — mirrors app/models/opportunity.py /
// app/schemas/opportunity.py's OpportunityRead field-for-field (see
// lib/api/pipeline.ts).
//
// This file used to also define a mock `Deal` type (a lead paired with an
// opportunity, with a single flat leadName/agentName/value/probability) plus
// the mock 7-value `PipelineStage`/`PIPELINE_STAGES`/`PIPELINE_STAGE_LABELS`
// vocabulary — kept around only because the mock Dashboard was their last
// real consumer (an Opportunity is genuinely not a "deal" in that mock
// sense: no single leadName/agentName baked in — those live on the
// Contact/owner it references by id, read through separately, same as
// everywhere else in this schema — and a Contact can have *several*
// Opportunities, so there's no one "the deal's value" to flatten it to).
// Removed in the CRM Integration Gaps task once the Dashboard was rewired to
// real data; the real Pipeline page never used them.
//
// `opportunity_type`/`stage`/`lost_reason` are typed as plain strings
// (matching the backend's own read schema, which doesn't re-validate them
// as strict enums) — anything unmapped still renders via each format
// helper's fallback instead of crashing. `expected_value`/`probability` are
// *not* the same Decimal-as-string situation as Property.price:
// `expected_value` genuinely is (Numeric(14,2) -> a JSON string, e.g.
// "450000.00"), but `probability` is a plain SQLAlchemy SmallInteger
// (0-100, not a Decimal) and comes back as a real JSON number — confirmed
// against app/models/opportunity.py and app/schemas/opportunity.py, not
// assumed from the Property precedent.
// ---------------------------------------------------------------------------

export const OPPORTUNITY_TYPES = ["buy", "sell"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  buy: "Buy",
  sell: "Sell",
};

/**
 * The backend's real, 13-value shared stage enum (app/schemas/enums.py's
 * OPPORTUNITY_STAGES) — one list covering both buy and sell pipelines.
 * `OPPORTUNITY_STAGES_BY_TYPE` mirrors the backend's own dict of the same
 * name (OpportunityService is the actual source of truth server-side; this
 * is only used client-side to build the right Select options for an
 * opportunity's own type, same validation the backend re-does regardless).
 */
export const OPPORTUNITY_STAGE_VALUES = [
  "qualification",
  "search",
  "listing",
  "marketing",
  "property_selected",
  "showing",
  "offer",
  "negotiation",
  "reservation",
  "contract",
  "closing",
  "won",
  "lost",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGE_VALUES)[number];

export const OPPORTUNITY_STAGES_BY_TYPE: Record<OpportunityType, OpportunityStage[]> = {
  buy: [
    "qualification", "search", "property_selected", "showing", "offer", "negotiation",
    "reservation", "contract", "closing", "won", "lost",
  ],
  sell: [
    "qualification", "listing", "marketing", "showing", "offer", "negotiation",
    "reservation", "contract", "closing", "won", "lost",
  ],
};

export const OPPORTUNITY_CLOSED_STAGES: ReadonlySet<string> = new Set(["won", "lost"]);

const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  search: "Search",
  listing: "Listing",
  marketing: "Marketing",
  property_selected: "Property selected",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  reservation: "Reservation",
  contract: "Contract",
  closing: "Closing",
  won: "Won",
  lost: "Lost",
};

export function formatOpportunityStage(stage: string): string {
  return OPPORTUNITY_STAGE_LABELS[stage] ?? stage;
}

const OPPORTUNITY_STAGE_BADGE_STYLES: Record<string, string> = {
  qualification: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  search: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  listing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  marketing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  property_selected: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  showing: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  offer: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  reservation: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  contract: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  closing: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

/** Falls back to the "qualification" (neutral) styling for any stage not in the map above, matching PROPERTY_STATUS_BADGE_STYLES's fallback convention. */
export function getOpportunityStageBadgeClassName(stage: string): string {
  return OPPORTUNITY_STAGE_BADGE_STYLES[stage] ?? OPPORTUNITY_STAGE_BADGE_STYLES.qualification;
}

/** app/schemas/enums.py's OPPORTUNITY_LOST_REASONS — only meaningful (and only ever populated) when stage === "lost". */
export const OPPORTUNITY_LOST_REASONS = [
  "price",
  "financing_denied",
  "chose_another_property",
  "chose_competitor",
  "unresponsive",
  "changed_mind",
  "timeline_changed",
  "other",
] as const;

const OPPORTUNITY_LOST_REASON_LABELS: Record<string, string> = {
  price: "Price",
  financing_denied: "Financing denied",
  chose_another_property: "Chose another property",
  chose_competitor: "Chose a competitor",
  unresponsive: "Unresponsive",
  changed_mind: "Changed their mind",
  timeline_changed: "Timeline changed",
  other: "Other",
};

export function formatOpportunityLostReason(reason: string | null): string | null {
  if (reason === null) return null;
  return OPPORTUNITY_LOST_REASON_LABELS[reason] ?? reason;
}

export function formatOpportunityType(type: string): string {
  return OPPORTUNITY_TYPE_LABELS[type as OpportunityType] ?? type;
}

export interface Opportunity {
  id: string;
  organization_id: string;
  contact_id: string;
  property_id: string | null;
  buyer_requirement_id: string | null;
  opportunity_type: string;
  stage: string;
  title: string;
  description: string | null;
  expected_value: string | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null; // ISO timestamp
  closed_at: string | null; // ISO timestamp
  lost_reason: string | null;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/** "$450,000" from the Decimal-as-string `expected_value` field, or a clear fallback when it's null — never a fabricated value, same convention as formatPropertyPrice. */
export function formatOpportunityValue(expectedValue: string | null, currency: string): string {
  if (expectedValue === null) return "Value not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(expectedValue));
}

/**
 * Outbound shape for `PATCH /opportunities/{id}` and the body of
 * `POST /contacts/{contact_id}/opportunities` — mirrors
 * app/schemas/opportunity.py's OpportunityUpdate exactly (all fields
 * optional). `OpportunityCreate` additionally requires `opportunity_type`
 * — deliberately NOT part of this shared type, since it's immutable after
 * creation (OpportunityUpdate has no such field at all: "if the type is
 * wrong, create a new Opportunity," per that schema's own docstring) — see
 * createOpportunity in lib/api/pipeline.ts, which takes it as a separate,
 * required argument instead. `contact_id` is never part of either body —
 * it comes from the URL on create and can't change at all after that.
 * `owner_user_id` exists on both schemas but this app's forms never send
 * it (no `/users` endpoint to power a real picker — same reasoning as
 * Task/Appointment's assignee) — omitted, the backend defaults it to the
 * creating user.
 */
export interface OpportunityInput {
  property_id?: string;
  buyer_requirement_id?: string;
  stage?: string;
  title?: string;
  description?: string;
  expected_value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  lost_reason?: string;
}

// ---------------------------------------------------------------------------
// Real backend Activity — mirrors app/schemas/activity.py's ActivityRead.
// This is the opportunity's own history, including the `stage_change`
// entries OpportunityService writes automatically on every PATCH that
// changes `stage` — see app/services/opportunity_service.py's
// `_record_stage_change_activity`. Used here as the "stage changes/
// history" view the product brief asks for (in preference to
// GET /audit-logs, which was inspected too: it covers the same
// stage-change events organization-wide, generically, across every entity
// type, whereas GET /opportunities/{id}/activities is already scoped to
// this one opportunity and — per the backend's own docstring — is the
// intended place this history lives).
// ---------------------------------------------------------------------------

export interface Activity {
  id: string;
  organization_id: string;
  contact_id: string;
  property_id: string | null;
  opportunity_id: string | null;
  created_by_user_id: string | null;
  activity_type: string;
  direction: string | null;
  occurred_at: string; // ISO timestamp
  notes: string;
  created_at: string;
  updated_at: string;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  stage_change: "Stage change",
};

export function formatActivityType(activityType: string): string {
  return ACTIVITY_TYPE_LABELS[activityType] ?? activityType;
}

// ---------------------------------------------------------------------------
// Real backend Task/Appointment, scoped to an opportunity — mirror
// app/schemas/task.py's TaskRead / app/schemas/appointment.py's
// AppointmentRead field-for-field (see lib/api/pipeline.ts's
// getTasksForOpportunity/getAppointmentsForOpportunity, both filtered
// server-side by `opportunity_id`). Named `OpportunityTask`/
// `OpportunityAppointment` rather than the bare `Task`/`Appointment` a
// future full Tasks/Appointments feature would likely want for itself
// (features/appointments/types.ts's `Appointment` today is still the
// mock shape) — this task only needs the two backend entities *as shown
// on one opportunity's detail page*, not a general-purpose Tasks/
// Appointments feature, which remains explicitly out of scope (see this
// app's README "What remains to be implemented").
// ---------------------------------------------------------------------------

export interface OpportunityTask {
  id: string;
  organization_id: string;
  assigned_to_user_id: string | null;
  created_by_user_id: string | null;
  contact_id: string | null;
  property_id: string | null;
  buyer_requirement_id: string | null;
  property_interest_id: string | null;
  opportunity_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  due_at: string; // ISO timestamp
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatTaskStatus(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function formatTaskPriority(priority: string): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority;
}

/** A task is overdue when it's still open (not completed/cancelled) and its due date has already passed — never a fixed day-count rule, matching this project's "reason from the whole context, not an arbitrary threshold" convention (see the backend's Pipeline Agent). */
export function isTaskOverdue(task: Pick<OpportunityTask, "due_at" | "status">): boolean {
  if (task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.due_at).getTime() < Date.now();
}

export interface OpportunityAppointment {
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

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function formatAppointmentStatus(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  showing: "Showing",
  call: "Call",
  meeting: "Meeting",
  notary: "Notary",
  signing: "Signing",
  other: "Other",
};

export function formatAppointmentType(appointmentType: string): string {
  return APPOINTMENT_TYPE_LABELS[appointmentType] ?? appointmentType;
}

/** An appointment is upcoming when it's still scheduled/confirmed (not cancelled/completed/no-show) and hasn't started yet. */
export function isAppointmentUpcoming(appointment: Pick<OpportunityAppointment, "start_at" | "status">): boolean {
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") return false;
  return new Date(appointment.start_at).getTime() >= Date.now();
}
