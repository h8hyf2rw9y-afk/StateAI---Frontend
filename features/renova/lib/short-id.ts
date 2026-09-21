/**
 * The short, human-friendly reference printed on the share card ("RN-9F3A2C").
 * Derived from the case id but deliberately NOT the UUID: the full identifier
 * never appears on anything that leaves the app.
 */
export function renovaShortId(caseId: string): string {
  const hex = caseId.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
  return `RN-${hex.padEnd(6, "0")}`;
}
