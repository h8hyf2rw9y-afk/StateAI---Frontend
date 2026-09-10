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
import { createAppointment, updateAppointment } from "@/lib/api/appointments";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getOpportunities } from "@/lib/api/pipeline";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  REAL_APPOINTMENT_STATUSES,
  REAL_APPOINTMENT_TYPES,
  formatAppointmentStatus,
  formatAppointmentType,
  type AppointmentInput,
  type AppointmentRecord,
} from "@/features/appointments/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity } from "@/features/pipeline/types";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/format";
import { useUser } from "@/hooks/useUser";

/**
 * One dialog, used for both creating a new appointment (triggered from
 * app/(dashboard)/appointments/page.tsx's "Schedule appointment" button)
 * and editing an existing one (triggered per-row from
 * features/appointments/components/appointments-list.tsx). Fields mirror
 * app/schemas/appointment.py's AppointmentBase/Update — `status` is
 * edit-only (a new appointment always starts "scheduled" server-side,
 * AppointmentBase's own default, matching TaskForm's identical reasoning
 * for not surfacing Task's `status` at creation either).
 *
 * `start_at <= end_at` is nudged client-side (disabling submit when it's
 * violated) but the backend re-validates it regardless — see
 * AppointmentBase's model_validator — so this is a UX convenience, not the
 * actual enforcement.
 *
 * `assigned_to_user_id` defaults to the signed-in user, same "no /users
 * endpoint" reasoning as features/tasks/components/task-form.tsx.
 * Contact/Property/Opportunity are optional pickers, fetched fresh from
 * the real list endpoints on open, same pattern as TaskForm.
 */
export function AppointmentForm({
  appointment,
  trigger,
  onSaved,
}: {
  appointment?: AppointmentRecord;
  trigger: ReactElement;
  onSaved?: (appointment: AppointmentRecord) => void;
}) {
  const isEdit = Boolean(appointment);
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [title, setTitle] = useState(appointment?.title ?? "");
  const [description, setDescription] = useState(appointment?.description ?? "");
  const [appointmentType, setAppointmentType] = useState(appointment?.appointment_type ?? "call");
  const [status, setStatus] = useState(appointment?.status ?? "scheduled");
  const [startAt, setStartAt] = useState(appointment ? toDatetimeLocalValue(appointment.start_at) : "");
  const [endAt, setEndAt] = useState(appointment ? toDatetimeLocalValue(appointment.end_at) : "");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [contactId, setContactId] = useState(appointment?.contact_id ?? "");
  const [propertyId, setPropertyId] = useState(appointment?.property_id ?? "");
  const [opportunityId, setOpportunityId] = useState(appointment?.opportunity_id ?? "");
  const [outcomeNotes, setOutcomeNotes] = useState("");
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

  const timesInvalid = Boolean(startAt && endAt && startAt > endAt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !title.trim() || !startAt || !endAt || timesInvalid) return;
    setIsSubmitting(true);
    setError(null);

    const input: AppointmentInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      appointment_type: appointmentType,
      start_at: fromDatetimeLocalValue(startAt),
      end_at: fromDatetimeLocalValue(endAt),
      location: location.trim() || undefined,
      contact_id: contactId || undefined,
      property_id: propertyId || undefined,
      opportunity_id: opportunityId || undefined,
    };
    if (isEdit) {
      input.status = status;
      if (status === "completed" && outcomeNotes.trim()) {
        input.outcome_notes = outcomeNotes.trim();
      }
    } else {
      input.assigned_to_user_id = user?.id;
    }

    const response = isEdit ? await updateAppointment(appointment!.id, input) : await createAppointment(input);

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
          <DialogTitle>{isEdit ? "Edit appointment" : "Schedule appointment"}</DialogTitle>
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
              <Label htmlFor="appointment_type">Type</Label>
              <Select value={appointmentType} onValueChange={(value) => value && setAppointmentType(value)}>
                <SelectTrigger id="appointment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REAL_APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatAppointmentType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REAL_APPOINTMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatAppointmentStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isEdit && status === "completed" && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-dashed p-3">
              <Label htmlFor="outcome_notes">What happened at this showing?</Label>
              <Textarea
                id="outcome_notes"
                rows={2}
                placeholder="e.g. Liked the property but wants to compare two more."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Saved as an Activity on this contact — visible in their history, and to the Follow-up and Pipeline agents.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start_at">
                Starts <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_at"
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end_at">
                Ends <span className="text-destructive">*</span>
              </Label>
              <Input id="end_at" type="datetime-local" required value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          {timesInvalid && <p className="text-xs text-destructive">End must be after the start time.</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          {/*
            Phase 7 bug fix: Base UI's <Select.Value> can only resolve a
            selected value to a display label when Select.Root is given a
            declarative `items` list — it can't read labels back out of
            these <SelectItem> JSX children (see
            node_modules/@base-ui/react/internals/resolveValueLabel.mjs's
            resolveSelectedLabel: with no `items` prop, it falls straight to
            printing the raw `value` string). For every other Select in this
            app that was invisible, because the value itself already reads
            fine (a soft-enum string like "showing"); for an id-valued
            Select like these three, base-ui was silently rendering the raw
            UUID — and its unclamped width (`w-fit`) then overlapped the
            neighboring columns badly enough to make them unclickable in
            testing. Fixed by computing the label ourselves and passing it
            as SelectValue's children directly, bypassing base-ui's broken
            fallback entirely — same fix applied in
            features/tasks/components/task-form.tsx and
            features/pipeline/components/opportunity-form.tsx.
          */}
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
            <Button type="submit" disabled={isSubmitting || timesInvalid}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Schedule appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
