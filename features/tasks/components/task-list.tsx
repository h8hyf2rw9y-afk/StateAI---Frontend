"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  FileSignature,
  FileText,
  Home,
  ListTodo,
  Loader2,
  Percent,
  Phone,
  Search,
  Stamp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge";
import {
  formatTaskPriority,
  formatTaskStatus,
  formatTaskType,
  isTaskOverdue,
  type Task,
} from "@/features/tasks/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getTasks } from "@/lib/api/tasks";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getOpportunities } from "@/lib/api/pipeline";
import { getBuyerRequirement } from "@/lib/api/buyer-requirements";
import { formatPurpose } from "@/features/buyer-requirements/types";
import { formatTime, formatTimestamp, getInitials } from "@/lib/format";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

type Status = "loading" | "success" | "error";

const TYPE_ICONS: Record<string, LucideIcon> = {
  follow_up: Phone,
  call: Phone,
  showing: Home,
  document: FileText,
  contract: FileSignature,
  notary: Stamp,
  payment: Banknote,
  commission: Percent,
  other: ListTodo,
};

/** Same "no /users endpoint, so only the signed-in user's own identity can ever be resolved" reasoning as app/(dashboard)/pipeline/[id]/page.tsx's getOwnerLabel and features/appointments/components/appointments-list.tsx's getAssigneeLabel — a separate, small local copy, same accepted-duplication tradeoff already documented for those two. */
function getAssigneeLabel(assignedToUserId: string | null, currentUserId: string | undefined): string {
  if (assignedToUserId === null) return "Unassigned";
  if (assignedToUserId === currentUserId) return "You";
  return "Another team member";
}

