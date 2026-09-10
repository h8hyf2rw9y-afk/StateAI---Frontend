"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { createOpportunity, updateOpportunity } from "@/lib/api/pipeline";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getBuyerRequirementsForContact } from "@/lib/api/buyer-requirements";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  OPPORTUNITY_STAGES_BY_TYPE,
  OPPORTUNITY_TYPES,
  formatOpportunityStage,
  formatOpportunityType,
  type Opportunity,
  type OpportunityInput,
  type OpportunityStage,
  type OpportunityType,
} from "@/features/pipeline/types";
import { formatPurpose, type BuyerRequirement } from "@/features/buyer-requirements/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/format";

/**
 * One dialog, used for both creating a new opportunity (triggered from
 * app/(dashboard)/pipeline/page.tsx's "New opportunity" button) and
 * editing an existing one's non-stage fields (triggered from the
 * opportunity detail page, alongside — not replacing —
 * features/pipeline/components/stage-selector.tsx, which keeps owning
 * stage/lost_reason changes so the backend's Activity/audit trail and the
 * "pick a reason before marking it lost" UX stay in exactly one place).
 *
 * Create mode requires a Contact (an Opportunity has no independent
 * existence in this domain — see app/models/opportunity.py) and an
 * `opportunity_type`, both immutable afterward (`OpportunityUpdate` has no
 * fields for either — "if the type is wrong, create a new Opportunity,"
 * per that schema's own docstring), so edit mode never shows either
 * picker. `stage` itself IS shown at creation (defaulted to
 * "qualification", the backend's own default) but not in edit mode, for
 * the same reason stage stays StageSelector's job.
 *
 * Stage options are always scoped to the selected/existing
 * `opportunity_type` via OPPORTUNITY_STAGES_BY_TYPE — the same
 * client-side convenience StageSelector already applies; the backend
 * re-validates regardless (OpportunityService._validate_stage).
 *
 * Buyer requirement options are scoped to the opportunity's own contact
 * (the backend 422s otherwise — OpportunityService._validate_references)
 * — fetched fresh whenever the relevant contact is known: on open in edit
 * mode (the contact is fixed), or whenever the contact picker's selection
 * changes in create mode.
 */
