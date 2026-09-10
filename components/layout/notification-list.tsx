"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatNotificationType, getNotificationLink, type Notification } from "@/features/notifications/types";
import { getBuyerRequirement } from "@/lib/api/buyer-requirements";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NotificationListStatus = "loading" | "success" | "error";

/**
 * The actual notification content — split out of notification-bell.tsx
 * specifically so it's testable on its own: base-ui's Menu (DropdownMenu's
 * primitive, same family as Select) portal-renders its content and hangs
 * under fireEvent-driven interaction in jsdom, the exact issue already
 * documented for Select (tests/test-utils/select-stub.tsx) — this
 * component renders the same JSX without that portal/positioning
 * machinery, so tests can render and assert on it directly instead of
 * needing to actually open a real DropdownMenu.
 */
export function NotificationList({
  status,
  notifications,
  errorMessage,
  onMarkRead,
}: {
  status: NotificationListStatus;
  notifications: Notification[];
  errorMessage: string | null;
  onMarkRead: (notification: Notification) => void;
}) {
  const router = useRouter();

  async function goToBuyerRequirementsContact(notification: Notification) {
    onMarkRead(notification);
    if (!notification.related_entity_id) return;
    const response = await getBuyerRequirement(notification.related_entity_id);
    // A requirement that's since been deleted (Contact deletion cascades to
    // it) is a silent no-op here, never a broken navigation or a crash —
    // same "never a fabricated link to somewhere that doesn't exist" rule
    // getNotificationLink itself already follows.
    if (response.ok) router.push(`/leads/${response.data.contact_id}`);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="px-2 py-4 text-center text-sm text-destructive">
        {errorMessage}
      </p>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing needs your attention right now.</p>
    );
  }

  return (
    <>
      {notifications.map((notification) => {
        const href = getNotificationLink(notification);
        const isUnread = !notification.read_at;
        // Phase 8: a buyer_requirement notification has no direct page of
        // its own (see getNotificationLink's own comment) — this resolves
        // it to its owning Contact on click, the same lookup
        // app/(dashboard)/pipeline/[id]/page.tsx's own "Buyer requirement"
        // card already does (fetch the requirement, read its contact_id,
        // go to /leads/{contact_id}), instead of leaving it as dead,
        // unclickable text.
        const isBuyerRequirement =
          notification.related_entity_type === "buyer_requirement" && notification.related_entity_id != null;
        const content = (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Badge variant={isUnread ? "default" : "secondary"} className="text-[10px]">
                {formatNotificationType(notification.type)}
              </Badge>
              {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
            </div>
            <p className={cn("text-sm", isUnread ? "font-medium" : "text-muted-foreground")}>{notification.title}</p>
            <p className="text-xs text-muted-foreground">{notification.body}</p>
            <p className="text-[11px] text-muted-foreground">{formatTimestamp(notification.created_at)}</p>
          </div>
        );

        if (href) {
          return (
            <DropdownMenuItem
              key={notification.id}
              className="flex-col items-start gap-0 whitespace-normal"
              onClick={() => onMarkRead(notification)}
              render={<Link href={href} />}
            >
              {content}
            </DropdownMenuItem>
          );
        }

        if (isBuyerRequirement) {
          return (
            <DropdownMenuItem
              key={notification.id}
              className="flex-col items-start gap-0 whitespace-normal"
              onClick={() => goToBuyerRequirementsContact(notification)}
            >
              {content}
            </DropdownMenuItem>
          );
        }

        return (
          <DropdownMenuItem
            key={notification.id}
            className="flex-col items-start gap-0 whitespace-normal"
            onClick={() => onMarkRead(notification)}
          >
            {content}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
