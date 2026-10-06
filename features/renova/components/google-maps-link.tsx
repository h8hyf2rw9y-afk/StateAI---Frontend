"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MapPin } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { googleMapsUrl, type RenovaAddressParts } from "@/features/renova/lib/maps";
import { cn } from "@/lib/utils";

/**
 * "Ver en Google Maps" (new tab) plus "Copiar enlace" for sending it by
 * WhatsApp. While the address is still incomplete it shows what's missing
 * instead, or nothing when `hideWhenIncomplete` (read-only views).
 */
export function GoogleMapsLink({
  address,
  hideWhenIncomplete = false,
  className,
}: {
  address: RenovaAddressParts;
  hideWhenIncomplete?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = googleMapsUrl(address);

  if (!url) {
    if (hideWhenIncomplete) return null;
    return (
      <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <MapPin className="size-3.5" aria-hidden="true" />
        Escribe calle y número, y la colonia, municipio o código postal para ver la ubicación en Google Maps.
      </p>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be denied (permissions, non-HTTPS); the link itself still works.
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
        onClick={(event) => event.stopPropagation()}
      >
        <MapPin />
        Ver en Google Maps
        <ExternalLink className="opacity-60" />
      </a>
      <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label="Copiar enlace de Google Maps">
        {copied ? <Check /> : <Copy />}
        {copied ? "Copiado" : "Copiar enlace"}
      </Button>
    </div>
  );
}
