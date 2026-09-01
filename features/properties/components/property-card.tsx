import { Bath, Bed, Building2, MapPin, Ruler } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PropertyStatusBadge } from "@/features/properties/components/property-status-badge";
import { PROPERTY_TYPE_LABELS, type Property } from "@/features/properties/types";
import { formatCurrency, getInitials } from "@/lib/format";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex h-36 items-center justify-center bg-muted text-muted-foreground">
        <Building2 className="size-8" aria-hidden="true" />
      </div>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium leading-snug">{property.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {property.address}, {property.city}
            </p>
          </div>
          <PropertyStatusBadge status={property.status} className="shrink-0" />
        </div>

        <p className="text-lg font-semibold tracking-tight">
          {formatCurrency(property.price, property.currency)}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{PROPERTY_TYPE_LABELS[property.type]}</span>
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed className="size-3.5" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="size-3.5" />
              {property.bathrooms}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Ruler className="size-3.5" />
            {property.areaSqm} m²
          </span>
        </div>
      </CardContent>
      <CardFooter className="justify-between bg-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">
              {getInitials(property.agentName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{property.agentName}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
