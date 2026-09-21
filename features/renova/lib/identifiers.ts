/** Typed NSS / número de crédito may be grouped with spaces or hyphens for readability; the server stores bare digits. */
export function normalizeIdentifier(value: string): string {
  return value.replace(/[\s-]/g, "");
}
