import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatNotificationType, type Notification } from "@/features/notifications/types";

/**
 * Phase 8 — "STATE AI knows what deserves attention," surfaced on the one
 * page every session starts on. Deliberately NOT a second automation
 * engine or aggregation endpoint: this groups the org's own already-fetched
 * unread Notification rows (Phase 5's overdue-task/upcoming-appointment
 * detectors, Phase 6's contact/buyer-requirement/opportunity detectors,
 * Phase 7's completed-appointment follow-up) by `type` and counts them —
 * the exact same real, deterministic, backend-computed facts the bell
 * already shows, just summarized instead of listed one row at a time.
 *
 * Each group links to the real list page where that kind of item actually
 * lives (a plain, static, deterministic map — not a second copy of
 * getNotificationLink, which resolves one specific notification to one
 * specific record; this resolves a *type* to the general page for browsing
 * that kind of thing). A type with no obvious single destination page
 * (`follow_up_reminder`, `document_deadline`, `contract_deadline`,
 * `system` — none of which any real detector in this app produces today)
 * renders as plain text rather than a fabricated link.
 */
const PRIORITY_TYPE_LINKS: Record<string, string> = {
  task_due: "/tasks",
  appointment_upcoming: "/appointments",
  contact_missing_requirements: "/leads",
  buyer_requirement_incomplete: "/leads",
  buyer_requirement_ready: "/leads",
  opportunity_inactive: "/pipeline",
  followup_task_created: "/tasks",
};

export function TodaysPriorities({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => !n.read_at);

  if (unread.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Nothing needs your attention right now.
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const n of unread) counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
  // Most-common first — the count itself already prioritizes for the user.
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <ul className="flex flex-col gap-2">
      {rows.map(([type, count]) => {
        const href = PRIORITY_TYPE_LINKS[type];
        const label = (
          <>
            <span className="font-semibold tabular-nums">{count}</span> {formatNotificationType(type)}
          </>
        );
        return (
          <li key={type} className="text-sm">
            {href ? (
              <Link href={href} className="hover:underline">
                {label}
              </Link>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ul>
  );
}