function groupByDay(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = new Date(task.due_at).toDateString();
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

/**
 * Real backend tasks, fetched on mount — there was no pre-existing mock
 * Tasks UI to replace (confirmed by inspecting the repo before writing any
 * of this: no `features/tasks/` directory, no `/tasks` page, no nav entry
 * existed). Built fresh, directly against the real
 * `GET /api/v1/tasks` (app/api/routes/tasks.py), following the exact same
 * self-fetching shape as features/appointments/components/appointments-list.tsx
 * and features/pipeline/components/pipeline-board.tsx: loading/error/empty
 * states, a search box and status/priority filters (all client-side only —
 * the backend has no text-search endpoint, and while it does support
 * `status`/`priority` query filters, this fetches the full list once and
 * filters client-side, matching how every other real list page in this app
 * already handles its own filters), day-grouping by real `due_at`, and
 * contact/property/opportunity/buyer-requirement names resolved client-side
 * from the real lists (joined by id) and linked to their real detail pages.
 *
 * No "sort by" control and no Appointment link: the backend has exactly
 * one order (`due_at ASC`, app/repositories/task_repo.py, no sort
 * parameter), and `TaskRead` has no `appointment_id` field at all — a task
 * can reference a contact/property/buyer requirement/property interest/
 * opportunity, never an appointment directly (confirmed against
 * app/schemas/task.py, not assumed).
 */
export function TaskList() {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>("loading");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({});
  const [opportunityTitles, setOpportunityTitles] = useState<Record<string, string>>({});
  const [buyerRequirementSummaries, setBuyerRequirementSummaries] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [tasksRes, contactsRes, propertiesRes, opportunitiesRes] = await Promise.all([
        getTasks(),
        getContacts(),
        getProperties(),
        getOpportunities(),
      ]);
      if (cancelled) return;

      if (!tasksRes.ok) {
        setErrorMessage(getApiErrorMessage(tasksRes.error));
        setStatus("error");
        return;
      }

      setTasks(tasksRes.data);

      // Name lookups are a display convenience — if any of these calls
      // fails, the list still renders with a plain fallback label per row
      // rather than failing the whole page, same principle as
      // PipelineBoard's/AppointmentsList's own lookups.
      if (contactsRes.ok) {
        setContactNames(Object.fromEntries(contactsRes.data.map((c) => [c.id, `${c.first_name} ${c.last_name}`])));
      }
      if (propertiesRes.ok) {
        setPropertyNames(Object.fromEntries(propertiesRes.data.map((p) => [p.id, p.title])));
      }
      if (opportunitiesRes.ok) {
        setOpportunityTitles(Object.fromEntries(opportunitiesRes.data.map((o) => [o.id, o.title])));
      }

      // Buyer requirements have no bulk/list-all endpoint (only per-contact
      // or per-id, see lib/api/buyer-requirements.ts) — fetch each unique
      // id a loaded task actually references, in parallel, rather than
      // inventing a batch endpoint that doesn't exist.
      const requirementIds = Array.from(
        new Set(tasksRes.data.map((t) => t.buyer_requirement_id).filter((id): id is string => id !== null))
      );
      if (requirementIds.length > 0) {
        const results = await Promise.all(requirementIds.map((id) => getBuyerRequirement(id)));
        if (!cancelled) {
          const summaries: Record<string, string> = {};
          results.forEach((res, i) => {
            if (res.ok) summaries[requirementIds[i]] = formatPurpose(res.data.purpose);
          });
          setBuyerRequirementSummaries(summaries);
        }
      }

      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableStatuses = useMemo(() => Array.from(new Set(tasks.map((t) => t.status))).sort(), [tasks]);
  const availablePriorities = useMemo(() => Array.from(new Set(tasks.map((t) => t.priority))).sort(), [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const contactName = task.contact_id ? (contactNames[task.contact_id] ?? "") : "";
      const matchesQuery =
        q.length === 0 || task.title.toLowerCase().includes(q) || contactName.toLowerCase().includes(q);
      return matchesStatus && matchesPriority && matchesQuery;
    });
  }, [tasks, query, statusFilter, priorityFilter, contactNames]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
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

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Follow-ups, document deadlines, and other work will show up here once they're created."
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
            <SelectTrigger className="sm:w-44" aria-label="Status">
              <SelectValue placeholder="All statuses">
                {(value: string | null) => (!value || value === "all" ? "All statuses" : formatTaskStatus(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {availableStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatTaskStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {availablePriorities.length > 0 && (
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value ?? "all")}>
            <SelectTrigger className="sm:w-44" aria-label="Priority">
              <SelectValue placeholder="All priorities">
                {(value: string | null) => (!value || value === "all" ? "All priorities" : formatTaskPriority(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {availablePriorities.map((p) => (
                <SelectItem key={p} value={p}>
                  {formatTaskPriority(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groupByDay(filtered).map(([day, dayTasks]) => (
            <div key={day} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">{formatTimestamp(dayTasks[0].due_at)}</h3>
              <div className="flex flex-col gap-2.5">
                {dayTasks.map((task) => {
                  const overdue = isTaskOverdue(task);
                  const Icon = TYPE_ICONS[task.task_type] ?? ListTodo;
                  const contactName = task.contact_id ? contactNames[task.contact_id] : undefined;
                  const propertyName = task.property_id ? propertyNames[task.property_id] : undefined;
                  const opportunityTitle = task.opportunity_id ? opportunityTitles[task.opportunity_id] : undefined;
                  const buyerRequirementSummary = task.buyer_requirement_id
                    ? buyerRequirementSummaries[task.buyer_requirement_id]
                    : undefined;

                  return (
                    <Card key={task.id} size="sm">
                      <CardContent className="flex items-center gap-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{task.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatTaskType(task.task_type)}
                            {task.contact_id && (
                              <>
                                {" · "}
                                <Link href={`/leads/${task.contact_id}`} className="hover:text-foreground hover:underline">
                                  {contactName ?? "Unknown contact"}
                                </Link>
                              </>
                            )}
                            {task.property_id && (
                              <>
                                {" · "}
                                <Link
                                  href={`/properties/${task.property_id}`}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {propertyName ?? "Unknown property"}
                                </Link>
                              </>
                            )}
                            {task.opportunity_id && (
                              <>
                                {" · "}
                                <Link
                                  href={`/pipeline/${task.opportunity_id}`}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {opportunityTitle ?? "Opportunity"}
                                </Link>
                              </>
                            )}
                            {task.buyer_requirement_id && task.contact_id && (
                              <>
                                {" · "}
                                <Link href={`/leads/${task.contact_id}`} className="hover:text-foreground hover:underline">
                                  {buyerRequirementSummary ?? "Buyer requirement"}
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                          <TaskStatusBadge status={task.status} />
                          <TaskPriorityBadge priority={task.priority} />
                          {overdue && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              Overdue
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs whitespace-nowrap",
                            overdue ? "font-medium text-destructive" : "text-muted-foreground"
                          )}
                        >
                          Due {formatTime(task.due_at)}
                        </span>
                        <Avatar className="size-7 shrink-0" title={getAssigneeLabel(task.assigned_to_user_id, user?.id)}>
                          <AvatarFallback className="text-[10px]">
                            {getInitials(getAssigneeLabel(task.assigned_to_user_id, user?.id))}
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
      ) : (
        <EmptyState
          icon={ListTodo}
          title="No tasks match your filters"
          description="Try a different search term or clear the status/priority filters."
        />
      )}
    </div>
  );
}
