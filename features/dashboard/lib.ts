import type { Task } from "@/features/tasks/types";
import { isTaskOverdue } from "@/features/tasks/types";
import type { AppointmentRecord } from "@/features/appointments/types";
import { isAppointmentUpcoming } from "@/features/appointments/types";
import type { Opportunity } from "@/features/pipeline/types";
import { OPPORTUNITY_CLOSED_STAGES } from "@/features/pipeline/types";

/**
 * Real selectors for the Dashboard — CRM Integration Gaps task. Replaces
 * the previous mock-data selectors (getHotLeads/getDueFollowUps/etc., which
 * operated on the mock Lead/Deal/Appointment shapes) with functions over the
 * app's real Task/Opportunity/AppointmentRecord types. Kept as plain,
 * dependency-free functions over already-fetched arrays — same "smallest
 * clean architecture" call the rest of this app already makes: the backend
 * has no dashboard-aggregation endpoint, and these arrays are small enough
 * (a demo org's whole Tasks/Opportunities/Appointments lists, already
 * capped at 200 by every list endpoint) that computing this client-side
 * needs no new backend work.
 */

export function getOverdueTasks(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((task) => isTaskOverdue(task))
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, limit);
}

export function getUpcomingAppointments(appointments: AppointmentRecord[], limit = 4): AppointmentRecord[] {
  return appointments
    .filter((appt) => isAppointmentUpcoming(appt))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, limit);
}

/** expected_value is a Decimal-as-string, same as Property.price — parsed defensively, never assumed numeric. */
function parseExpectedValue(expectedValue: string | null): number {
  if (expectedValue === null) return 0;
  const parsed = Number(expectedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The one currency shared by every item, or `null` if they don't all agree.
 * Summing Decimal amounts across different currencies without a real
 * conversion would silently misrepresent the total — same "never silently
 * convert, report as unconfirmable" principle app/services/matching_service.py
 * already applies to a currency mismatch between a buyer requirement and a
 * property. In practice this demo org is single-currency (MXN) throughout,
 * but the guard costs nothing and keeps the dashboard honest if that ever
 * changes.
 */
function resolveSharedCurrency(items: { currency: string }[]): string | null {
  const currencies = new Set(items.map((item) => item.currency));
  return currencies.size === 1 ? [...currencies][0] : null;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  value: number;
}

/**
 * Grouped by whichever stages actually have an opportunity — not a fixed
 * 13-row table for a demo org with a handful of deals. Sorted by count
 * descending so the busiest stage leads, same "most relevant first"
 * convention PropertyMatchList's classification sort already established.
 * `currency` is `null` when the summarized opportunities don't all share one
 * currency — see resolveSharedCurrency; the caller must not format `value`
 * as money in that case (PipelineSummary shows counts only instead).
 */
export function getPipelineSummary(opportunities: Opportunity[]): { rows: PipelineStageSummary[]; currency: string | null } {
  const byStage = new Map<string, PipelineStageSummary>();
  for (const opportunity of opportunities) {
    const existing = byStage.get(opportunity.stage);
    const value = parseExpectedValue(opportunity.expected_value);
    if (existing) {
      existing.count += 1;
      existing.value += value;
    } else {
      byStage.set(opportunity.stage, { stage: opportunity.stage, count: 1, value });
    }
  }
  return {
    rows: Array.from(byStage.values()).sort((a, b) => b.count - a.count),
    currency: resolveSharedCurrency(opportunities),
  };
}

export function getOpenPipelineValue(opportunities: Opportunity[]): { value: number; currency: string | null } {
  const open = opportunities.filter((o) => !OPPORTUNITY_CLOSED_STAGES.has(o.stage));
  return {
    value: open.reduce((sum, o) => sum + parseExpectedValue(o.expected_value), 0),
    currency: resolveSharedCurrency(open),
  };
}

export function getOpenOpportunityCount(opportunities: Opportunity[]): number {
  return opportunities.filter((o) => !OPPORTUNITY_CLOSED_STAGES.has(o.stage)).length;
}
