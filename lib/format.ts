/**
 * Shared formatting helpers. Kept as a flat module (not lib/utils/) because
 * lib/utils.ts is reserved for shadcn/ui's `cn` class-merge helper — every
 * generated component in components/ui/ imports "@/lib/utils" by
 * convention, so that path is left untouched.
 */

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * "Aug 21, 2026" from a full ISO *timestamp* (e.g. a backend `created_at`
 * like "2026-08-21T20:33:33.776723Z") — deliberately plain `new Date(iso)`,
 * unlike formatDate/parseLocalDate below. Those exist specifically to work
 * around bare "YYYY-MM-DD" strings being misread as UTC; a real timestamp
 * already carries an explicit offset, so parsing it directly is correct
 * and `parseLocalDate`'s `iso.split("-")` would actually break on it
 * (it assumes exactly three dash-separated numeric parts).
 */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** "10:30 AM" from a full ISO *timestamp* — same plain `new Date(iso)` reasoning as formatTimestamp above, just the time portion. Used by the real Appointments list (features/appointments/components/appointments-list.tsx) to show a `start_at` alongside its day-grouping heading. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Parses a bare "YYYY-MM-DD" string as a local calendar date. `new
 * Date(iso)` would parse it as UTC midnight instead, which silently shifts
 * the date by a day in any timezone behind UTC — exactly the mismatch that
 * made formatRelativeToToday's own test suite flaky.
 */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parseLocalDate(iso));
}

/** "2 days ago" / "in 3 days" style relative label for follow-ups and activity. */
export function formatRelativeToToday(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(iso);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
