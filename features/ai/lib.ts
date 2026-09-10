import type { ApiError } from "@/types/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  FollowUpAction,
  FollowUpChannel,
  LeadPriority,
  PipelineAction,
  RecommendedNextAction,
} from "@/features/ai/types";

/**
 * Maps a failed AI-agent request to copy that's safe and useful to show a
 * user — never a raw backend/provider error, a stack trace, or any
 * internal detail (model name, provider, filesystem paths, credentials).
 * The backend (app/api/routes/ai.py) already reduces every failure to one
 * of a handful of generic HTTP statuses for exactly this reason — this
 * function only needs to add AI-specific copy for the codes that mean
 * something different here (502/503/504, and a client-side timeout), and
 * delegates everything else (auth, not-found, network) to the shared
 * getApiErrorMessage, so a 401 reads the same whether it came from an AI
 * call or a plain CRM one.
 */
export function getAiErrorMessage(error: ApiError): string {
  if (error.status === 503) {
    return "AI is currently unavailable. Please make sure the local AI service is running and try again.";
  }
  if (error.status === 504 || error.code === "timeout") {
    return "The AI took longer than expected to respond. Please try again.";
  }
  if (error.status === 502) {
    return "The AI service returned an unexpected response. Please try again.";
  }
  if (error.status === 404) {
    return "This lead couldn't be found.";
  }
  return getApiErrorMessage(error);
}

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

/** Shared by all three real AI panels (Lead Intelligence, Follow-up, Pipeline) — same three-value priority scale throughout. */
export function getPriorityBadgeClassName(priority: LeadPriority): string {
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

const PIPELINE_ACTION_LABELS: Record<PipelineAction, string> = {
  call: "Call the client",
  whatsapp: "Message on WhatsApp",
  email: "Send an email",
  follow_up: "Follow up",
  send_properties: "Send matching properties",
  schedule_viewing: "Schedule a viewing",
  prepare_appointment: "Prepare for the appointment",
  review_offer: "Review the offer",
  negotiate: "Continue negotiating",
  collect_documents: "Collect documents",
  review_financing: "Review financing",
  coordinate_notary: "Coordinate with the notary",
  create_task: "Create a follow-up task",
  monitor: "Monitor — no action needed yet",
};

/** The Pipeline Agent's own next-action vocabulary — see PipelineAction's doc comment in features/ai/types.ts for why it's separate from RecommendedNextAction/FollowUpAction above. */
export function getPipelineActionLabel(action: PipelineAction): string {
  return PIPELINE_ACTION_LABELS[action] ?? action;
}

/** "87%" from a 0.0-1.0 confidence value — display-only rounding, never a fabricated precision the model didn't actually provide. */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
