import { apiRequest } from "./client";
import type { ApiResult } from "@/types/api";
import type { Notification } from "@/features/notifications/types";

/**
 * Typed surface for the backend's real Notifications API
 * (app/api/routes/notifications.py). No `createNotification` here on
 * purpose — the backend has no public POST route for this (see that
 * file's own comment: a notification is something this backend's own
 * automation decides to create, per Phase 5, never something an API
 * client fabricates for anyone, including themselves).
 */
export function getNotifications(params?: { unread?: boolean; limit?: number }): Promise<ApiResult<Notification[]>> {
  return apiRequest<Notification[]>("/api/v1/notifications", { params });
}

export function markNotificationRead(notificationId: string, read: boolean): Promise<ApiResult<Notification>> {
  return apiRequest<Notification>(`/api/v1/notifications/${notificationId}`, {
    method: "PATCH",
    body: { read },
  });
}
