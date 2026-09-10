import {
  BadgeCheck,
  Handshake,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatActivityType, type Activity } from "@/features/pipeline/types";
import { formatTimestamp } from "@/lib/format";

const TYPE_ICONS: Record<string, LucideIcon> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  property_viewing: Users,
  follow_up: Users,
  meeting: Users,
  note: StickyNote,
  offer: Handshake,
  negotiation: Handshake,
  stage_change: BadgeCheck,
};

/**
 * Real recent activity, org-wide (see lib/api/activities.ts's
 * getRecentActivities — GET /activities, added in the CRM Integration Gaps
 * task). Replaces the old mock version, which used its own fabricated
 * ActivityType vocabulary ("lead_created"/"status_changed"/"deal_won"/etc.,
 * none of which exist on the real backend) and a flat `actorName`/
 * `description` pair. The real Activity has `activity_type`/`notes`/
 * `occurred_at` and only a `contact_id` — `contactName` is resolved by the
 * parent Dashboard page from the real Contacts list, same join-by-id
 * convention every other real dashboard widget here uses.
 */
export function ActivityFeed({
  activity,
  contactNameById,
}: {
  activity: Activity[];
  contactNameById: Map<string, string>;
}) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No recent activity"
        description="Calls, notes, and stage changes across your contacts will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {activity.map((item) => {
        const Icon = TYPE_ICONS[item.activity_type] ?? StickyNote;
        const contactName = contactNameById.get(item.contact_id) ?? "A contact";
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{contactName}</span>{" "}
                <span className="text-muted-foreground">
                  — {formatActivityType(item.activity_type)}: {item.notes}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{formatTimestamp(item.occurred_at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
