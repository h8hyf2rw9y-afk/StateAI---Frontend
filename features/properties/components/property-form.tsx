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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { createProperty, updateProperty } from "@/lib/api/properties";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  PROPERTY_COLLABORATION_STATUSES,
  PROPERTY_OWNERSHIP_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  formatCollaborationStatus,
  formatPropertyOwnership,
  formatPropertyStatus,
  formatPropertyType,
  type Property,
  type PropertyInput,
} from "@/features/properties/types";

/**
 * One dialog, used for both creating a new listing (triggered from
 * app/(dashboard)/properties/page.tsx's "Add property" button) and editing
 * an existing one (triggered from the property detail page). Fields
 * mirror app/schemas/property.py's PropertyCreate/PropertyUpdate, minus
 * `latitude`/`longitude` — real fields, but not surfaced here since this
 * app has no map picker and typing raw coordinates isn't a prioritized
 * field (see features/properties/types.ts's PropertyInput doc comment).
 *
 * No feature picker: `GET /features` (the catalog) does exist backend-side
 * now, but assigning/removing property features here was judged out of
 * scope for this task's "smallest coherent scope" — a real, separate
 * enhancement, not folded into this form. Existing features are still
 * shown read-only on the property detail page.
 */
export function PropertyForm({
  property,
  trigger,
  onSaved,
}: {
  property?: Property;
  trigger: ReactElement;
  onSaved?: (property: Property) => void;
}) {
  const isEdit = Boolean(property);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(property?.title ?? "");
  const [propertyType, setPropertyType] = useState(property?.property_type ?? "house");
  const [status, setStatus] = useState(property?.status ?? "draft");
  const [price, setPrice] = useState(property?.price ?? "");
  const [currency, setCurrency] = useState(property?.currency ?? "MXN");
  const [addressLine, setAddressLine] = useState(property?.address_line ?? "");
  const [city, setCity] = useState(property?.city ?? "");
  const [state, setState] = useState(property?.state ?? "");
  const [neighborhood, setNeighborhood] = useState(property?.neighborhood ?? "");
  const [constructionM2, setConstructionM2] = useState(property?.construction_m2 ?? "");
  const [landM2, setLandM2] = useState(property?.land_m2 ?? "");
  const [bedrooms, setBedrooms] = useState(property?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(property?.bathrooms ?? "");
  const [parkingSpaces, setParkingSpaces] = useState(property?.parking_spaces?.toString() ?? "");
  const [description, setDescription] = useState(property?.description ?? "");
  const [ownershipType, setOwnershipType] = useState(property?.ownership_type ?? "own");
  const [externalSource, setExternalSource] = useState(property?.external_source ?? "");
  const [externalAdvisorName, setExternalAdvisorName] = useState(property?.external_advisor_name ?? "");
  const [externalAdvisorContact, setExternalAdvisorContact] = useState(property?.external_advisor_contact ?? "");
  const [collaborationStatus, setCollaborationStatus] = useState(property?.collaboration_status ?? "contacted");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExternal = ownershipType === "external";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !title.trim()) return;
    setIsSubmitting(true);
    setError(null);

    const input: PropertyInput = {
      title: title.trim(),
      property_type: propertyType,
      status,
      currency: currency.trim() || undefined,
      address_line: addressLine.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      description: description.trim() || undefined,
      ownership_type: ownershipType,
      // Omitted (not sent) when switching back to "own": PropertyService.update
      // already clears these server-side itself once it sees
      // ownership_type: "own" on an update (see its own comment — PATCH
      // otherwise skips fields the caller didn't explicitly send), so this
      // form doesn't need to send an explicit "clear" value for any of them.
      external_source: isExternal ? externalSource.trim() || undefined : undefined,
      external_advisor_name: isExternal ? externalAdvisorName.trim() || undefined : undefined,
      external_advisor_contact: isExternal ? externalAdvisorContact.trim() || undefined : undefined,
      collaboration_status: isExternal ? collaborationStatus : undefined,
    };
    if (price) input.price = Number(price);
    if (constructionM2) input.construction_m2 = Number(constructionM2);
    if (landM2) input.land_m2 = Number(landM2);
    if (bedrooms) input.bedrooms = Number(bedrooms);
    if (bathrooms) input.bathrooms = Number(bathrooms);
    if (parkingSpaces) input.parking_spaces = Number(parkingSpaces);

    const response = isEdit ? await updateProperty(property!.id, input) : await createProperty(input);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(getApiErrorMessage(response.error));
      return;
    }

    setOpen(false);
    onSaved?.(response.data);

    if (!isEdit) {
      router.push(`/properties/${response.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit property" : "Add property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          <FormError message={error} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="property_type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={propertyType} onValueChange={(value) => value && setPropertyType(value)}>
                <SelectTrigger id="property_type">
                  <SelectValue />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatPropertyStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address_line">Address</Label>
            <Input id="address_line" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="construction_m2">Construction (m²)</Label>
              <Input
                id="construction_m2"
                type="number"
                min={0}
                value={constructionM2}
                onChange={(e) => setConstructionM2(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="land_m2">Land (m²)</Label>
              <Input id="land_m2" type="number" min={0} value={landM2} onChange={(e) => setLandM2(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input id="bedrooms" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                step={0.5}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parking_spaces">Parking</Label>
              <Input
                id="parking_spaces"
                type="number"
                min={0}
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownership_type">Ownership</Label>
              <Select value={ownershipType} onValueChange={(value) => value && setOwnershipType(value)}>
                <SelectTrigger id="ownership_type">
                  <SelectValue>{formatPropertyOwnership(ownershipType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_OWNERSHIP_TYPES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {formatPropertyOwnership(o)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isExternal
                  ? "Found through another advisor or an external portal — not part of your own listings."
                  : "Part of your own inventory."}
              </p>
            </div>

            {isExternal && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="external_source">Source</Label>
                    <Input
                      id="external_source"
                      placeholder="e.g. Inmuebles24"
                      value={externalSource}
                      onChange={(e) => setExternalSource(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="collaboration_status">Collaboration status</Label>
                    <Select value={collaborationStatus} onValueChange={(value) => value && setCollaborationStatus(value)}>
                      <SelectTrigger id="collaboration_status">
                        <SelectValue>{formatCollaborationStatus(collaborationStatus)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_COLLABORATION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatCollaborationStatus(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="external_advisor_name">Advisor name</Label>
                    <Input
                      id="external_advisor_name"
                      value={externalAdvisorName}
                      onChange={(e) => setExternalAdvisorName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="external_advisor_contact">Advisor contact</Label>
                    <Input
                      id="external_advisor_contact"
                      value={externalAdvisorContact}
                      onChange={(e) => setExternalAdvisorContact(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
