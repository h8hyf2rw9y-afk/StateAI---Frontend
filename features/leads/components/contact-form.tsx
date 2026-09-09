"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { createContact, updateContact, addContactRole, removeContactRole } from "@/lib/api/contacts";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  CONTACT_ROLE_KEYS,
  CONTACT_SOURCES,
  PREFERRED_CONTACT_METHODS,
  formatContactRole,
  formatContactSource,
  formatPreferredContactMethod,
  type Contact,
  type ContactInput,
} from "@/features/leads/types";
import { cn } from "@/lib/utils";

/**
 * One dialog, used for both creating a new contact (triggered from
 * app/(dashboard)/leads/page.tsx's "Add lead" button) and editing an
 * existing one (triggered from the lead detail page). Fields mirror
 * app/schemas/contact.py's ContactCreate/ContactUpdate exactly — no
 * lead score, status, budget, or any other field Contact doesn't actually
 * have (see features/leads/types.ts's Contact/Lead comment for why those
 * only exist on the still-mock `Lead` type).
 *
 * Roles are handled separately from the rest of the form on purpose:
 * `ContactCreate`/`ContactUpdate` have no `roles` field at all — a role is
 * assigned/removed via its own `POST`/`DELETE /contacts/{id}/roles`
 * endpoint (app/api/routes/contacts.py). This form still lets the user
 * pick roles up front (toggleable chips, not a raw multi-select, since the
 * real set is only six values — CONTACT_ROLE_KEYS): on create, each
 * selected role is assigned right after the contact itself is created
 * (same "create, then attach sub-resources" pattern
 * features/buyer-requirements/components/buyer-requirement-form.tsx
 * already uses for locations); on edit, the newly selected set is diffed
 * against the contact's current roles and only the actual additions/
 * removals are sent.
 */
export function ContactForm({
  contact,
  trigger,
  onSaved,
}: {
  contact?: Contact;
  trigger: ReactElement;
  onSaved?: (contact: Contact) => void;
}) {
  const isEdit = Boolean(contact);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(contact?.first_name ?? "");
  const [lastName, setLastName] = useState(contact?.last_name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [preferredContactMethod, setPreferredContactMethod] = useState(contact?.preferred_contact_method ?? "");
  const [source, setSource] = useState(contact?.source ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [roles, setRoles] = useState<Set<string>>(new Set(contact?.roles.map((r) => r.role_key) ?? []));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(roleKey: string) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    // Client-side nudge only — the backend is the actual source of truth
    // for this rule (app/schemas/contact.py's ContactBase validator) and
    // re-validates it regardless of what this check does.
    if (!isEdit && !email.trim() && !phone.trim()) {
      setError("Enter at least an email or a phone number.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const input: ContactInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      preferred_contact_method: preferredContactMethod || undefined,
      source: source || undefined,
      notes: notes.trim() || undefined,
    };

    const response = isEdit ? await updateContact(contact!.id, input) : await createContact(input);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      setIsSubmitting(false);
      return;
    }

    let saved = response.data;

    const existingRoles = new Set(contact?.roles.map((r) => r.role_key) ?? []);
    const toAdd = Array.from(roles).filter((r) => !existingRoles.has(r));
    const toRemove = Array.from(existingRoles).filter((r) => !roles.has(r));
    for (const roleKey of toAdd) {
      const roleResponse = await addContactRole(saved.id, roleKey);
      if (roleResponse.ok) saved = roleResponse.data;
    }
    for (const roleKey of toRemove) {
      const roleResponse = await removeContactRole(saved.id, roleKey);
      if (roleResponse.ok) saved = roleResponse.data;
    }

    setIsSubmitting(false);
    setOpen(false);
    onSaved?.(saved);

    if (!isEdit) {
      router.push(`/leads/${saved.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : "Add lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormError message={error} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="first_name">
                First name <span className="text-destructive">*</span>
              </Label>
              <Input id="first_name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="last_name">
                Last name <span className="text-destructive">*</span>
              </Label>
              <Input id="last_name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email {!isEdit && <span className="text-muted-foreground">(or phone)</span>}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone {!isEdit && <span className="text-muted-foreground">(or email)</span>}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preferred_contact_method">Preferred contact</Label>
              <Select
                value={preferredContactMethod || "none"}
                onValueChange={(value) => setPreferredContactMethod(value === "none" ? "" : (value ?? ""))}
              >
                <SelectTrigger id="preferred_contact_method">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {PREFERRED_CONTACT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatPreferredContactMethod(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Select value={source || "none"} onValueChange={(value) => setSource(value === "none" ? "" : (value ?? ""))}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CONTACT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatContactSource(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONTACT_ROLE_KEYS.map((roleKey) => {
                const selected = roles.has(roleKey);
                return (
                  <button key={roleKey} type="button" onClick={() => toggleRole(roleKey)}>
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className={cn("cursor-pointer", !selected && "border-transparent bg-muted text-muted-foreground")}
                    >
                      {formatContactRole(roleKey)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
