/** The address parts a Renova case captures (form strings or saved values). */
export interface RenovaAddressParts {
  street_address?: string | null;
  neighborhood?: string | null;
  municipality?: string | null;
  postal_code?: string | null;
}

/**
 * Renova operates in the Monterrey metro area, and several of its municipios
 * share names with cities elsewhere (Juárez, El Carmen, García…). Naming the
 * state keeps Google on the right one — checked against the real active
 * leads: without it some only resolved to the city, never to the street.
 * There is no state field on a case; change this if Renova expands.
 */
export const RENOVA_DEFAULT_REGION = "Nuevo León";

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * "Calle 123, Colonia, Municipio, C.P. 64000, Nuevo León, México" — or null
 * while the address is too incomplete to locate: a street (with its number)
 * plus at least a colonia, municipio or código postal.
 */
export function renovaAddressQuery(parts: RenovaAddressParts): string | null {
  const street = clean(parts.street_address);
  const neighborhood = clean(parts.neighborhood);
  const municipality = clean(parts.municipality);
  const postalCode = clean(parts.postal_code);
  if (!street || !(neighborhood || municipality || postalCode)) return null;
  return [street, neighborhood, municipality, postalCode && `C.P. ${postalCode}`, RENOVA_DEFAULT_REGION, "México"]
    .filter(Boolean)
    .join(", ");
}

/**
 * A Google Maps search link for the case's address (Maps URLs API — no key,
 * no request from this app; Google only sees the address when someone opens
 * the link). On a phone it opens the Maps app directly.
 */
export function googleMapsUrl(parts: RenovaAddressParts): string | null {
  const query = renovaAddressQuery(parts);
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
