// ---------------------------------------------------------------------------
// Real backend Task — mirrors app/schemas/task.py's TaskRead field-for-field
// (see lib/api/tasks.ts). There was no pre-existing Tasks frontend to
// reconcile this with — no mock data, no `features/tasks/` directory, no
// `/tasks` page, and no nav entry existed before this task (confirmed by
// searching the repo, not assumed) — so unlike Appointments/Pipeline this
// type gets the clean, natural `Task` name straight away; there's no mock
// counterpart anywhere else in this app claiming it.
//
// `status`/`priority`/`task_type` are typed as plain `string` (matching the
// backend's own read schema, which doesn't re-validate them as strict
// enums), so every format helper below falls back to the raw value for
// anything unmapped instead of crashing — same convention as every other
// real-backend soft enum in this app.
//
// Accepted, documented duplication: features/pipeline/types.ts already
// defines its own `OpportunityTask` (identical shape, for the tasks shown
// on one opportunity's detail page) with its own formatTaskStatus/
// formatTaskPriority/isTaskOverdue. This file does not import from there,
// and Pipeline's copy was not retroactively refactored to import from here
// — same tradeoff already made for AppointmentRecord vs
// OpportunityAppointment (see features/appointments/types.ts's doc
// comment), kept consistent rather than de-duplicating one pair and not
// the other.
// ---------------------------------------------------------------------------

export interface Task {
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

/** app/schemas/enums.py's TaskType: follow_up/call/showing/document/contract/notary/payment/commission/other. */
const TASK_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-up",
  call: "Call",
  showing: "Showing",
  document: "Document",
  contract: "Contract",
  notary: "Notary",
  payment: "Payment",
  commission: "Commission",
  other: "Other",
};

export function formatTaskType(taskType: string): string {
  return TASK_TYPE_LABELS[taskType] ?? taskType;
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

const TASK_STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

/** Falls back to the "pending" styling for any status not in the map above, matching getPropertyStatusBadgeClassName's fallback convention. */
export function getTaskStatusBadgeClassName(status: string): string {
  return TASK_STATUS_BADGE_STYLES[status] ?? TASK_STATUS_BADGE_STYLES.pending;
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

const TASK_PRIORITY_BADGE_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function getTaskPriorityBadgeClassName(priority: string): string {
  return TASK_PRIORITY_BADGE_STYLES[priority] ?? TASK_PRIORITY_BADGE_STYLES.medium;
}

/**
 * A task is overdue when it's still open (not completed/cancelled) and its
 * due date has already passed — computed client-side from the real
 * `due_at` timestamp against the current time (`Date.now()`, evaluated
 * when this runs, never a hardcoded "today"), never a stored/fabricated
 * backend field. Same convention as features/pipeline/types.ts's
 * identically-named helper and features/appointments/types.ts's
 * isAppointmentUpcoming.
 */
export function isTaskOverdue(task: Pick<Task, "due_at" | "status">): boolean {
  if (task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.due_at).getTime() < Date.now();
}
