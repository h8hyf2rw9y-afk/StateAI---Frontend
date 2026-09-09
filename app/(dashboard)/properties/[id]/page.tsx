"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bath, Bed, Building2, Car, Loader2, Pencil, Ruler } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { PropertyStatusBadge } from "@/features/properties/components/property-status-badge";
import { PropertyForm } from "@/features/properties/components/property-form";
import { getProperty } from "@/lib/api/properties";
import {
  formatArea,
  formatPropertyLocation,
  formatPropertyPrice,
  formatPropertyType,
  type Property,
} from "@/features/properties/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatTimestamp } from "@/lib/format";

type Status = "loading" | "success" | "error";

/**
 * The property detail page — real backend data, following the same
 * architecture as app/(dashboard)/leads/[id]/page.tsx: a Client Component
 * page (needs the browser's Supabase session for apiRequest's bearer
 * token), `use(params)` for the URL id, one fetch on mount, loading/error/
 * not-found states.
 *
 * No AI panels here — Lead Intelligence/Follow-up are contact-scoped
 * agents, not property-scoped; adding AI to this page is out of scope for
 * this task. Property<->Contact relationships (PropertyInterest, the
 * property's activity timeline) are real backend capabilities
 * (GET /properties/{id}/activities, etc.) but deliberately not fetched
 * here yet — this task's objective was making Properties itself real, not
 * expanding what the detail page shows beyond that.
 */
export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [property, setProperty] = useState<Property | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getProperty(id);
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setProperty(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Link
        href="/properties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to properties
      </Link>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading property…</p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border p-6">
          <FormError message={errorMessage} />
        </div>
      )}

      {status === "success" && property === null && (
        <EmptyState icon={Building2} title="Property not found" description="This listing may have been removed." />
      )}

      {status === "success" && property && (
        <>
          <PageHeader
            title={property.title}
            description={formatPropertyLocation(property)}
            actions={
              <div className="flex items-center gap-1.5">
                <PropertyStatusBadge status={property.status} />
                <PropertyForm
                  property={property}
                  onSaved={setProperty}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  }
                />
              </div>
            }
          />

          <div className="mb-6 flex h-56 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="size-12" aria-hidden="true" />
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <p className="text-2xl font-semibold tracking-tight">
              {formatPropertyPrice(property.price, property.currency)}
            </p>
            <Badge variant="outline">{formatPropertyType(property.property_type)}</Badge>
          </div>

          <div className="mb-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1.5">
                <Bed className="size-4" /> {property.bedrooms} bedrooms
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1.5">
                <Bath className="size-4" /> {property.bathrooms} bathrooms
              </span>
            )}
            {formatArea(property.construction_m2) && (
              <span className="flex items-center gap-1.5">
                <Ruler className="size-4" /> {formatArea(property.construction_m2)} construction
              </span>
            )}
            {formatArea(property.land_m2) && (
              <span className="flex items-center gap-1.5">
                <Ruler className="size-4" /> {formatArea(property.land_m2)} land
              </span>
            )}
            {property.parking_spaces !== null && (
              <span className="flex items-center gap-1.5">
                <Car className="size-4" /> {property.parking_spaces} parking
              </span>
            )}
          </div>

          {property.description && <p className="mb-6 max-w-2xl text-sm">{property.description}</p>}

          {property.features.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {property.features.map((feature) => (
                <Badge key={feature.feature_key} variant="secondary">
                  {feature.feature_key}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Added {formatTimestamp(property.created_at)}</p>
        </>
      )}
    </>
  );
}
