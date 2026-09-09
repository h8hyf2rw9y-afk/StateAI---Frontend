import type { ApiError } from "@/types/api";
import type {
  FollowUpAction,
  FollowUpChannel,
  LeadPriority,
  RecommendedNextAction,
  RecommendationPriority,
} from "@/features/ai/types";

/**
 * Maps a failed AI-agent request to copy that's safe and useful to show a
 * user — mirrors features/auth/lib.ts's getAuthErrorMessage in spirit: never
 * a raw backend/provider error, a stack trace, or any internal detail
 * (model name, provider, filesystem paths, credentials). The backend
 * (app/api/routes/ai.py) already reduces every failure to one of a handful
 * of generic HTTP statuses for exactly this reason — this function just
 * turns those into agent-appropriate sentences.
 */
export function getAiErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 401:
    case 403:
      return "Your session has expired. Please sign in again.";
    case 404:
      return "This lead couldn't be found.";
    case 503:
      return "AI is currently unavailable. Please make sure the local AI service is running and try again.";
    case 504:
      return "The AI took longer than expected to respond. Please try again.";
    case 502:
      return "The AI service returned an unexpected response. Please try again.";
    default:
      break;
  }

  if (error.code === "timeout") {
    return "The AI took longer than expected to respond. Please try again.";
  }

  if (error.status === undefined) {
    // apiRequest's own catch-all for network/DNS/connection failures.
    return "Couldn't reach the server. Check your connection and try again.";
  }

  return "Something went wrong while running the AI. Please try again.";
}

const PRIORITY_STYLES: Record<RecommendationPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

/** Shared by the dashboard's mock recommendation list and the real Lead Intelligence/Follow-up panels — same three-value priority scale throughout. */
export function getPriorityBadgeClassName(priority: LeadPriority | RecommendationPriority): string {
  return PRIORITY_STYLES[priority];
}

const NEXT_ACTION_LABELS: Record<RecommendedNextAction, string> = {
  call: "Call the client",
  whatsapp: "Message on WhatsApp",
  email: "Send an email",
  schedule_viewing: "Schedule a viewing",
  send_properties: "Send matching properties",
  follow_up: "Follow up",
  meeting: "Schedule a meeting",
  re_engage: "Re-engage the lead",
  no_action_needed: "No action needed right now",
};

export function getNextActionLabel(action: RecommendedNextAction): string {
  return NEXT_ACTION_LABELS[action];
}

const FOLLOW_UP_ACTION_LABELS: Record<FollowUpAction, string> = {
  follow_up: "Follow up",
  send_properties: "Send matching properties",
  confirm_viewing: "Confirm the viewing",
  check_in: "Check in",
  call_client: "Call the client",
  prepare_for_appointment: "Prepare for the appointment",
  no_action: "No action needed",
};

export function getFollowUpActionLabel(action: FollowUpAction): string {
  return FOLLOW_UP_ACTION_LABELS[action];
}

const CHANNEL_LABELS: Record<FollowUpChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  call: "Phone call",
  none: "No follow-up needed",
};

export function getChannelLabel(channel: FollowUpChannel): string {
  return CHANNEL_LABELS[channel];
}

/** "87%" from a 0.0-1.0 confidence value — display-only rounding, never a fabricated precision the model didn't actually provide. */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
