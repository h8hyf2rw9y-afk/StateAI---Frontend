"use client";

import { useState, type FormEvent, type ReactElement } from "react";
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
import { createBuyerRequirement, updateBuyerRequirement, addBuyerRequirementLocation } from "@/lib/api/buyer-requirements";
import { getApiErrorMessage } from "@/lib/api/errors";
import { PROPERTY_TYPES, formatPropertyType } from "@/features/properties/types";
import { PURPOSES, formatPurpose, type BuyerRequirement, type BuyerRequirementInput } from "@/features/buyer-requirements/types";

/**
 * One dialog, used for both creating a new search and editing an existing
 * one's criteria — following this task's explicit example field set
 * (operation/property type/budget/bedrooms/bathrooms/construction/notes),
 * not every field BuyerRequirementCreate/Update technically accepts
 * (timeline/financing_type/preapproval_status/motivation are real backend
 * fields but not part of the prioritized set this UI surfaces).
 *
 * Locations can only be *added* here (`POST .../locations`), never edited
 * or removed — no such endpoint exists backend-side — so the locations
 * field only appears when creating a new search; an existing requirement's
 * locations are shown read-only elsewhere (see buyer-requirement-card.tsx).
 * Features aren't editable here either: there's no `GET /features` catalog
 * endpoint to power a picker, so assigning one would mean guessing valid
 * keys — existing features are still displayed read-only on the card.
 */
export function BuyerRequirementForm({
  contactId,
  requirement,
  trigger,
  onSaved,
}: {
  contactId: string;
  requirement?: BuyerRequirement;
  trigger: ReactElement;
  onSaved: (requirement: BuyerRequirement) => void;
}) {
  const isEdit = Boolean(requirement);
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState(requirement?.purpose ?? "");
  const [propertyType, setPropertyType] = useState(requirement?.property_type ?? "");
  const [budgetMin, setBudgetMin] = useState(requirement?.budget_min ?? "");
  const [budgetMax, setBudgetMax] = useState(requirement?.budget_max ?? "");
  const [bedroomsMin, setBedroomsMin] = useState(requirement?.bedrooms_min?.toString() ?? "");
  const [bathroomsMin, setBathroomsMin] = useState(requirement?.bathrooms_min ?? "");
  const [constructionMin, setConstructionMin] = useState(requirement?.construction_m2_min ?? "");
  const [parkingMin, setParkingMin] = useState(requirement?.parking_spaces_min?.toString() ?? "");
  const [notes, setNotes] = useState(requirement?.notes ?? "");
  const [locationsText, setLocationsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const input: BuyerRequirementInput = {};
    if (purpose) input.purpose = purpose;
    if (propertyType) input.property_type = propertyType;
    if (budgetMin) input.budget_min = Number(budgetMin);
    if (budgetMax) input.budget_max = Number(budgetMax);
    if (bedroomsMin) input.bedrooms_min = Number(bedroomsMin);
    if (bathroomsMin) input.bathrooms_min = Number(bathroomsMin);
    if (constructionMin) input.construction_m2_min = Number(constructionMin);
    if (parkingMin) input.parking_spaces_min = Number(parkingMin);
    if (notes) input.notes = notes;

    const response = isEdit
      ? await updateBuyerRequirement(requirement!.id, input)
      : await createBuyerRequirement(contactId, input);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      setIsSubmitting(false);
      return;
    }

    let saved = response.data;

    if (!isEdit && locationsText.trim()) {
      const neighborhoods = locationsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = 0; i < neighborhoods.length; i++) {
        const locationResponse = await addBuyerRequirementLocation(saved.id, {
          neighborhood: neighborhoods[i],
          priority: i + 1,
        });
        if (locationResponse.ok) saved = locationResponse.data;
      }
    }

    setIsSubmitting(false);
    setOpen(false);
    onSaved(saved);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit search" : "New property search"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormError message={error} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purpose">Operation</Label>
              <Select value={purpose || null} onValueChange={(value) => setPurpose(value ?? "")}>
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatPurpose(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_type">Property type</Label>
              <Select value={propertyType || null} onValueChange={(value) => setPropertyType(value ?? "")}>
                <SelectTrigger id="property_type">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatPropertyType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget_min">Budget min</Label>
              <Input id="budget_min" type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget_max">Budget max</Label>
              <Input id="budget_max" type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bedrooms_min">Bedrooms</Label>
              <Input id="bedrooms_min" type="number" min={0} value={bedroomsMin} onChange={(e) => setBedroomsMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bathrooms_min">Bathrooms</Label>
              <Input
                id="bathrooms_min"
                type="number"
                min={0}
                step={0.5}
                value={bathroomsMin}
                onChange={(e) => setBathroomsMin(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parking_min">Parking</Label>
              <Input id="parking_min" type="number" min={0} value={parkingMin} onChange={(e) => setParkingMin(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="construction_min">Construction (m², minimum)</Label>
            <Input
              id="construction_min"
              type="number"
              min={0}
              value={constructionMin}
              onChange={(e) => setConstructionMin(e.target.value)}
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="locations">Locations</Label>
              <Input
                id="locations"
                placeholder="Valle Alto, Carretera Nacional"
                value={locationsText}
                onChange={(e) => setLocationsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple areas with commas.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
