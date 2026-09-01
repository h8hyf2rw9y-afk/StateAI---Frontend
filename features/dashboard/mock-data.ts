import type { ActivityItem } from "./types";

/** Realistic placeholder data only — see features/properties/mock-data.ts. */
export const mockActivity: ActivityItem[] = [
  {
    id: "act_001",
    type: "status_changed",
    actorName: "Maria Chen",
    description: "moved Jordan Kim to Negotiation",
    timestamp: "2026-08-31T16:42:00",
  },
  {
    id: "act_002",
    type: "appointment_completed",
    actorName: "Priya Nair",
    description: "completed a meeting with Nadia Hussein",
    timestamp: "2026-08-29T13:45:00",
  },
  {
    id: "act_003",
    type: "deal_won",
    actorName: "Maria Chen",
    description: "closed the Historic Bungalow on Elm deal",
    timestamp: "2026-08-15T11:20:00",
  },
  {
    id: "act_004",
    type: "lead_created",
    actorName: "Daniel Osei",
    description: "added a new lead, Ethan Brooks",
    timestamp: "2026-08-29T09:05:00",
  },
  {
    id: "act_005",
    type: "note_added",
    actorName: "Daniel Osei",
    description: "added a note to Marcus Webb's profile",
    timestamp: "2026-08-28T15:10:00",
  },
];
