export const APPOINTMENT_TYPES = [
  "viewing",
  "call",
  "meeting",
  "closing",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  viewing: "Property Viewing",
  call: "Call",
  meeting: "Meeting",
  closing: "Closing",
  other: "Other",
};

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO date, e.g. "2026-09-03"
  time: string; // "10:30"
  durationMinutes: number;
  leadId: string;
  leadName: string;
  propertyId: string | null;
  propertyName: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  agentId: string;
  agentName: string;
}
