"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationList, type NotificationListStatus } from "@/components/layout/notification-list";
import { getNotifications, markNotificationRead } from "@/lib/api/notifications";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Notification } from "@/features/notifications/types";

/**
 * The frontend consumer for the Notification model/service/routes that
 * already existed before Phase 5 but had never been surfaced anywhere in
 * this app (User Story L). Fetches on mount and again every time the
 * dropdown opens — this is a simple bell-and-list, not a live/websocket
 * feed; reopening it picks up whatever the automation detectors
 * (app/automation/detectors.py) have created since. Real org-scoped,
 * real user-scoped data only — GET /notifications already returns only the
 * signed-in user's own notifications (app/api/routes/notifications.py),
 * never another org member's, so there's nothing to further filter here.
 *
 * The actual content is features/layout/notification-list.tsx — see that
 * file's own docstring for why it's split out (this component's own
 * DropdownMenu wrapper is what makes it untestable directly in jsdom).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NotificationListStatus>("loading");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const response = await getNotifications({ limit: 20 });
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setNotifications(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function reload() {
      const response = await getNotifications({ limit: 20 });
      if (cancelled || !response.ok) return;
      setNotifications(response.data);
    }

    reload();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleMarkRead(notification: Notification) {
    if (notification.read_at) return;
    // Optimistic — a low-stakes, easily-reversible UI action (unlike every
    // real CRM write in this app, which always waits for the real response
    // before updating state).
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    await markNotificationRead(notification.id, true);
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}>
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/*
         * A plain <p>, not DropdownMenuLabel: that component is built on
         * base-ui's Menu.GroupLabel, which requires a Menu.Group ancestor
         * (throws "MenuGroupContext is missing" otherwise) — this list of
         * notifications isn't a semantic Menu.Group of related actions, so
         * this avoids a structural mismatch rather than wrapping one just
         * to satisfy it.
         */}
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Notifications</p>
        <DropdownMenuSeparator />
        <NotificationList
          status={status}
          notifications={notifications}
          errorMessage={errorMessage}
          onMarkRead={handleMarkRead}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
