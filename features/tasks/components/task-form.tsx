"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { createTask, updateTask } from "@/lib/api/tasks";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getOpportunities } from "@/lib/api/pipeline";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  formatTaskPriority,
  formatTaskStatus,
  formatTaskType,
  type Task,
  type TaskInput,
} from "@/features/tasks/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity } from "@/features/pipeline/types";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/format";
import { useUser } from "@/hooks/useUser";

/**
 * One dialog, used for both creating a new task (triggered from
 * app/(dashboard)/tasks/page.tsx's "New task" button) and editing an
 * existing one (triggered per-row from features/tasks/components/task-list.tsx).
 * Fields mirror app/schemas/task.py's TaskBase/TaskUpdate — `status` is
 * edit-only (a new task always starts "pending" server-side, matching
 * TaskService.create's own hardcoded default, so there's nothing useful to
 * pick at creation time).
 *
 * `assigned_to_user_id` (required by TaskCreate) is set to the signed-in
 * user's own id and never shown as a picker — there is no `/users`
 * endpoint to power one (confirmed against app/api/routes — only `GET /me`
 * exists), so the only identity this form can safely offer is "you,"
 * matching the "You"/"Another team member" convention already established
 * for read-only display elsewhere in this app (see e.g.
 * app/(dashboard)/pipeline/[id]/page.tsx's getOwnerLabel). Reassigning a
 * task to someone else isn't possible from this UI as a result — documented
 * as a limitation, not worked around with an invented endpoint.
 *
 * Contact/Property/Opportunity are optional relationship pickers, each
 * populated from the real list endpoints this app already calls elsewhere
 * (getContacts/getProperties/getOpportunities) — fetched fresh on open
 * rather than threaded in as props, keeping this form self-contained and
 * usable from any page. `buyer_requirement_id`/`property_interest_id` are
 * real TaskCreate/Update fields but aren't surfaced here — picking one
 * meaningfully requires already being in a specific contact's buyer-search
 * context, which this general-purpose form doesn't have.
 */
export function TaskForm({
  task,
  trigger,
  onSaved,
}: {
  task?: Task;
  trigger: ReactElement;
  onSaved?: (task: Task) => void;
}) {
  const isEdit = Boolean(task);
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [taskType, setTaskType] = useState(task?.task_type ?? "follow_up");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [status, setStatus] = useState(task?.status ?? "pending");
  const [dueAt, setDueAt] = useState(task ? toDatetimeLocalValue(task.due_at) : "");
  const [contactId, setContactId] = useState(task?.contact_id ?? "");
  const [propertyId, setPropertyId] = useState(task?.property_id ?? "");
  const [opportunityId, setOpportunityId] = useState(task?.opportunity_id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadOptions() {
      const [contactsRes, propertiesRes, opportunitiesRes] = await Promise.all([
        getContacts(),
        getProperties(),
        getOpportunities(),
      ]);
      if (cancelled) return;
      if (contactsRes.ok) setContacts(contactsRes.data);
      if (propertiesRes.ok) setProperties(propertiesRes.data);
      if (opportunitiesRes.ok) setOpportunities(opportunitiesRes.data);
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !title.trim() || !dueAt) return;
    setIsSubmitting(true);
    setError(null);

    const input: TaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      task_type: taskType,
      priority,
      due_at: fromDatetimeLocalValue(dueAt),
      contact_id: contactId || undefined,
      property_id: propertyId || undefined,
      opportunity_id: opportunityId || undefined,
    };
    if (isEdit) {
      input.status = status;
    } else {
      input.assigned_to_user_id = user?.id;
    }

    const response = isEdit ? await updateTask(task!.id, input) : await createTask(input);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }

    setOpen(false);
    onSaved?.(response.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormError message={error} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task_type">Type</Label>
              <Select value={taskType} onValueChange={(value) => value && setTaskType(value)}>
                <SelectTrigger id="task_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTaskType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => value && setPriority(value)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatTaskPriority(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_at">
                Due <span className="text-destructive">*</span>
              </Label>
              <Input id="due_at" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatTaskStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Phase 7 bug fix — see features/appointments/components/appointment-form.tsx's identical comment for the full root cause (Base UI's <Select.Value> can't resolve a label from JSX <SelectItem> children without a declarative `items` prop; these three were silently rendering the raw id). */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_id">Contact</Label>
              <Select value={contactId || "none"} onValueChange={(value) => setContactId(value === "none" ? "" : (value ?? ""))}>
                <SelectTrigger id="contact_id">
                  <SelectValue>
                    {(() => {
                      const selected = contacts.find((c) => c.id === contactId);
                      return selected ? `${selected.first_name} ${selected.last_name}` : "None";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_id">Property</Label>
              <Select
                value={propertyId || "none"}
                onValueChange={(value) => setPropertyId(value === "none" ? "" : (value ?? ""))}
              >
                <SelectTrigger id="property_id">
                  <SelectValue>{properties.find((p) => p.id === propertyId)?.title ?? "None"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opportunity_id">Opportunity</Label>
              <Select
                value={opportunityId || "none"}
                onValueChange={(value) => setOpportunityId(value === "none" ? "" : (value ?? ""))}
              >
                <SelectTrigger id="opportunity_id">
                  <SelectValue>{opportunities.find((o) => o.id === opportunityId)?.title ?? "None"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
