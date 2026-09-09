import type { ApiError } from "@/types/api";

/**
 * Generic, safe-to-show mapping for any backend call — never a raw
 * exception, stack trace, or credential (matches features/auth/lib.ts's
 * getAuthErrorMessage in spirit). Feature-specific callers with their own
 * special cases (e.g. features/ai/lib.ts's getAiErrorMessage, which knows
 * what a 503/504/502 specifically means for an AI agent call) should
 * handle those first and fall back to this for the universal ones: auth,
 * not-found, network, timeout, and an unexpected server error.
 */
export function getApiErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 401:
    case 403:
      return "Your session has expired. Please sign in again.";
    case 404:
      return "This couldn't be found.";
    default:
      break;
  }

  if (error.code === "timeout") {
    return "The request took longer than expected. Please try again.";
  }

  if (error.status === undefined) {
    // apiRequest's own catch-all for network/DNS/connection failures.
    return "Couldn't reach the server. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
