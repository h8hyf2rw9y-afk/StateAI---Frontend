// ---------------------------------------------------------------------------
// Real backend Notification — mirrors app/schemas/notification.py's
// NotificationRead field-for-field (see lib/api/notifications.ts). Phase 5:
// the Notification model/service/routes already existed and were fully
// real before this phase, but had exactly zero producers anywhere in the
// running app (confirmed by inspection — NotificationService.create had no
// caller outside tests) and zero frontend consumer. This is that consumer.
//
// `type` is a plain string, not a strict union — same soft-enum convention
// as every other real-backend field in this app (the backend's own
// NotificationRead doesn't re-validate it either), so an unmapped value
// still renders via formatNotificationType's fallback instead of crashing.
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string; // ISO timestamp
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  task_due: "Task overdue",
  appointment_upcoming: "Upcoming appointment",
  follow_up_reminder: "Follow-up reminder",
  document_deadline: "Document deadline",
  contract_deadline: "Contract deadline",
  system: "System",
};

export function formatNotificationType(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

/**
 * Where clicking a notification should send the agent — built from
 * `related_entity_type`/`related_entity_id`, the same freeform
 * (entity_type, entity_id) pointer convention AuditLog already uses.
 * Returns null (renders as plain, unclickable text) for a type this app
 * doesn't have a detail page for, or when either half is missing —
 * never a fabricated link to somewhere that doesn't exist.
 */
export function getNotificationLink(notification: Notification): string | null {
  if (!notification.related_entity_type || !notification.related_entity_id) return null;
  switch (notification.related_entity_type) {
    case "task":
      return "/tasks";
    case "appointment":
      return "/appointments";
    case "opportunity":
      return `/pipeline/${notification.related_entity_id}`;
    default:
      return null;
  }
}