export function OpportunityForm({
  opportunity,
  defaultContactId,
  trigger,
  onSaved,
}: {
  opportunity?: Opportunity;
  /** Pre-selects (and locks, same as edit mode) the contact when creating from a context that already knows it — not used yet by any caller in this app, but keeps this form usable from a future contact-scoped entry point without another rewrite. */
  defaultContactId?: string;
  trigger: ReactElement;
  onSaved?: (opportunity: Opportunity) => void;
}) {
  const isEdit = Boolean(opportunity);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [buyerRequirements, setBuyerRequirements] = useState<BuyerRequirement[]>([]);

  const [contactId, setContactId] = useState(opportunity?.contact_id ?? defaultContactId ?? "");
  const [opportunityType, setOpportunityType] = useState<OpportunityType>(
    (opportunity?.opportunity_type as OpportunityType) ?? "buy"
  );
  const [stage, setStage] = useState<OpportunityStage>((opportunity?.stage as OpportunityStage) ?? "qualification");
  const [title, setTitle] = useState(opportunity?.title ?? "");
  const [description, setDescription] = useState(opportunity?.description ?? "");
  const [propertyId, setPropertyId] = useState(opportunity?.property_id ?? "");
  const [buyerRequirementId, setBuyerRequirementId] = useState(opportunity?.buyer_requirement_id ?? "");
  const [expectedValue, setExpectedValue] = useState(opportunity?.expected_value ?? "");
  const [currency, setCurrency] = useState(opportunity?.currency ?? "MXN");
  const [probability, setProbability] = useState(opportunity?.probability?.toString() ?? "");
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    opportunity?.expected_close_date ? toDatetimeLocalValue(opportunity.expected_close_date) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadOptions() {
      const [contactsRes, propertiesRes] = await Promise.all([getContacts(), getProperties()]);
      if (cancelled) return;
      if (contactsRes.ok) setContacts(contactsRes.data);
      if (propertiesRes.ok) setProperties(propertiesRes.data);
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Buyer requirement options are scoped to whichever contact is currently
  // relevant — re-fetched whenever it changes (create mode lets the user
  // change it; edit mode's contact is fixed, so this runs once on open).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadBuyerRequirements() {
      if (!contactId) {
        setBuyerRequirements([]);
        return;
      }
      const res = await getBuyerRequirementsForContact(contactId);
      if (!cancelled && res.ok) setBuyerRequirements(res.data);
    }

    loadBuyerRequirements();
    return () => {
      cancelled = true;
    };
  }, [open, contactId]);

  const availableStages = OPPORTUNITY_STAGES_BY_TYPE[opportunityType];

  function handleContactChange(value: string) {
    setContactId(value);
    setBuyerRequirementId(""); // the previous selection may not belong to the new contact
  }

  function handleTypeChange(value: OpportunityType) {
    setOpportunityType(value);
    const validStages = OPPORTUNITY_STAGES_BY_TYPE[value];
    if (!validStages.includes(stage)) setStage("qualification");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !title.trim() || (!isEdit && !contactId)) return;
    setIsSubmitting(true);
    setError(null);

    const input: OpportunityInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      property_id: propertyId || undefined,
      buyer_requirement_id: buyerRequirementId || undefined,
      currency: currency.trim() || undefined,
      expected_close_date: expectedCloseDate ? fromDatetimeLocalValue(expectedCloseDate) : undefined,
    };
    if (expectedValue) input.expected_value = Number(expectedValue);
    if (probability) input.probability = Number(probability);
    if (!isEdit) input.stage = stage;

    const response = isEdit
      ? await updateOpportunity(opportunity!.id, input)
      : await createOpportunity(contactId, opportunityType, input);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }

    setOpen(false);
    onSaved?.(response.data);

    if (!isEdit) {
      router.push(`/pipeline/${response.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit opportunity" : "New opportunity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          <FormError message={error} />

          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_id">
                  Contact <span className="text-destructive">*</span>
                </Label>
                <Select value={contactId || null} onValueChange={(value) => value && handleContactChange(value)}>
                  <SelectTrigger id="contact_id">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opportunity_type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select value={opportunityType} onValueChange={(value) => value && handleTypeChange(value as OpportunityType)}>
                  <SelectTrigger id="opportunity_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatOpportunityType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage">Stage</Label>
              <Select value={stage} onValueChange={(value) => value && setStage(value as OpportunityStage)}>
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatOpportunityStage(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Phase 7 bug fix — see features/appointments/components/appointment-form.tsx's identical comment for the full root cause (Base UI's <Select.Value> can't resolve a label from JSX <SelectItem> children without a declarative `items` prop; these two were silently rendering the raw id). */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_id">Property</Label>
              <Select value={propertyId || "none"} onValueChange={(value) => setPropertyId(value === "none" ? "" : (value ?? ""))}>
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
              <Label htmlFor="buyer_requirement_id">Buyer requirement</Label>
              <Select
                value={buyerRequirementId || "none"}
                onValueChange={(value) => setBuyerRequirementId(value === "none" ? "" : (value ?? ""))}
              >
                <SelectTrigger id="buyer_requirement_id" disabled={!contactId}>
                  <SelectValue>
                    {(() => {
                      const selected = buyerRequirements.find((r) => r.id === buyerRequirementId);
                      return selected ? `${formatPurpose(selected.purpose)} — ${selected.status}` : "None";
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {buyerRequirements.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {formatPurpose(r.purpose)} — {r.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expected_value">Expected value</Label>
              <Input
                id="expected_value"
                type="number"
                min={0}
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="probability">Probability %</Label>
              <Input
                id="probability"
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expected_close_date">Expected close date</Label>
            <Input
              id="expected_close_date"
              type="datetime-local"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
