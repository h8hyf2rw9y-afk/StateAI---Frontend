export type ActivityType =
  | "lead_created"
  | "status_changed"
  | "appointment_completed"
  | "note_added"
  | "deal_won";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorName: string;
  description: string;
  timestamp: string; // ISO datetime
}

export type PriorityKind = "follow_up" | "appointment" | "recommendation";

/** A single entry in the dashboard's "Today's priorities" list — a unified view across leads, appointments, and AI recommendations. */
export interface PriorityItem {
  id: string;
  kind: PriorityKind;
  title: string;
  subtitle: string;
  href: string;
}
