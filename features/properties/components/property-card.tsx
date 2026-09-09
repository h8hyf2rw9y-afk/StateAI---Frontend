import Link from "next/link";
import { Bath, Bed, Building2, MapPin, Ruler } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PropertyStatusBadge } from "@/features/properties/components/property-status-badge";
import {
  formatArea,
  formatPropertyLocation,
  formatPropertyPrice,
  formatPropertyType,
  type Property,
} from "@/features/properties/types";
import { formatTimestamp } from "@/lib/format";

/** Real backend property fields only — no images (the backend has none), no assigned agent (Property has no such field). See features/properties/types.ts for the full field inventory. */
export function PropertyCard({ property }: { property: Property }) {
  const area = formatArea(property.construction_m2) ?? formatArea(property.land_m2);

  return (
    <Link href={`/properties/${property.id}`} className="block">
      <Card size="sm" className="gap-0 py-0 transition-colors hover:bg-muted/40">
        <div className="flex h-36 items-center justify-center bg-muted text-muted-foreground">
          <Building2 className="size-8" aria-hidden="true" />
        </div>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium leading-snug">{property.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {formatPropertyLocation(property)}
              </p>
            </div>
            <PropertyStatusBadge status={property.status} className="shrink-0" />
          </div>

          <p className="text-lg font-semibold tracking-tight">
            {formatPropertyPrice(property.price, property.currency)}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formatPropertyType(property.property_type)}</span>
            {property.bedrooms !== null && property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="size-3.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== null && Number(property.bathrooms) > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="size-3.5" />
                {property.bathrooms}
              </span>
            )}
            {area && (
              <span className="flex items-center gap-1">
                <Ruler className="size-3.5" />
                {area}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between bg-transparent px-4 py-3">
          <span className="text-xs text-muted-foreground">Added {formatTimestamp(property.created_at)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
