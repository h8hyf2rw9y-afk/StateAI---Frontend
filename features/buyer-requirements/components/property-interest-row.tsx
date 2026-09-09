"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProperty } from "@/lib/api/properties";
import { formatPropertyPrice, type Property } from "@/features/properties/types";
import { formatPropertyInterestStatus, type PropertyInterest } from "@/features/buyer-requirements/types";

/**
 * Case A — "interested in this specific property". PropertyInterestRead
 * only has `property_id` (a UUID), not the property's own fields, so this
 * fetches the one referenced property for display — a single, cheap
 * lookup per row rather than a bulk/batched endpoint that doesn't exist,
 * acceptable given a contact realistically has very few of these.
 */
export function PropertyInterestRow({ interest }: { interest: PropertyInterest }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProperty(interest.property_id).then((response) => {
      if (cancelled) return;
      if (response.ok) setProperty(response.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [interest.property_id]);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        {loading ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Loading property…
          </span>
        ) : property ? (
          <>
            <Link href={`/properties/${property.id}`} className="text-sm font-medium hover:underline">
              {property.title}
            </Link>
            <p className="text-xs text-muted-foreground">{formatPropertyPrice(property.price, property.currency)}</p>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Property no longer available</span>
        )}
        {interest.notes && <p className="mt-1 text-xs text-muted-foreground">{interest.notes}</p>}
      </div>
      <Badge variant="outline" className="shrink-0">
        {formatPropertyInterestStatus(interest.status)}
      </Badge>
    </div>
  );
}
