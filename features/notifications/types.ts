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
  // Phase 6 — event-driven recommendations (app/automation/detectors.py).
  contact_missing_requirements: "Missing buyer requirements",
  buyer_requirement_incomplete: "Buyer requirement incomplete",
  buyer_requirement_ready: "Ready for property matching",
  opportunity_inactive: "Opportunity inactive",
  // Phase 7 — the completed-appointment follow-up Task's companion
  // notification (related_entity_type "task", so getNotificationLink's
  // existing "task" case already links it to /tasks — no change needed
  // there).
  followup_task_created: "Follow-up task created",
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
    case "contact":
      return `/leads/${notification.related_entity_id}`;
    default:
      // "buyer_requirement" notifications point at a requirement, not a
      // contact — there's no per-requirement detail page in this app
      // (buyer requirements live inside their contact's own /leads/{id}
      // page), and this function is synchronous, so it can't itself fetch
      // the requirement to find its contact_id. Returning null here still
      // means "no plain href" — but as of Phase 8,
      // components/layout/notification-list.tsx specifically special-cases
      // related_entity_type === "buyer_requirement" to resolve it on click
      // (fetch the requirement, read its contact_id, navigate to
      // /leads/{contact_id} — the same lookup
      // app/(dashboard)/pipeline/[id]/page.tsx's own "Buyer requirement"
      // card already does), so it's no longer dead text in the one place
      // users actually see it. Any other unmapped related_entity_type still
      // gets the honest plain-text fallback here.
      return null;
  }
}
